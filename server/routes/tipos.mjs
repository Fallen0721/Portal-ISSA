import { randomUUID } from "node:crypto";
import { Router } from "express";
import { getPool } from "../db.mjs";
import {
  asyncHandler,
  mapCatalogItem,
  normalizeText,
  requireRole,
  sendError,
  toDbDateTime,
} from "../helpers.mjs";

export const tiposRouter = Router();

tiposRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [rows] = await getPool().query(
      "SELECT * FROM catalogo_tipos ORDER BY nombre ASC",
    );
    res.json(rows.map(mapCatalogItem));
  }),
);

tiposRouter.post(
  "/",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (req, res) => {
    const nombre = normalizeText(req.body?.nombre);
    if (!nombre) return sendError(res, 400, "El nombre es obligatorio");

    const [dup] = await getPool().query(
      "SELECT id FROM catalogo_tipos WHERE LOWER(nombre) = LOWER(?) LIMIT 1",
      [nombre],
    );
    if (dup[0]) return sendError(res, 409, "Ya existe un tipo con ese nombre");

    const id = randomUUID();
    const ts = toDbDateTime(new Date());
    await getPool().query(
      "INSERT INTO catalogo_tipos (id, nombre, creado_en, actualizado_en) VALUES (?, ?, ?, ?)",
      [id, nombre, ts, ts],
    );

    const [rows] = await getPool().query(
      "SELECT * FROM catalogo_tipos WHERE id = ? LIMIT 1",
      [id],
    );
    res.status(201).json(mapCatalogItem(rows[0]));
  }),
);

tiposRouter.put(
  "/:id",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const nombre = normalizeText(req.body?.nombre);
    if (!nombre) return sendError(res, 400, "El nombre es obligatorio");

    const [dup] = await getPool().query(
      "SELECT id FROM catalogo_tipos WHERE LOWER(nombre) = LOWER(?) AND id != ? LIMIT 1",
      [nombre, id],
    );
    if (dup[0]) return sendError(res, 409, "Ya existe un tipo con ese nombre");

    const ts = toDbDateTime(new Date());
    const [result] = await getPool().query(
      "UPDATE catalogo_tipos SET nombre = ?, actualizado_en = ? WHERE id = ?",
      [nombre, ts, id],
    );
    if (result.affectedRows === 0) return sendError(res, 404, "Tipo no encontrado");

    const [rows] = await getPool().query(
      "SELECT * FROM catalogo_tipos WHERE id = ? LIMIT 1",
      [id],
    );
    res.json(mapCatalogItem(rows[0]));
  }),
);

tiposRouter.delete(
  "/:id",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [result] = await getPool().query(
      "DELETE FROM catalogo_tipos WHERE id = ?",
      [id],
    );
    if (result.affectedRows === 0) return sendError(res, 404, "Tipo no encontrado");
    res.json({ ok: true });
  }),
);
