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

const VALID_AREAS = ["comercial", "personas", "danos"];

statusesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const area = normalizeText(req.query.area);

    if (area) {
      const [rows] = await getPool().query(
        `
        SELECT *
        FROM estados_gestion
        WHERE area = ?
        ORDER BY etapa IS NULL, etapa ASC, nombre ASC
        `,
        [area],
      );
      return res.json(rows.map(mapStatusGestion));
    }

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
    const area = normalizeText(req.body?.area).toLowerCase() || "comercial";
    if (!VALID_AREAS.includes(area)) {
      return sendError(res, 400, "El área del status es inválida");
    }

    const tipo = normalizeText(req.body?.tipo).toLowerCase();
    if (area === "comercial" && !["prospecto", "venta"].includes(tipo)) {
      return sendError(res, 400, "El tipo de status es inválido");
    }

    const nombre = normalizeText(req.body?.nombre);
    if (!nombre) {
      return sendError(res, 400, "El nombre del status es obligatorio");
    }

    const etapa = normalizeText(req.body?.etapa) || null;
    const esCierre = req.body?.esCierre ? 1 : 0;
    const tipoEstado = area === "comercial" ? tipo : "gestion";

    const [duplicates] = await getPool().query(
      "SELECT id FROM estados_gestion WHERE area = ? AND LOWER(nombre) = LOWER(?) LIMIT 1",
      [area, nombre],
    );
    if (duplicates[0]) {
      return sendError(res, 409, "Ese nombre de status ya existe en esta área");
    }

    const id = randomUUID();
    const timestamp = toDbDateTime(new Date());

    await getPool().query(
      `
      INSERT INTO estados_gestion (
        id,
        tipo_estado,
        area,
        etapa,
        es_cierre,
        nombre,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [id, tipoEstado, area, etapa, esCierre, nombre, timestamp, timestamp],
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

    const [current] = await getPool().query(
      "SELECT * FROM estados_gestion WHERE id = ? LIMIT 1",
      [id],
    );
    if (!current[0]) {
      return sendError(res, 404, "Status no encontrado");
    }

    const area =
      normalizeText(req.body?.area).toLowerCase() || current[0].area || "comercial";
    if (!VALID_AREAS.includes(area)) {
      return sendError(res, 400, "El área del status es inválida");
    }

    const tipo = normalizeText(req.body?.tipo).toLowerCase();
    if (area === "comercial" && !["prospecto", "venta"].includes(tipo)) {
      return sendError(res, 400, "El tipo de status es inválido");
    }

    const nombre = normalizeText(req.body?.nombre);
    if (!nombre) {
      return sendError(res, 400, "El nombre del status es obligatorio");
    }

    const etapa = normalizeText(req.body?.etapa) || null;
    const esCierre = req.body?.esCierre ? 1 : 0;
    const tipoEstado = area === "comercial" ? tipo : "gestion";

    const [duplicates] = await getPool().query(
      "SELECT id FROM estados_gestion WHERE area = ? AND LOWER(nombre) = LOWER(?) AND id != ? LIMIT 1",
      [area, nombre, id],
    );
    if (duplicates[0]) {
      return sendError(res, 409, "Ese nombre de status ya existe en esta área");
    }

    const timestamp = toDbDateTime(new Date());

    await getPool().query(
      `
      UPDATE estados_gestion
      SET tipo_estado = ?, area = ?, etapa = ?, es_cierre = ?, nombre = ?, actualizado_en = ?
      WHERE id = ?
      `,
      [tipoEstado, area, etapa, esCierre, nombre, timestamp, id],
    );

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
