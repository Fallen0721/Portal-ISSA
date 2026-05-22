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

const VALID_AREAS = ["comercial", "vida", "salud", "daños"];

export const productosRouter = Router();

productosRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const area = req.query.area;
    if (area) {
      const [rows] = await getPool().query(
        "SELECT * FROM catalogo_productos WHERE area = ? ORDER BY nombre ASC",
        [area],
      );
      return res.json(rows.map(mapCatalogItem));
    }
    const [rows] = await getPool().query(
      "SELECT * FROM catalogo_productos ORDER BY nombre ASC",
    );
    res.json(rows.map(mapCatalogItem));
  }),
);

productosRouter.post(
  "/",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (req, res) => {
    const nombre = normalizeText(req.body?.nombre);
    if (!nombre) return sendError(res, 400, "El nombre es obligatorio");

    const area = normalizeText(req.body?.area) || "comercial";
    if (!VALID_AREAS.includes(area)) return sendError(res, 400, "Área no válida");

    const [dup] = await getPool().query(
      "SELECT id FROM catalogo_productos WHERE LOWER(nombre) = LOWER(?) LIMIT 1",
      [nombre],
    );
    if (dup[0]) return sendError(res, 409, "Ya existe un producto con ese nombre");

    const id = randomUUID();
    const ts = toDbDateTime(new Date());
    await getPool().query(
      "INSERT INTO catalogo_productos (id, nombre, area, creado_en, actualizado_en) VALUES (?, ?, ?, ?, ?)",
      [id, nombre, area, ts, ts],
    );

    const [rows] = await getPool().query(
      "SELECT * FROM catalogo_productos WHERE id = ? LIMIT 1",
      [id],
    );
    res.status(201).json(mapCatalogItem(rows[0]));
  }),
);

productosRouter.put(
  "/:id",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const nombre = normalizeText(req.body?.nombre);
    if (!nombre) return sendError(res, 400, "El nombre es obligatorio");

    const area = normalizeText(req.body?.area) || "comercial";
    if (!VALID_AREAS.includes(area)) return sendError(res, 400, "Área no válida");

    const [dup] = await getPool().query(
      "SELECT id FROM catalogo_productos WHERE LOWER(nombre) = LOWER(?) AND id != ? LIMIT 1",
      [nombre, id],
    );
    if (dup[0]) return sendError(res, 409, "Ya existe un producto con ese nombre");

    const ts = toDbDateTime(new Date());
    const [result] = await getPool().query(
      "UPDATE catalogo_productos SET nombre = ?, area = ?, actualizado_en = ? WHERE id = ?",
      [nombre, area, ts, id],
    );
    if (result.affectedRows === 0) return sendError(res, 404, "Producto no encontrado");

    const [rows] = await getPool().query(
      "SELECT * FROM catalogo_productos WHERE id = ? LIMIT 1",
      [id],
    );
    res.json(mapCatalogItem(rows[0]));
  }),
);

productosRouter.delete(
  "/:id",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [result] = await getPool().query(
      "DELETE FROM catalogo_productos WHERE id = ?",
      [id],
    );
    if (result.affectedRows === 0) return sendError(res, 404, "Producto no encontrado");
    res.json({ ok: true });
  }),
);
