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

export const canalesRouter = Router();

canalesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [rows] = await getPool().query(
      "SELECT * FROM catalogo_canales ORDER BY nombre ASC",
    );
    res.json(rows.map(mapCatalogItem));
  }),
);

canalesRouter.post(
  "/",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (req, res) => {
    const nombre = normalizeText(req.body?.nombre);
    if (!nombre) return sendError(res, 400, "El nombre es obligatorio");

    const [dup] = await getPool().query(
      "SELECT id FROM catalogo_canales WHERE LOWER(nombre) = LOWER(?) LIMIT 1",
      [nombre],
    );
    if (dup[0]) return sendError(res, 409, "Ya existe un canal con ese nombre");

    const id = randomUUID();
    const ts = toDbDateTime(new Date());
    await getPool().query(
      "INSERT INTO catalogo_canales (id, nombre, creado_en, actualizado_en) VALUES (?, ?, ?, ?)",
      [id, nombre, ts, ts],
    );

    const [rows] = await getPool().query(
      "SELECT * FROM catalogo_canales WHERE id = ? LIMIT 1",
      [id],
    );
    res.status(201).json(mapCatalogItem(rows[0]));
  }),
);

canalesRouter.put(
  "/:id",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const nombre = normalizeText(req.body?.nombre);
    if (!nombre) return sendError(res, 400, "El nombre es obligatorio");

    const [dup] = await getPool().query(
      "SELECT id FROM catalogo_canales WHERE LOWER(nombre) = LOWER(?) AND id != ? LIMIT 1",
      [nombre, id],
    );
    if (dup[0]) return sendError(res, 409, "Ya existe un canal con ese nombre");

    const ts = toDbDateTime(new Date());
    const [result] = await getPool().query(
      "UPDATE catalogo_canales SET nombre = ?, actualizado_en = ? WHERE id = ?",
      [nombre, ts, id],
    );
    if (result.affectedRows === 0) return sendError(res, 404, "Canal no encontrado");

    const [rows] = await getPool().query(
      "SELECT * FROM catalogo_canales WHERE id = ? LIMIT 1",
      [id],
    );
    res.json(mapCatalogItem(rows[0]));
  }),
);

canalesRouter.delete(
  "/:id",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [result] = await getPool().query(
      "DELETE FROM catalogo_canales WHERE id = ?",
      [id],
    );
    if (result.affectedRows === 0) return sendError(res, 404, "Canal no encontrado");
    res.json({ ok: true });
  }),
);
