import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getPool } from "../db.mjs";
import {
  asyncHandler,
  canManageRecord,
  canViewRecord,
  mapVentaSalud,
  normalizeText,
  sendError,
  toDbDateTime,
  toNullableDbDateTime,
} from "../helpers.mjs";

export const ventasSaludRouter = Router();

const ALLOWED_ROLES = ["admin", "personas", "gerente_comercial"];

ventasSaludRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!ALLOWED_ROLES.includes(req.user.role)) {
      return sendError(res, 403, "No autorizado");
    }

    const [rows] = await getPool().query(
      "SELECT * FROM ventas_salud ORDER BY fecha_ingreso DESC",
    );

    const registros = rows
      .map(mapVentaSalud)
      .filter((r) => canViewRecord(req.user, r.ownerUserId));

    res.json(registros);
  }),
);

ventasSaludRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!ALLOWED_ROLES.includes(req.user.role)) {
      return sendError(res, 403, "No autorizado");
    }

    const [rows] = await getPool().query(
      "SELECT * FROM ventas_salud WHERE id = ? LIMIT 1",
      [req.params.id],
    );
    const row = rows[0];
    if (!row) return res.status(404).json(null);

    const registro = mapVentaSalud(row);
    if (!canViewRecord(req.user, registro.ownerUserId)) {
      return sendError(res, 403, "No autorizado");
    }

    res.json(registro);
  }),
);

ventasSaludRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!ALLOWED_ROLES.includes(req.user.role)) {
      return sendError(res, 403, "No autorizado");
    }

    const ownerUserId =
      req.user.role === "admin"
        ? req.body?.ownerUserId ?? req.user.id
        : req.user.id;

    const id = randomUUID();
    const timestamp = toDbDateTime(new Date());

    await getPool().query(
      `INSERT INTO ventas_salud (
        id, numero_poliza, fecha_ingreso, fecha_vigencia,
        asegurado, tipo, producto, ramo, compania, estado,
        moneda, suma_asegurada, prima_planeada, prima_basica,
        agente, alianza, oficial_negocios, canal, observaciones,
        creado_por_nombre, usuario_propietario_id, creado_en, actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        normalizeText(req.body?.no) || null,
        toDbDateTime(req.body?.fechaIngreso),
        toNullableDbDateTime(req.body?.fechaVigencia),
        normalizeText(req.body?.asegurado),
        normalizeText(req.body?.tipo),
        normalizeText(req.body?.producto),
        normalizeText(req.body?.ramo) || null,
        normalizeText(req.body?.compania),
        normalizeText(req.body?.status),
        normalizeText(req.body?.moneda),
        Number(req.body?.sumaAsegurada ?? 0),
        Number(req.body?.primaPlaneada ?? 0),
        req.body?.primaBasica != null ? Number(req.body.primaBasica) : null,
        normalizeText(req.body?.agente) || null,
        normalizeText(req.body?.alianza) || null,
        normalizeText(req.body?.oficialNegocios) || null,
        normalizeText(req.body?.canal),
        normalizeText(req.body?.observaciones) || null,
        req.user.name,
        ownerUserId,
        timestamp,
        timestamp,
      ],
    );

    const [rows] = await getPool().query(
      "SELECT * FROM ventas_salud WHERE id = ? LIMIT 1",
      [id],
    );
    res.status(201).json(mapVentaSalud(rows[0]));
  }),
);

ventasSaludRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!ALLOWED_ROLES.includes(req.user.role)) {
      return sendError(res, 403, "No autorizado");
    }

    const [rows] = await getPool().query(
      "SELECT * FROM ventas_salud WHERE id = ? LIMIT 1",
      [req.params.id],
    );
    if (!rows[0]) return sendError(res, 404, "Registro no encontrado");

    const current = mapVentaSalud(rows[0]);
    if (!canManageRecord(req.user, current.ownerUserId)) {
      return sendError(res, 403, "No autorizado");
    }

    const nextOwnerId =
      req.user.role === "admin"
        ? req.body?.ownerUserId ?? current.ownerUserId
        : current.ownerUserId;

    await getPool().query(
      `UPDATE ventas_salud SET
        numero_poliza = ?,
        fecha_ingreso = ?,
        fecha_vigencia = ?,
        asegurado = ?,
        tipo = ?,
        producto = ?,
        ramo = ?,
        compania = ?,
        estado = ?,
        moneda = ?,
        suma_asegurada = ?,
        prima_planeada = ?,
        prima_basica = ?,
        agente = ?,
        alianza = ?,
        oficial_negocios = ?,
        canal = ?,
        observaciones = ?,
        usuario_propietario_id = ?,
        actualizado_en = ?
      WHERE id = ?`,
      [
        normalizeText(req.body?.no !== undefined ? req.body.no : current.no) || null,
        toDbDateTime(req.body?.fechaIngreso ?? current.fechaIngreso),
        toNullableDbDateTime(req.body?.fechaVigencia !== undefined ? req.body.fechaVigencia : current.fechaVigencia),
        normalizeText(req.body?.asegurado ?? current.asegurado),
        normalizeText(req.body?.tipo ?? current.tipo),
        normalizeText(req.body?.producto ?? current.producto),
        normalizeText(req.body?.ramo !== undefined ? req.body.ramo : (current.ramo ?? "")) || null,
        normalizeText(req.body?.compania ?? current.compania),
        normalizeText(req.body?.status ?? current.status),
        normalizeText(req.body?.moneda ?? current.moneda),
        Number(req.body?.sumaAsegurada ?? current.sumaAsegurada),
        Number(req.body?.primaPlaneada ?? current.primaPlaneada),
        req.body?.primaBasica !== undefined
          ? (req.body.primaBasica != null ? Number(req.body.primaBasica) : null)
          : current.primaBasica,
        req.body?.agente !== undefined
          ? normalizeText(req.body.agente) || null
          : (current.agente ?? null),
        req.body?.alianza !== undefined
          ? normalizeText(req.body.alianza) || null
          : (current.alianza ?? null),
        normalizeText(req.body?.oficialNegocios !== undefined ? req.body.oficialNegocios : (current.oficialNegocios ?? "")) || null,
        normalizeText(req.body?.canal ?? current.canal),
        req.body?.observaciones !== undefined
          ? normalizeText(req.body.observaciones) || null
          : (current.observaciones ?? null),
        nextOwnerId,
        toDbDateTime(new Date()),
        req.params.id,
      ],
    );

    const [updatedRows] = await getPool().query(
      "SELECT * FROM ventas_salud WHERE id = ? LIMIT 1",
      [req.params.id],
    );
    res.json(mapVentaSalud(updatedRows[0]));
  }),
);

ventasSaludRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (!ALLOWED_ROLES.includes(req.user.role)) {
      return sendError(res, 403, "No autorizado");
    }

    const [rows] = await getPool().query(
      "SELECT * FROM ventas_salud WHERE id = ? LIMIT 1",
      [req.params.id],
    );
    if (!rows[0]) return res.json({ ok: true });

    const registro = mapVentaSalud(rows[0]);
    if (!canManageRecord(req.user, registro.ownerUserId)) {
      return sendError(res, 403, "No autorizado");
    }

    await getPool().query("DELETE FROM ventas_salud WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  }),
);
