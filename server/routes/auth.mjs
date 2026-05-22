import { Router } from "express";
import { config } from "../config.mjs";
import { getPool } from "../db.mjs";
import {
  asyncHandler,
  clearSessionCookie,
  createSession,
  getCurrentUserFromRequest,
  hashPassword,
  mapUser,
  normalizeText,
  normalizeUsername,
  requireAuth,
  sendError,
  setSessionCookie,
} from "../helpers.mjs";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const username = normalizeUsername(req.body?.username);
    const password = normalizeText(req.body?.password);

    if (!username || !password) {
      return sendError(res, 400, "Usuario y contraseña son obligatorios");
    }

    const [rows] = await getPool().query(
      "SELECT * FROM usuarios WHERE LOWER(nombre_usuario) = LOWER(?) LIMIT 1",
      [username],
    );

    const userRow = rows[0];
    if (!userRow || !userRow.activo) {
      return sendError(res, 401, "Credenciales inválidas");
    }

    if (hashPassword(password) !== userRow.hash_contrasena) {
      return sendError(res, 401, "Credenciales inválidas");
    }

    const { sessionId, expiraEn } = await createSession(userRow.id);
    setSessionCookie(res, sessionId, expiraEn);
    res.json({ user: mapUser(userRow) });
  }),
);

authRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      clearSessionCookie(res);
      return res.json({ user: null });
    }

    res.json({ user });
  }),
);

authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessionId = req.cookies?.[config.sessionCookieName];
    if (sessionId) {
      await getPool().query("DELETE FROM sesiones WHERE id = ?", [sessionId]);
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  }),
);
