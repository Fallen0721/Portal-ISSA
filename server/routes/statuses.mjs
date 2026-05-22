import { randomUUID } from "node:crypto";
import { Router } from "express";
import { getPool } from "../db.mjs";
import {
  asyncHandler,
  mapStatusGestion,
  normalizeText,
  requireRole,
  sendError,
  toDbDateTime,
} from "../helpers.mjs";

export const statusesRouter = Router();

statusesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [rows] = await getPool().query(
      `
      SELECT *
      FROM estados_gestion
      ORDER BY
        CASE tipo_estado
          WHEN 'prospecto' THEN 1
          WHEN 'venta' THEN 2
          ELSE 3
        END,
        nombre ASC
      `,
    );

    res.json(rows.map(mapStatusGestion));
  }),
);

statusesRouter.post(
  "/",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (req, res) => {
    const tipo = normalizeText(req.body?.tipo).toLowerCase();
    const nombre = normalizeText(req.body?.nombre);

    if (!["prospecto", "venta"].includes(tipo)) {
      return sendError(res, 400, "El tipo de status es inválido");
    }

    if (!nombre) {
      return sendError(res, 400, "El nombre del status es obligatorio");
    }

    const [duplicates] = await getPool().query(
      `
      SELECT id
      FROM estados_gestion
      WHERE LOWER(nombre) = LOWER(?)
      LIMIT 1
      `,
      [nombre],
    );

    if (duplicates[0]) {
      return sendError(res, 409, "Ese nombre de status ya existe");
    }

    const id = randomUUID();
    const timestamp = toDbDateTime(new Date());

    await getPool().query(
      `
      INSERT INTO estados_gestion (
        id,
        tipo_estado,
        nombre,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?)
      `,
      [id, tipo, nombre, timestamp, timestamp],
    );

    const [rows] = await getPool().query(
      "SELECT * FROM estados_gestion WHERE id = ? LIMIT 1",
      [id],
    );

    res.status(201).json(mapStatusGestion(rows[0]));
  }),
);

statusesRouter.put(
  "/:id",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tipo = normalizeText(req.body?.tipo).toLowerCase();
    const nombre = normalizeText(req.body?.nombre);

    if (!["prospecto", "venta"].includes(tipo)) {
      return sendError(res, 400, "El tipo de status es inválido");
    }

    if (!nombre) {
      return sendError(res, 400, "El nombre del status es obligatorio");
    }

    const [duplicates] = await getPool().query(
      `SELECT id FROM estados_gestion WHERE LOWER(nombre) = LOWER(?) AND id != ? LIMIT 1`,
      [nombre, id],
    );

    if (duplicates[0]) {
      return sendError(res, 409, "Ese nombre de status ya existe");
    }

    const timestamp = toDbDateTime(new Date());

    const [result] = await getPool().query(
      `UPDATE estados_gestion SET tipo_estado = ?, nombre = ?, actualizado_en = ? WHERE id = ?`,
      [tipo, nombre, timestamp, id],
    );

    if (result.affectedRows === 0) {
      return sendError(res, 404, "Status no encontrado");
    }

    const [rows] = await getPool().query(
      "SELECT * FROM estados_gestion WHERE id = ? LIMIT 1",
      [id],
    );

    res.json(mapStatusGestion(rows[0]));
  }),
);

statusesRouter.delete(
  "/:id",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [result] = await getPool().query(
      "DELETE FROM estados_gestion WHERE id = ?",
      [id],
    );

    if (result.affectedRows === 0) {
      return sendError(res, 404, "Status no encontrado");
    }

    res.json({ ok: true });
  }),
);
