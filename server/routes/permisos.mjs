import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getPool } from "../db.mjs";
import {
  asyncHandler,
  getActiveAdminIds,
  insertNotifications,
  mapPermiso,
  normalizeText,
  sendError,
  toDbDateTime,
  dateOnlyToDbDateTime,
} from "../helpers.mjs";

export const permisosRouter = Router();

permisosRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    let sql = "SELECT * FROM solicitudes_permiso";
    const params = [];
    const filters = [];

    if (req.user.role !== "admin") {
      filters.push("usuario_propietario_id = ?");
      params.push(req.user.id);
    }

    if (req.query.status) {
      filters.push("estado_solicitud = ?");
      params.push(req.query.status);
    }

    if (filters.length) {
      sql += ` WHERE ${filters.join(" AND ")}`;
    }

    sql += " ORDER BY creado_en DESC";

    const [rows] = await getPool().query(sql, params);
    res.json(rows.map(mapPermiso));
  }),
);

permisosRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const isAdmin = req.user.role === "admin";
    const id = randomUUID();
    const creadoEn = toDbDateTime(new Date());
    const status = isAdmin ? normalizeText(req.body?.status) : "SOLICITADO";
    const empleado = isAdmin ? normalizeText(req.body?.empleado) : req.user.name;
    const ownerUserId = req.body?.ownerUserId ?? req.user.id;

    await getPool().query(
      `
      INSERT INTO solicitudes_permiso (
        id,
        empleado,
        departamento,
        tipo_solicitud,
        fecha_inicio,
        fecha_fin,
        dias,
        motivo,
        estado_solicitud,
        observaciones,
        usuario_propietario_id,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        empleado,
        normalizeText(req.body?.departamento) || null,
        normalizeText(req.body?.tipo),
        dateOnlyToDbDateTime(req.body?.fechaInicio),
        dateOnlyToDbDateTime(req.body?.fechaFin),
        Number(req.body?.dias ?? 0),
        normalizeText(req.body?.motivo),
        status,
        normalizeText(req.body?.observaciones) || null,
        ownerUserId,
        creadoEn,
        creadoEn,
      ],
    );

    if (!isAdmin) {
      const adminIds = await getActiveAdminIds();
      await insertNotifications(adminIds, {
        type: "permiso_solicitado",
        title: "Nueva solicitud de permiso",
        message: `${empleado} - ${normalizeText(req.body?.tipo)} (${Number(req.body?.dias ?? 0)} días)`,
        linkTo: "/permisos",
      });
    }

    const [rows] = await getPool().query("SELECT * FROM solicitudes_permiso WHERE id = ? LIMIT 1", [id]);
    res.status(201).json(mapPermiso(rows[0]));
  }),
);

permisosRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const [rows] = await getPool().query(
      "SELECT * FROM solicitudes_permiso WHERE id = ? LIMIT 1",
      [req.params.id],
    );
    if (!rows[0]) {
      return sendError(res, 404, "Solicitud no encontrada");
    }

    const currentPermiso = mapPermiso(rows[0]);
    const isAdmin = req.user.role === "admin";

    if (!isAdmin) {
      if (currentPermiso.ownerUserId !== req.user.id) {
        return sendError(res, 403, "No autorizado");
      }
      if (currentPermiso.status !== "SOLICITADO") {
        return sendError(res, 400, "Solo puedes editar solicitudes en estado SOLICITADO");
      }
    }

    await getPool().query(
      `
      UPDATE solicitudes_permiso
      SET
        empleado = ?,
        departamento = ?,
        tipo_solicitud = ?,
        fecha_inicio = ?,
        fecha_fin = ?,
        dias = ?,
        motivo = ?,
        estado_solicitud = ?,
        observaciones = ?,
        actualizado_en = ?
      WHERE id = ?
      `,
      [
        isAdmin ? normalizeText(req.body?.empleado ?? currentPermiso.empleado) : currentPermiso.empleado,
        req.body?.departamento !== undefined
          ? normalizeText(req.body?.departamento) || null
          : currentPermiso.departamento ?? null,
        normalizeText(req.body?.tipo ?? currentPermiso.tipo),
        req.body?.fechaInicio
          ? dateOnlyToDbDateTime(req.body?.fechaInicio)
          : toDbDateTime(currentPermiso.fechaInicio),
        req.body?.fechaFin
          ? dateOnlyToDbDateTime(req.body?.fechaFin)
          : toDbDateTime(currentPermiso.fechaFin),
        Number(req.body?.dias ?? currentPermiso.dias),
        normalizeText(req.body?.motivo ?? currentPermiso.motivo),
        isAdmin ? normalizeText(req.body?.status ?? currentPermiso.status) : currentPermiso.status,
        req.body?.observaciones !== undefined
          ? normalizeText(req.body?.observaciones) || null
          : currentPermiso.observaciones ?? null,
        toDbDateTime(new Date()),
        req.params.id,
      ],
    );

    const [updatedRows] = await getPool().query(
      "SELECT * FROM solicitudes_permiso WHERE id = ? LIMIT 1",
      [req.params.id],
    );
    res.json(mapPermiso(updatedRows[0]));
  }),
);

permisosRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const [rows] = await getPool().query(
      "SELECT * FROM solicitudes_permiso WHERE id = ? LIMIT 1",
      [req.params.id],
    );
    if (!rows[0]) {
      return res.json({ ok: true });
    }

    const permiso = mapPermiso(rows[0]);
    if (req.user.role !== "admin") {
      if (permiso.ownerUserId !== req.user.id) {
        return sendError(res, 403, "No autorizado");
      }
      if (permiso.status !== "SOLICITADO") {
        return sendError(res, 400, "Solo puedes cancelar solicitudes en estado SOLICITADO");
      }
    }

    await getPool().query("DELETE FROM solicitudes_permiso WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  }),
);
