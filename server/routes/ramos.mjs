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

export const ramosRouter = Router();

ramosRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [rows] = await getPool().query(
      "SELECT * FROM catalogo_ramos ORDER BY nombre ASC",
    );
    res.json(rows.map(mapCatalogItem));
  }),
);

ramosRouter.post(
  "/",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (req, res) => {
    const nombre = normalizeText(req.body?.nombre);
    if (!nombre) return sendError(res, 400, "El nombre es obligatorio");

    const [dup] = await getPool().query(
      "SELECT id FROM catalogo_ramos WHERE LOWER(nombre) = LOWER(?) LIMIT 1",
      [nombre],
    );
    if (dup[0]) return sendError(res, 409, "Ya existe un ramo con ese nombre");

    const id = randomUUID();
    const ts = toDbDateTime(new Date());
    await getPool().query(
      "INSERT INTO catalogo_ramos (id, nombre, creado_en, actualizado_en) VALUES (?, ?, ?, ?)",
      [id, nombre, ts, ts],
    );

    const [rows] = await getPool().query(
      "SELECT * FROM catalogo_ramos WHERE id = ? LIMIT 1",
      [id],
    );
    res.status(201).json(mapCatalogItem(rows[0]));
  }),
);

ramosRouter.put(
  "/:id",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const nombre = normalizeText(req.body?.nombre);
    if (!nombre) return sendError(res, 400, "El nombre es obligatorio");

    const [dup] = await getPool().query(
      "SELECT id FROM catalogo_ramos WHERE LOWER(nombre) = LOWER(?) AND id != ? LIMIT 1",
      [nombre, id],
    );
    if (dup[0]) return sendError(res, 409, "Ya existe un ramo con ese nombre");

    const ts = toDbDateTime(new Date());
    const [result] = await getPool().query(
      "UPDATE catalogo_ramos SET nombre = ?, actualizado_en = ? WHERE id = ?",
      [nombre, ts, id],
    );
    if (result.affectedRows === 0) return sendError(res, 404, "Ramo no encontrado");

    const [rows] = await getPool().query(
      "SELECT * FROM catalogo_ramos WHERE id = ? LIMIT 1",
      [id],
    );
    res.json(mapCatalogItem(rows[0]));
  }),
);

ramosRouter.delete(
  "/:id",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [result] = await getPool().query(
      "DELETE FROM catalogo_ramos WHERE id = ?",
      [id],
    );
    if (result.affectedRows === 0) return sendError(res, 404, "Ramo no encontrado");
    res.json({ ok: true });
  }),
);
