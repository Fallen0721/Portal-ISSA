import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getPool } from "../db.mjs";
import { getPermissionMap } from "../permissions.mjs";
import {
  asyncHandler,
  canViewRecord,
  normalizeText,
  sendError,
  toDbDateTime,
  toNullableDbDateTime,
} from "../helpers.mjs";

export const bitacoraRouter = Router();

const mapEntrada = (row) => ({
  id: row.id,
  ventaId: row.venta_id,
  usuarioId: row.usuario_id ?? null,
  nombreUsuario: row.nombre_completo ?? null,
  tipo: row.tipo,
  contenido: row.contenido,
  datosExtra: row.datos_extra ?? null,
  fechaInicio: row.fecha_inicio ? new Date(row.fecha_inicio).toISOString() : null,
  fechaFinAprox: row.fecha_fin_aprox ? new Date(row.fecha_fin_aprox).toISOString() : null,
  finalizada: Boolean(row.finalizada),
  finalizadaEn: row.finalizada_en ? new Date(row.finalizada_en).toISOString() : null,
  creadoEn: new Date(row.creado_en).toISOString(),
});

const getVentaAndCheckAccess = async (req, res) => {
  const permissions = getPermissionMap(req.user.role);
  if (!permissions.ventas.view) {
    sendError(res, 403, "No autorizado");
    return null;
  }
  const [rows] = await getPool().query(
    "SELECT * FROM ventas WHERE id = ? LIMIT 1",
    [req.params.id],
  );
  if (!rows[0]) {
    sendError(res, 404, "Venta no encontrada");
    return null;
  }
  if (!canViewRecord(req.user, rows[0].usuario_propietario_id)) {
    sendError(res, 403, "No autorizado");
    return null;
  }
  return rows[0];
};

// GET /api/ventas/:id/bitacora
bitacoraRouter.get(
  "/:id/bitacora",
  asyncHandler(async (req, res) => {
    const venta = await getVentaAndCheckAccess(req, res);
    if (!venta) return;

    const [rows] = await getPool().query(
      `SELECT b.*, u.nombre_completo
       FROM bitacora_ventas b
       LEFT JOIN usuarios u ON b.usuario_id = u.id
       WHERE b.venta_id = ?
       ORDER BY b.creado_en DESC`,
      [req.params.id],
    );

    res.json(rows.map(mapEntrada));
  }),
);

// POST /api/ventas/:id/bitacora  (crear actividad)
bitacoraRouter.post(
  "/:id/bitacora",
  asyncHandler(async (req, res) => {
    const venta = await getVentaAndCheckAccess(req, res);
    if (!venta) return;

    const contenido = normalizeText(req.body?.contenido);
    if (!contenido) return sendError(res, 400, "Contenido requerido");
    if (!req.body?.fechaInicio) return sendError(res, 400, "Fecha de inicio requerida");
    if (!req.body?.fechaFinAprox) return sendError(res, 400, "Fecha de fin aproximada requerida");

    const fechaInicio = toDbDateTime(req.body.fechaInicio);
    const fechaFinAprox = toDbDateTime(req.body.fechaFinAprox);

    const entradaId = randomUUID();
    const ahora = toDbDateTime(new Date());

    await getPool().query(
      `INSERT INTO bitacora_ventas
         (id, venta_id, usuario_id, tipo, contenido, datos_extra, fecha_inicio, fecha_fin_aprox, finalizada, finalizada_en, creado_en)
       VALUES (?, ?, ?, 'actividad', ?, NULL, ?, ?, 0, NULL, ?)`,
      [entradaId, req.params.id, req.user.id, contenido, fechaInicio, fechaFinAprox, ahora],
    );

    const [newRows] = await getPool().query(
      `SELECT b.*, u.nombre_completo
       FROM bitacora_ventas b
       LEFT JOIN usuarios u ON b.usuario_id = u.id
       WHERE b.id = ? LIMIT 1`,
      [entradaId],
    );

    res.status(201).json(mapEntrada(newRows[0]));
  }),
);

// PUT /api/ventas/:id/bitacora/:entradaId/finalizar
bitacoraRouter.put(
  "/:id/bitacora/:entradaId/finalizar",
  asyncHandler(async (req, res) => {
    const venta = await getVentaAndCheckAccess(req, res);
    if (!venta) return;

    const ahora = toDbDateTime(new Date());
    const [result] = await getPool().query(
      `UPDATE bitacora_ventas
       SET finalizada = 1, finalizada_en = ?
       WHERE id = ? AND venta_id = ? AND tipo = 'actividad'`,
      [ahora, req.params.entradaId, req.params.id],
    );

    if (result.affectedRows === 0) {
      return sendError(res, 404, "Actividad no encontrada");
    }

    const [rows] = await getPool().query(
      `SELECT b.*, u.nombre_completo
       FROM bitacora_ventas b
       LEFT JOIN usuarios u ON b.usuario_id = u.id
       WHERE b.id = ? LIMIT 1`,
      [req.params.entradaId],
    );

    res.json(mapEntrada(rows[0]));
  }),
);
