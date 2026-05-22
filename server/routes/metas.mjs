import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getPool } from "../db.mjs";
import { asyncHandler, mapMeta, normalizeText, requireRole, sendError, toDbDateTime } from "../helpers.mjs";

export const metasRouter = Router();

metasRouter.get(
  "/",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (_req, res) => {
    const [rows] = await getPool().query(
      "SELECT * FROM metas_mensuales ORDER BY anio DESC, mes DESC",
    );
    res.json(rows.map(mapMeta));
  }),
);

metasRouter.get(
  "/vendedor/:vendedorId/mes-actual",
  asyncHandler(async (req, res) => {
    const now = new Date();
    const [rows] = await getPool().query(
      `
      SELECT *
      FROM metas_mensuales
      WHERE vendedor_id = ? AND mes = ? AND anio = ?
      ORDER BY creado_en DESC
      `,
      [req.params.vendedorId, now.getMonth() + 1, now.getFullYear()],
    );
    res.json(rows.map(mapMeta));
  }),
);

metasRouter.post(
  "/",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (req, res) => {
    const id = randomUUID();
    const timestamp = toDbDateTime(new Date());
    const manualPercentage =
      req.body?.manualPercentage === undefined ||
      req.body?.manualPercentage === null ||
      req.body?.manualPercentage === ""
        ? null
        : Number(req.body.manualPercentage);
    const manualValue =
      req.body?.manualValue === undefined ||
      req.body?.manualValue === null ||
      req.body?.manualValue === ""
        ? null
        : Number(req.body.manualValue);

    if (
      (manualPercentage !== null &&
        (!Number.isFinite(manualPercentage) || manualPercentage < 0)) ||
      (manualValue !== null && (!Number.isFinite(manualValue) || manualValue < 0))
    ) {
      return sendError(res, 400, "Porcentaje o valor manual inválido");
    }

    const [duplicates] = await getPool().query(
      `
      SELECT id
      FROM metas_mensuales
      WHERE vendedor_id = ? AND mes = ? AND anio = ? AND tipo_meta = ?
      LIMIT 1
      `,
      [
        req.body?.vendedorId,
        Number(req.body?.mes),
        Number(req.body?.año),
        normalizeText(req.body?.tipo),
      ],
    );

    if (duplicates[0]) {
      return sendError(res, 409, "Este tipo de meta ya está asignado");
    }

    await getPool().query(
      `
      INSERT INTO metas_mensuales (
        id,
        vendedor_id,
        mes,
        anio,
        tipo_meta,
        porcentaje_manual,
        valor_manual,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        req.body?.vendedorId,
        Number(req.body?.mes),
        Number(req.body?.año),
        normalizeText(req.body?.tipo),
        manualPercentage,
        manualValue,
        timestamp,
        timestamp,
      ],
    );

    const [rows] = await getPool().query("SELECT * FROM metas_mensuales WHERE id = ? LIMIT 1", [id]);
    res.status(201).json(mapMeta(rows[0]));
  }),
);

metasRouter.delete(
  "/:id",
  requireRole(["gerente_comercial"]),
  asyncHandler(async (req, res) => {
    await getPool().query("DELETE FROM metas_mensuales WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  }),
);
