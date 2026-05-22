import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getPool } from "../db.mjs";
import { getPermissionMap } from "../permissions.mjs";
import {
  asyncHandler,
  mapVehicleRate,
  mapVehicleQuoteHistory,
  normalizeText,
  parseJson,
  sendError,
  toDbDateTime,
} from "../helpers.mjs";

export const vehiculosRouter = Router();

const VALID_VEHICLE_COMPANIES = [
  "ficohsa",
  "davivienda",
  "mapfre",
  "crefisa",
  "continental",
];
const VALID_MODES = ["individual", "colectivo"];
const VALID_VEHICLE_TYPES = [
  "turismo",
  "camioneta",
  "pickup",
  "microbus",
  "panel",
  "camion",
  "cabezal",
  "motocicleta",
  "blindado",
  "transporte_publico",
  "camion_carga_pesada",
];
const VALID_ORIGINS = ["agencia", "importado"];

const normalizeNullableNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new Error("Valor numérico inválido");
  }
  return numericValue;
};

const validateVehicleRatePayload = (body) => {
  const companyId = normalizeText(body?.companyId).toLowerCase();
  const mode = normalizeText(body?.mode).toLowerCase();
  const vehicleType = normalizeText(body?.vehicleType).toLowerCase();
  const origin = normalizeText(body?.origin).toLowerCase() || null;
  const insuredValueMin = normalizeNullableNumber(body?.insuredValueMin);
  const insuredValueMax = normalizeNullableNumber(body?.insuredValueMax);
  const rate = Number(body?.rate);

  if (!VALID_VEHICLE_COMPANIES.includes(companyId)) {
    throw new Error("Compañía inválida");
  }
  if (!VALID_MODES.includes(mode)) {
    throw new Error("Modalidad inválida");
  }
  if (!VALID_VEHICLE_TYPES.includes(vehicleType)) {
    throw new Error("Tipo de vehículo inválido");
  }
  if (origin && !VALID_ORIGINS.includes(origin)) {
    throw new Error("Origen inválido");
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("La tasa debe ser mayor a cero");
  }
  if (
    insuredValueMin !== null &&
    insuredValueMax !== null &&
    insuredValueMin > insuredValueMax
  ) {
    throw new Error("El rango de suma asegurada es inválido");
  }

  return {
    companyId,
    mode,
    vehicleType,
    origin,
    insuredValueMin,
    insuredValueMax,
    rate,
  };
};

const validateVehicleHistoryPayload = (body) => {
  const mode = normalizeText(body?.mode).toLowerCase();
  const customerName = normalizeText(body?.customerName);
  const vehicles = Array.isArray(body?.vehicles) ? body.vehicles : [];
  const quotes = Array.isArray(body?.quotes) ? body.quotes : [];
  const totalInsuredValue = Number(body?.totalInsuredValue);

  if (!VALID_MODES.includes(mode)) {
    throw new Error("Modalidad inválida");
  }
  if (!customerName) {
    throw new Error("El nombre del asegurado es requerido");
  }
  if (vehicles.length === 0) {
    throw new Error("Debe incluir al menos un vehículo");
  }
  if (!Number.isFinite(totalInsuredValue) || totalInsuredValue < 0) {
    throw new Error("El valor asegurado total es inválido");
  }

  return {
    mode,
    customerName,
    vehicles,
    quotes,
    totalInsuredValue,
  };
};

vehiculosRouter.get(
  "/borrador",
  asyncHandler(async (req, res) => {
    const permissions = getPermissionMap(req.user.role);
    if (!permissions.cotizador_vehiculo.view) {
      return sendError(res, 403, "No autorizado");
    }

    const [rows] = await getPool().query(
      "SELECT * FROM borradores_cuadro_vehiculos WHERE usuario_propietario_id = ? LIMIT 1",
      [req.user.id],
    );

    if (!rows[0]) {
      return res.json(null);
    }

    res.json({
      mode: rows[0].modo,
      customerName: rows[0].nombre_cliente,
      vehicles: parseJson(rows[0].vehiculos_json, []),
    });
  }),
);

vehiculosRouter.get(
  "/tasas",
  asyncHandler(async (req, res) => {
    const permissions = getPermissionMap(req.user.role);
    if (!permissions.cotizador_vehiculo.view) {
      return sendError(res, 403, "No autorizado");
    }

    const [rows] = await getPool().query(
      `
      SELECT *
      FROM tasas_cotizador_vehiculos
      ORDER BY compania_id ASC, modalidad ASC, tipo_vehiculo ASC, origen ASC, suma_asegurada_min ASC
      `,
    );

    res.json(rows.map(mapVehicleRate));
  }),
);

vehiculosRouter.get(
  "/historial",
  asyncHandler(async (req, res) => {
    const permissions = getPermissionMap(req.user.role);
    if (!permissions.cotizador_vehiculo.view) {
      return sendError(res, 403, "No autorizado");
    }

    const [rows] = await getPool().query(
      `
      SELECT *
      FROM historial_cotizaciones_vehiculos
      ORDER BY creado_en DESC
      `,
    );

    res.json(rows.map(mapVehicleQuoteHistory));
  }),
);

vehiculosRouter.post(
  "/historial",
  asyncHandler(async (req, res) => {
    const permissions = getPermissionMap(req.user.role);
    if (!permissions.cotizador_vehiculo.create) {
      return sendError(res, 403, "No autorizado");
    }

    const payload = validateVehicleHistoryPayload(req.body);
    const id = randomUUID();
    const createdAt = toDbDateTime(new Date());

    await getPool().query(
      `
      INSERT INTO historial_cotizaciones_vehiculos (
        id,
        usuario_propietario_id,
        nombre_usuario_generador,
        correo_usuario_generador,
        nombre_asegurado,
        modalidad,
        vehiculos_json,
        cotizaciones_json,
        valor_asegurado_total,
        creado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        req.user.id,
        req.user.name,
        req.user.email,
        payload.customerName,
        payload.mode,
        JSON.stringify(payload.vehicles),
        JSON.stringify(payload.quotes),
        payload.totalInsuredValue,
        createdAt,
      ],
    );

    const [rows] = await getPool().query(
      "SELECT * FROM historial_cotizaciones_vehiculos WHERE id = ? LIMIT 1",
      [id],
    );
    res.status(201).json(mapVehicleQuoteHistory(rows[0]));
  }),
);

vehiculosRouter.post(
  "/tasas",
  asyncHandler(async (req, res) => {
    const permissions = getPermissionMap(req.user.role);
    if (!permissions.cotizador_vehiculo.create) {
      return sendError(res, 403, "No autorizado");
    }

    const payload = validateVehicleRatePayload(req.body);

    const [duplicates] = await getPool().query(
      `
      SELECT id
      FROM tasas_cotizador_vehiculos
      WHERE compania_id = ?
        AND modalidad = ?
        AND tipo_vehiculo = ?
        AND (
          (origen IS NULL AND ? IS NULL) OR
          origen = ?
        )
        AND (
          (suma_asegurada_min IS NULL AND ? IS NULL) OR
          suma_asegurada_min = ?
        )
        AND (
          (suma_asegurada_max IS NULL AND ? IS NULL) OR
          suma_asegurada_max = ?
        )
      LIMIT 1
      `,
      [
        payload.companyId,
        payload.mode,
        payload.vehicleType,
        payload.origin,
        payload.origin,
        payload.insuredValueMin,
        payload.insuredValueMin,
        payload.insuredValueMax,
        payload.insuredValueMax,
      ],
    );

    if (duplicates[0]) {
      return sendError(res, 409, "Ya existe una tasa con esa configuración");
    }

    const id = randomUUID();
    const timestamp = toDbDateTime(new Date());

    await getPool().query(
      `
      INSERT INTO tasas_cotizador_vehiculos (
        id,
        compania_id,
        modalidad,
        tipo_vehiculo,
        origen,
        suma_asegurada_min,
        suma_asegurada_max,
        tasa,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        payload.companyId,
        payload.mode,
        payload.vehicleType,
        payload.origin,
        payload.insuredValueMin,
        payload.insuredValueMax,
        payload.rate,
        timestamp,
        timestamp,
      ],
    );

    const [rows] = await getPool().query(
      "SELECT * FROM tasas_cotizador_vehiculos WHERE id = ? LIMIT 1",
      [id],
    );
    res.status(201).json(mapVehicleRate(rows[0]));
  }),
);

vehiculosRouter.put(
  "/tasas/:id",
  asyncHandler(async (req, res) => {
    const permissions = getPermissionMap(req.user.role);
    if (!permissions.cotizador_vehiculo.edit) {
      return sendError(res, 403, "No autorizado");
    }

    const [existingRows] = await getPool().query(
      "SELECT * FROM tasas_cotizador_vehiculos WHERE id = ? LIMIT 1",
      [req.params.id],
    );

    if (!existingRows[0]) {
      return sendError(res, 404, "Tasa no encontrada");
    }

    const payload = validateVehicleRatePayload(req.body);

    const [duplicates] = await getPool().query(
      `
      SELECT id
      FROM tasas_cotizador_vehiculos
      WHERE id <> ?
        AND compania_id = ?
        AND modalidad = ?
        AND tipo_vehiculo = ?
        AND (
          (origen IS NULL AND ? IS NULL) OR
          origen = ?
        )
        AND (
          (suma_asegurada_min IS NULL AND ? IS NULL) OR
          suma_asegurada_min = ?
        )
        AND (
          (suma_asegurada_max IS NULL AND ? IS NULL) OR
          suma_asegurada_max = ?
        )
      LIMIT 1
      `,
      [
        req.params.id,
        payload.companyId,
        payload.mode,
        payload.vehicleType,
        payload.origin,
        payload.origin,
        payload.insuredValueMin,
        payload.insuredValueMin,
        payload.insuredValueMax,
        payload.insuredValueMax,
      ],
    );

    if (duplicates[0]) {
      return sendError(res, 409, "Ya existe una tasa con esa configuración");
    }

    await getPool().query(
      `
      UPDATE tasas_cotizador_vehiculos
      SET
        compania_id = ?,
        modalidad = ?,
        tipo_vehiculo = ?,
        origen = ?,
        suma_asegurada_min = ?,
        suma_asegurada_max = ?,
        tasa = ?,
        actualizado_en = ?
      WHERE id = ?
      `,
      [
        payload.companyId,
        payload.mode,
        payload.vehicleType,
        payload.origin,
        payload.insuredValueMin,
        payload.insuredValueMax,
        payload.rate,
        toDbDateTime(new Date()),
        req.params.id,
      ],
    );

    const [rows] = await getPool().query(
      "SELECT * FROM tasas_cotizador_vehiculos WHERE id = ? LIMIT 1",
      [req.params.id],
    );
    res.json(mapVehicleRate(rows[0]));
  }),
);

vehiculosRouter.delete(
  "/tasas/:id",
  asyncHandler(async (req, res) => {
    const permissions = getPermissionMap(req.user.role);
    if (!permissions.cotizador_vehiculo.delete) {
      return sendError(res, 403, "No autorizado");
    }

    await getPool().query("DELETE FROM tasas_cotizador_vehiculos WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ ok: true });
  }),
);

vehiculosRouter.put(
  "/borrador",
  asyncHandler(async (req, res) => {
    const permissions = getPermissionMap(req.user.role);
    if (!permissions.cotizador_vehiculo.create) {
      return sendError(res, 403, "No autorizado");
    }

    const updatedAt = toDbDateTime(new Date());
    await getPool().query(
      `
      INSERT INTO borradores_cuadro_vehiculos (
        usuario_propietario_id,
        modo,
        nombre_cliente,
        vehiculos_json,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        modo = VALUES(modo),
        nombre_cliente = VALUES(nombre_cliente),
        vehiculos_json = VALUES(vehiculos_json),
        actualizado_en = VALUES(actualizado_en)
      `,
      [
        req.user.id,
        normalizeText(req.body?.mode) || "individual",
        normalizeText(req.body?.customerName),
        JSON.stringify(req.body?.vehicles ?? []),
        updatedAt,
      ],
    );

    res.json({
      mode: normalizeText(req.body?.mode) || "individual",
      customerName: normalizeText(req.body?.customerName),
      vehicles: req.body?.vehicles ?? [],
    });
  }),
);

vehiculosRouter.delete(
  "/borrador",
  asyncHandler(async (req, res) => {
    await getPool().query(
      "DELETE FROM borradores_cuadro_vehiculos WHERE usuario_propietario_id = ?",
      [req.user.id],
    );
    res.json({ ok: true });
  }),
);
