import { Router } from "express";
import { getPool } from "../db.mjs";
import { asyncHandler, mapNotification } from "../helpers.mjs";

export const notificacionesRouter = Router();

notificacionesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const [rows] = await getPool().query(
      `
      SELECT *
      FROM notificaciones
      WHERE usuario_id = ?
      ORDER BY creado_en DESC
      LIMIT 50
      `,
      [req.user.id],
    );

    res.json(rows.map(mapNotification));
  }),
);

notificacionesRouter.post(
  "/:id/leida",
  asyncHandler(async (req, res) => {
    await getPool().query(
      "UPDATE notificaciones SET leida = 1 WHERE id = ? AND usuario_id = ?",
      [req.params.id, req.user.id],
    );
    res.json({ ok: true });
  }),
);

notificacionesRouter.post(
  "/leidas",
  asyncHandler(async (req, res) => {
    await getPool().query(
      "UPDATE notificaciones SET leida = 1 WHERE usuario_id = ?",
      [req.user.id],
    );
    res.json({ ok: true });
  }),
);
