import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getPool } from "../db.mjs";
import { getPermissionMap } from "../permissions.mjs";
import {
  assertCompensationPlan,
  assertSource,
  asyncHandler,
  canManageRecord,
  canViewRecord,
  getActiveGerenteIds,
  insertNotifications,
  mapVenta,
  normalizeText,
  resolveOwnerFromVendorName,
  sanitizeCompensationFields,
  sendError,
  toDbDateTime,
  toNullableDbDateTime,
  upsertClienteDesdeCotizacion,
  mapCotizacion,
} from "../helpers.mjs";
import { pushToUser } from "./sse.mjs";

export const ventasRouter = Router();

ventasRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const permissions = getPermissionMap(req.user.role);
    if (!permissions.ventas.view) {
      return sendError(res, 403, "No autorizado");
    }

    const [rows] = await getPool().query(
      "SELECT * FROM ventas ORDER BY fecha_ingreso DESC",
    );

    const ventas = rows
      .map(mapVenta)
      .filter((venta) => canViewRecord(req.user, venta.ownerUserId));

    res.json(ventas);
  }),
);

ventasRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const [rows] = await getPool().query("SELECT * FROM ventas WHERE id = ? LIMIT 1", [req.params.id]);
    const row = rows[0];
    if (!row) {
      return res.status(404).json(null);
    }

    const venta = mapVenta(row);
    if (!canViewRecord(req.user, venta.ownerUserId)) {
      return sendError(res, 403, "No autorizado");
    }

    res.json(venta);
  }),
);

ventasRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const permissions = getPermissionMap(req.user.role);
    if (!permissions.ventas.create) {
      return sendError(res, 403, "No autorizado");
    }

    const source = req.body?.source;
    const compensation = sanitizeCompensationFields();
    assertSource(source);
    assertCompensationPlan(req.body?.compensationPlan ?? compensation.compensationPlan);

    const resolvedOwner =
      req.user.role === "admin"
        ? await resolveOwnerFromVendorName(req.body?.vendedor)
        : null;
    const ownerUserId =
      req.user.role === "admin"
        ? req.body?.ownerUserId ?? resolvedOwner?.id ?? req.user.id
        : req.user.id;
    const vendorName =
      req.user.role === "admin"
        ? normalizeText(resolvedOwner?.name ?? req.body?.vendedor) || req.user.name
        : req.user.name;
    const id = randomUUID();
    const timestamp = toDbDateTime(new Date());

    await getPool().query(
      `
      INSERT INTO ventas (
        id,
        numero_poliza,
        fecha_ingreso,
        fecha_vigencia,
        fecha_cierre,
        dias_proceso,
        asegurado,
        tipo_venta,
        producto,
        compania,
        estado_venta,
        moneda,
        suma_asegurada,
        prima_neta_anual,
        canal,
        alianza,
        vendedor_nombre,
        usuario_propietario_id,
        observaciones,
        fuente_registro,
        cotizacion_id,
        plan_compensacion,
        prima_basica_compensable,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`,
      [
        id,
        normalizeText(req.body?.no),
        toDbDateTime(req.body?.fechaIngreso),
        toNullableDbDateTime(req.body?.fechaVigencia),
        toNullableDbDateTime(req.body?.fechaCierre),
        Number(req.body?.diasProceso ?? 0),
        normalizeText(req.body?.asegurado),
        normalizeText(req.body?.tipo),
        normalizeText(req.body?.producto),
        normalizeText(req.body?.compania),
        normalizeText(req.body?.status),
        normalizeText(req.body?.moneda),
        Number(req.body?.sumaAsegurada ?? 0),
        Number(req.body?.primaNetaAnual ?? 0),
        normalizeText(req.body?.canal),
        normalizeText(req.body?.canal) === "Fusiona2" ? normalizeText(req.body?.alianza) || null : null,
        vendorName,
        ownerUserId,
        normalizeText(req.body?.observaciones) || null,
        source ?? null,
        req.body?.cotizacionId ?? null,
        compensation.compensationPlan,
        compensation.primaBasicaCompensable,
        timestamp,
        timestamp,
      ],
    );

    if (req.body?.cotizacionId) {
      const [quoteRows] = await getPool().query(
        "SELECT * FROM cotizaciones_viaje WHERE id = ? LIMIT 1",
        [req.body.cotizacionId],
      );
      if (quoteRows[0]) {
        await upsertClienteDesdeCotizacion(mapCotizacion(quoteRows[0]), { ventaId: id });
      }
    }

    await insertNotifications(
      [req.user.id],
      {
        type: "venta_nueva",
        title: "Nueva venta registrada",
        message: `${normalizeText(req.body?.asegurado)} - ${normalizeText(req.body?.producto)} (${normalizeText(req.body?.moneda)} ${Number(req.body?.primaNetaAnual ?? 0)})`,
        linkTo: "/ventas",
      },
    );

    const [rows] = await getPool().query("SELECT * FROM ventas WHERE id = ? LIMIT 1", [id]);
    res.status(201).json(mapVenta(rows[0]));
  }),
);

ventasRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const permissions = getPermissionMap(req.user.role);
    const [rows] = await getPool().query("SELECT * FROM ventas WHERE id = ? LIMIT 1", [req.params.id]);
    if (!rows[0]) {
      return sendError(res, 404, "Venta no encontrada");
    }

    const currentVenta = mapVenta(rows[0]);
    if (!permissions.ventas.edit || !canManageRecord(req.user, currentVenta.ownerUserId)) {
      return sendError(res, 403, "No autorizado");
    }

    const resolvedOwner =
      req.user.role === "admin"
        ? await resolveOwnerFromVendorName(req.body?.vendedor ?? currentVenta.vendedor)
        : null;
    const compensation = sanitizeCompensationFields();
    const nextOwnerId =
      req.user.role === "admin"
        ? req.body?.ownerUserId ?? resolvedOwner?.id ?? currentVenta.ownerUserId
        : currentVenta.ownerUserId;
    const vendorName =
      req.user.role === "admin"
        ? normalizeText(resolvedOwner?.name ?? req.body?.vendedor) || currentVenta.vendedor
        : currentVenta.vendedor;

    const nextCanal = normalizeText(req.body?.canal ?? currentVenta.canal);
    const nextAlianza = nextCanal === "Fusiona2"
      ? normalizeText(req.body?.alianza !== undefined ? req.body.alianza : (currentVenta.alianza ?? "")) || null
      : null;

    await getPool().query(
      `
      UPDATE ventas
      SET
        numero_poliza = ?,
        fecha_ingreso = ?,
        fecha_vigencia = ?,
        fecha_cierre = ?,
        dias_proceso = ?,
        asegurado = ?,
        tipo_venta = ?,
        producto = ?,
        compania = ?,
        estado_venta = ?,
        moneda = ?,
        suma_asegurada = ?,
        prima_neta_anual = ?,
        canal = ?,
        alianza = ?,
        vendedor_nombre = ?,
        usuario_propietario_id = ?,
        observaciones = ?,
        fuente_registro = ?,
        cotizacion_id = ?,
        plan_compensacion = ?,
        prima_basica_compensable = ?,
        actualizado_en = ?
      WHERE id = ?
      `,
      [
        normalizeText(req.body?.no ?? currentVenta.no),
        toDbDateTime(req.body?.fechaIngreso ?? currentVenta.fechaIngreso),
        toNullableDbDateTime(req.body?.fechaVigencia ?? currentVenta.fechaVigencia),
        toNullableDbDateTime(req.body?.fechaCierre !== undefined ? req.body.fechaCierre : currentVenta.fechaCierre),
        Number(req.body?.diasProceso ?? currentVenta.diasProceso),
        normalizeText(req.body?.asegurado ?? currentVenta.asegurado),
        normalizeText(req.body?.tipo ?? currentVenta.tipo),
        normalizeText(req.body?.producto ?? currentVenta.producto),
        normalizeText(req.body?.compania ?? currentVenta.compania),
        normalizeText(req.body?.status ?? currentVenta.status),
        normalizeText(req.body?.moneda ?? currentVenta.moneda),
        Number(req.body?.sumaAsegurada ?? currentVenta.sumaAsegurada),
        Number(req.body?.primaNetaAnual ?? currentVenta.primaNetaAnual),
        nextCanal,
        nextAlianza,
        vendorName,
        nextOwnerId,
        req.body?.observaciones !== undefined
          ? normalizeText(req.body?.observaciones) || null
          : currentVenta.observaciones ?? null,
        req.body?.source ?? currentVenta.source ?? null,
        req.body?.cotizacionId ?? currentVenta.cotizacionId ?? null,
        compensation.compensationPlan,
        compensation.primaBasicaCompensable,
        toDbDateTime(new Date()),
        req.params.id,
      ],
    );

    // Auto-log y notificaciones cuando cambia el estado de la venta
    const prevStatus = rows[0].estado_venta;
    const nextStatus = normalizeText(req.body?.status ?? prevStatus);
    if (prevStatus !== nextStatus) {
      const [estadoRows] = await getPool().query(
        "SELECT tipo_estado FROM estados_gestion WHERE nombre = ? LIMIT 1",
        [nextStatus],
      );
      const tipoEstado = estadoRows[0]?.tipo_estado ?? null;

      await getPool().query(
        `INSERT INTO bitacora_ventas (id, venta_id, usuario_id, tipo, contenido, datos_extra, creado_en)
         VALUES (UUID(), ?, ?, 'estado', ?, ?, NOW())`,
        [
          req.params.id,
          req.user.id,
          `Status cambiado: ${prevStatus} → ${nextStatus}`,
          JSON.stringify({ de: prevStatus, a: nextStatus, tipoEstado }),
        ],
      );

      // Notificar a gerentes comerciales (excluyendo al usuario que hace el cambio)
      const gerenteIds = (await getActiveGerenteIds()).filter(
        (id) => id !== req.user.id,
      );
      if (gerenteIds.length > 0) {
        const notifTitle = "Cambio de status";
        const notifMessage = `${currentVenta.asegurado} (${vendorName}) → ${nextStatus}`;
        const notifLink = `/ventas?sale=${req.params.id}`;
        const notifCreatedAt = new Date().toISOString();
        const timestamp = toDbDateTime(new Date());

        for (const gerenteId of gerenteIds) {
          const notifId = randomUUID();
          await getPool().query(
            `INSERT INTO notificaciones (id, usuario_id, tipo_notificacion, titulo, mensaje, ruta_destino, leida, creado_en)
             VALUES (?, ?, 'cambio_status', ?, ?, ?, 0, ?)`,
            [notifId, gerenteId, notifTitle, notifMessage, notifLink, timestamp],
          );
          pushToUser(gerenteId, {
            id: notifId,
            type: "cambio_status",
            title: notifTitle,
            message: notifMessage,
            createdAt: notifCreatedAt,
            read: false,
            linkTo: notifLink,
          });
        }
      }
    }

    const [updatedRows] = await getPool().query("SELECT * FROM ventas WHERE id = ? LIMIT 1", [req.params.id]);
    res.json(mapVenta(updatedRows[0]));
  }),
);

ventasRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const permissions = getPermissionMap(req.user.role);
    const [rows] = await getPool().query("SELECT * FROM ventas WHERE id = ? LIMIT 1", [req.params.id]);
    if (!rows[0]) {
      return res.json({ ok: true });
    }

    const venta = mapVenta(rows[0]);
    if (!permissions.ventas.delete || !canManageRecord(req.user, venta.ownerUserId)) {
      return sendError(res, 403, "No autorizado");
    }

    await getPool().query("DELETE FROM ventas WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  }),
);
