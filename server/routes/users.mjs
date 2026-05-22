import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getPool } from "../db.mjs";
import {
  assertRole,
  asyncHandler,
  booleanToTinyInt,
  buildUserSearchClause,
  generateUsernameFromName,
  getUserById,
  hashPassword,
  normalizeEmail,
  normalizeText,
  requireRole,
  sendError,
  toDbDateTime,
} from "../helpers.mjs";

export const usersRouter = Router();

usersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (!["admin", "gerente_comercial"].includes(req.user.role)) {
      return sendError(res, 403, "No autorizado");
    }

    const search = normalizeText(req.query.search);
    const { sql, params } = buildUserSearchClause(search);
    const [rows] = await getPool().query(
      `
      SELECT *
      FROM usuarios
      ${sql}
      ORDER BY nombre_completo ASC
      `,
      params,
    );

    res.json(rows.map((row) => ({
      id: row.id,
      username: row.nombre_usuario,
      name: row.nombre_completo,
      email: row.correo,
      role: row.rol,
      isActive: Boolean(row.activo),
      createdAt: new Date(row.creado_en).toISOString(),
      updatedAt: new Date(row.actualizado_en).toISOString(),
    })));
  }),
);

usersRouter.post(
  "/",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const name = normalizeText(req.body?.name);
    const username = generateUsernameFromName(name);
    const email = normalizeEmail(req.body?.email);
    const password = normalizeText(req.body?.password);
    const role = normalizeText(req.body?.role);
    const isActive = Boolean(req.body?.isActive);

    if (!username || !name || !email || !password || !role) {
      return sendError(res, 400, "Todos los campos requeridos deben completarse");
    }

    assertRole(role);

    const [duplicates] = await getPool().query(
      `
      SELECT id
      FROM usuarios
      WHERE LOWER(nombre_usuario) = LOWER(?) OR LOWER(correo) = LOWER(?)
      LIMIT 1
      `,
      [username, email],
    );

    if (duplicates[0]) {
      return sendError(res, 409, "Ya existe un usuario con ese username o correo");
    }

    const timestamp = toDbDateTime(new Date());
    const id = randomUUID();
    await getPool().query(
      `
      INSERT INTO usuarios (
        id,
        nombre_usuario,
        nombre_completo,
        correo,
        rol,
        hash_contrasena,
        activo,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [id, username, name, email, role, hashPassword(password), booleanToTinyInt(isActive), timestamp, timestamp],
    );

    const createdUser = await getUserById(id);
    res.status(201).json(createdUser);
  }),
);

usersRouter.put(
  "/:id",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      return sendError(res, 404, "Usuario no encontrado");
    }

    const name = normalizeText(req.body?.name);
    const username = generateUsernameFromName(name);
    const email = normalizeEmail(req.body?.email);
    const password = normalizeText(req.body?.password);
    const role = normalizeText(req.body?.role);
    const isActive = Boolean(req.body?.isActive);

    if (!username || !name || !email || !role) {
      return sendError(res, 400, "Todos los campos requeridos deben completarse");
    }

    assertRole(role);

    if (existingUser.id === req.user.id && (!isActive || role !== "admin")) {
      return sendError(
        res,
        400,
        "No puedes desactivar tu propio usuario admin ni cambiar tu rol actual",
      );
    }

    const [duplicates] = await getPool().query(
      `
      SELECT id
      FROM usuarios
      WHERE id <> ? AND (LOWER(nombre_usuario) = LOWER(?) OR LOWER(correo) = LOWER(?))
      LIMIT 1
      `,
      [userId, username, email],
    );

    if (duplicates[0]) {
      return sendError(res, 409, "Ya existe un usuario con ese username o correo");
    }

    const timestamp = toDbDateTime(new Date());
    await getPool().query(
      `
      UPDATE usuarios
      SET
        nombre_usuario = ?,
        nombre_completo = ?,
        correo = ?,
        rol = ?,
        activo = ?,
        actualizado_en = ?
      WHERE id = ?
      `,
      [username, name, email, role, booleanToTinyInt(isActive), timestamp, userId],
    );

    if (password) {
      await getPool().query(
        "UPDATE usuarios SET hash_contrasena = ? WHERE id = ?",
        [hashPassword(password), userId],
      );
    }

    const updatedUser = await getUserById(userId);
    res.json(updatedUser);
  }),
);

usersRouter.post(
  "/:id/toggle-activo",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const currentUser = await getUserById(userId);
    if (!currentUser) {
      return sendError(res, 404, "Usuario no encontrado");
    }

    if (currentUser.id === req.user.id) {
      return sendError(res, 400, "No puedes desactivar tu propia cuenta activa");
    }

    await getPool().query(
      "UPDATE usuarios SET activo = ?, actualizado_en = ? WHERE id = ?",
      [booleanToTinyInt(!currentUser.isActive), toDbDateTime(new Date()), userId],
    );

    const updatedUser = await getUserById(userId);
    res.json(updatedUser);
  }),
);
