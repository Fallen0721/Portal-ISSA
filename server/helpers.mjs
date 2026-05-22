import { createHash, randomUUID } from "node:crypto";
import { config } from "./config.mjs";
import { getPool } from "./db.mjs";
import { canManageOwnedRecord, canViewOwnedRecord, roles } from "./permissions.mjs";

export const SESSION_DURATION_MS = config.sessionTtlDias * 24 * 60 * 60 * 1000;
export const VALID_RECORD_SOURCES = ["manual", "cotizacion"];
export const VALID_COMPENSATION_PLANS = [
  "none",
  "fusiona2_lempiras_estandar",
  "vida_universal_directa_cruzada_usd",
];

export const hashPassword = (password) =>
  createHash("sha256").update(String(password).trim()).digest("hex");

export const normalizeText = (value) => String(value ?? "").trim();
export const normalizeEmail = (value) => normalizeText(value).toLowerCase();
export const normalizeUsername = (value) => normalizeText(value);
export const booleanToTinyInt = (value) => (value ? 1 : 0);
export const generateUsernameFromName = (value) => {
  const normalized = normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const words = normalized
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);

  if (words.length === 0) return "";
  if (words.length === 1) return words[0];

  return `${words[0][0]}${words[1]}`;
};

export const toDbDateTime = (value, fallback = new Date()) => {
  const date = value ? new Date(value) : fallback;
  if (Number.isNaN(date.getTime())) {
    throw new Error("Fecha inválida");
  }

  return date.toISOString().slice(0, 19).replace("T", " ");
};

export const toNullableDbDateTime = (value) => {
  if (!value) return null;
  return toDbDateTime(value);
};

export const dateOnlyToDbDateTime = (value) => {
  if (!value) throw new Error("Fecha inválida");
  return toDbDateTime(`${value}T00:00:00`);
};

export const parseJson = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const sendError = (res, status, message) =>
  res.status(status).json({ message });

export const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

export const mapUser = (row) => ({
  id: row.id,
  username: row.nombre_usuario,
  name: row.nombre_completo,
  email: row.correo,
  role: row.rol,
  isActive: Boolean(row.activo),
  createdAt: new Date(row.creado_en).toISOString(),
  updatedAt: new Date(row.actualizado_en).toISOString(),
});

export const mapVenta = (row) => ({
  id: row.id,
  no: row.numero_poliza,
  fechaIngreso: new Date(row.fecha_ingreso).toISOString(),
  fechaVigencia: row.fecha_vigencia
    ? new Date(row.fecha_vigencia).toISOString()
    : null,
  diasProceso: row.dias_proceso,
  asegurado: row.asegurado,
  tipo: row.tipo_venta,
  producto: row.producto,
  compania: row.compania,
  status: row.estado_venta,
  moneda: row.moneda,
  sumaAsegurada: Number(row.suma_asegurada ?? 0),
  primaNetaAnual: Number(row.prima_neta_anual ?? 0),
  canal: row.canal,
  alianza: row.alianza ?? undefined,
  vendedor: row.vendedor_nombre,
  ownerUserId: row.usuario_propietario_id,
  fechaCierre: row.fecha_cierre ? new Date(row.fecha_cierre).toISOString() : null,
  observaciones: row.observaciones ?? undefined,
  source: row.fuente_registro ?? undefined,
  cotizacionId: row.cotizacion_id ?? undefined,
  compensationPlan: row.plan_compensacion ?? "none",
  primaBasicaCompensable: row.prima_basica_compensable,
});

export const mapPermiso = (row) => ({
  id: row.id,
  empleado: row.empleado,
  departamento: row.departamento ?? undefined,
  tipo: row.tipo_solicitud,
  fechaInicio: new Date(row.fecha_inicio).toISOString(),
  fechaFin: new Date(row.fecha_fin).toISOString(),
  dias: row.dias,
  motivo: row.motivo,
  status: row.estado_solicitud,
  observaciones: row.observaciones ?? undefined,
  creadoEn: new Date(row.creado_en).toISOString(),
  ownerUserId: row.usuario_propietario_id ?? undefined,
});

export const mapCotizacion = (row) => ({
  id: row.id,
  ownerUserId: row.usuario_propietario_id,
  status: row.estado_cotizacion,
  formData: parseJson(row.datos_formulario, {}),
  selectedPlanId: row.plan_seleccionado,
  quotes: parseJson(row.cotizaciones_generadas, []),
  recommendedQuoteId: row.cotizacion_recomendada_id ?? undefined,
  createdAt: new Date(row.creado_en).toISOString(),
  updatedAt: new Date(row.actualizado_en).toISOString(),
  convertedVentaId:
    row.venta_convertida_id ?? row.prospecto_convertido_id ?? undefined,
});

export const mapVentaVida = (row) => ({
  id: row.id,
  no: row.numero_poliza ?? null,
  fechaIngreso: new Date(row.fecha_ingreso).toISOString(),
  fechaVigencia: row.fecha_vigencia ? new Date(row.fecha_vigencia).toISOString() : null,
  asegurado: row.asegurado,
  tipo: row.tipo,
  producto: row.producto,
  ramo: row.ramo ?? undefined,
  compania: row.compania,
  status: row.estado,
  moneda: row.moneda,
  sumaAsegurada: Number(row.suma_asegurada ?? 0),
  primaPlaneada: Number(row.prima_planeada ?? 0),
  primaBasica: row.prima_basica != null ? Number(row.prima_basica) : null,
  creadoPor: row.creado_por_nombre,
  agente: row.agente ?? null,
  alianza: row.alianza ?? null,
  oficialNegocios: row.oficial_negocios ?? undefined,
  canal: row.canal,
  ownerUserId: row.usuario_propietario_id,
  observaciones: row.observaciones ?? undefined,
});

export const mapVentaSalud = (row) => ({
  id: row.id,
  no: row.numero_poliza ?? null,
  fechaIngreso: new Date(row.fecha_ingreso).toISOString(),
  fechaVigencia: row.fecha_vigencia ? new Date(row.fecha_vigencia).toISOString() : null,
  asegurado: row.asegurado,
  tipo: row.tipo,
  producto: row.producto,
  ramo: row.ramo ?? undefined,
  compania: row.compania,
  status: row.estado,
  moneda: row.moneda,
  sumaAsegurada: Number(row.suma_asegurada ?? 0),
  primaPlaneada: Number(row.prima_planeada ?? 0),
  primaBasica: row.prima_basica != null ? Number(row.prima_basica) : null,
  creadoPor: row.creado_por_nombre,
  agente: row.agente ?? null,
  alianza: row.alianza ?? null,
  oficialNegocios: row.oficial_negocios ?? undefined,
  canal: row.canal,
  ownerUserId: row.usuario_propietario_id,
  observaciones: row.observaciones ?? undefined,
});

export const mapMeta = (row) => ({
  id: row.id,
  vendedorId: row.vendedor_id,
  mes: row.mes,
  año: row.anio,
  tipo: row.tipo_meta,
  manualPercentage:
    row.porcentaje_manual === null ? null : Number(row.porcentaje_manual),
  manualValue: row.valor_manual === null ? null : Number(row.valor_manual),
});

export const mapStatusGestion = (row) => ({
  id: row.id,
  tipo: row.tipo_estado,
  nombre: row.nombre,
  createdAt: new Date(row.creado_en).toISOString(),
  updatedAt: new Date(row.actualizado_en).toISOString(),
});

export const mapCatalogItem = (row) => ({
  id: row.id,
  nombre: row.nombre,
  area: row.area ?? null,
  createdAt: new Date(row.creado_en).toISOString(),
});

export const mapNotification = (row) => ({
  id: row.id,
  type: row.tipo_notificacion,
  title: row.titulo,
  message: row.mensaje,
  createdAt: new Date(row.creado_en).toISOString(),
  read: Boolean(row.leida),
  linkTo: row.ruta_destino ?? undefined,
});

export const mapVehicleRate = (row) => ({
  id: row.id,
  companyId: row.compania_id,
  mode: row.modalidad,
  vehicleType: row.tipo_vehiculo,
  origin: row.origen ?? null,
  insuredValueMin:
    row.suma_asegurada_min === null ? null : Number(row.suma_asegurada_min),
  insuredValueMax:
    row.suma_asegurada_max === null ? null : Number(row.suma_asegurada_max),
  rate: Number(row.tasa),
  createdAt: new Date(row.creado_en).toISOString(),
  updatedAt: new Date(row.actualizado_en).toISOString(),
});

export const mapVehicleQuoteHistory = (row) => ({
  id: row.id,
  ownerUserId: row.usuario_propietario_id,
  createdByName: row.nombre_usuario_generador,
  createdByEmail: row.correo_usuario_generador,
  customerName: row.nombre_asegurado,
  mode: row.modalidad,
  vehicles: parseJson(row.vehiculos_json, []),
  quotes: parseJson(row.cotizaciones_json, []),
  totalInsuredValue: Number(row.valor_asegurado_total ?? 0),
  createdAt: new Date(row.creado_en).toISOString(),
});

export const sanitizeCompensationFields = () => ({
  compensationPlan: "none",
  primaBasicaCompensable: null,
});

export const assertRole = (role) => {
  if (!roles.includes(role)) {
    throw new Error("Rol inválido");
  }
};

export const assertSource = (source) => {
  if (source && !VALID_RECORD_SOURCES.includes(source)) {
    throw new Error("Fuente inválida");
  }
};

export const assertCompensationPlan = (plan) => {
  if (plan && !VALID_COMPENSATION_PLANS.includes(plan)) {
    throw new Error("Plan de compensación inválido");
  }
};

export const createSession = async (usuarioId) => {
  const sessionId = randomUUID();
  const creadoEn = new Date();
  const expiraEn = new Date(creadoEn.getTime() + SESSION_DURATION_MS);

  await getPool().query(
    `
    INSERT INTO sesiones (id, usuario_id, creado_en, expira_en)
    VALUES (?, ?, ?, ?)
    `,
    [
      sessionId,
      usuarioId,
      creadoEn.toISOString().slice(0, 19).replace("T", " "),
      expiraEn.toISOString().slice(0, 19).replace("T", " "),
    ],
  );

  return { sessionId, expiraEn };
};

export const setSessionCookie = (res, sessionId, expiraEn) => {
  res.cookie(config.sessionCookieName, sessionId, {
    httpOnly: true,
    sameSite: config.sessionCookieSameSite,
    secure: config.sessionCookieSecure,
    expires: expiraEn,
    path: "/",
    ...(config.sessionCookieDomain
      ? { domain: config.sessionCookieDomain }
      : {}),
  });
};

export const clearSessionCookie = (res) => {
  res.clearCookie(config.sessionCookieName, {
    httpOnly: true,
    sameSite: config.sessionCookieSameSite,
    secure: config.sessionCookieSecure,
    path: "/",
    ...(config.sessionCookieDomain
      ? { domain: config.sessionCookieDomain }
      : {}),
  });
};

export const getCurrentUserFromRequest = async (req) => {
  const sessionId = req.cookies?.[config.sessionCookieName];
  if (!sessionId) return null;

  const [rows] = await getPool().query(
    `
    SELECT
      s.id AS sesion_id,
      s.expira_en,
      u.*
    FROM sesiones s
    INNER JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.id = ? AND s.expira_en > NOW()
    LIMIT 1
    `,
    [sessionId],
  );

  const row = rows[0];
  if (!row || !row.activo) {
    return null;
  }

  return mapUser(row);
};

export const requireAuth = asyncHandler(async (req, res, next) => {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    clearSessionCookie(res);
    return sendError(res, 401, "Se requiere iniciar sesión");
  }

  req.user = user;
  next();
});

export const requireRole = (rolesAllowed) =>
  asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, "Se requiere iniciar sesión");
    }

    if (!rolesAllowed.includes(req.user.role)) {
      return sendError(res, 403, "No autorizado");
    }

    next();
  });

export const canManageRecord = canManageOwnedRecord;
export const canViewRecord = canViewOwnedRecord;

export const buildUserSearchClause = (search) => {
  if (!search) {
    return { sql: "", params: [] };
  }

  const query = `%${search.trim().toLowerCase()}%`;
  return {
    sql: `
      WHERE
        LOWER(nombre_completo) LIKE ? OR
        LOWER(correo) LIKE ? OR
        LOWER(nombre_usuario) LIKE ? OR
        LOWER(rol) LIKE ?
    `,
    params: [query, query, query, query],
  };
};

export const getUserById = async (id, executor = getPool()) => {
  const [rows] = await executor.query("SELECT * FROM usuarios WHERE id = ? LIMIT 1", [id]);
  return rows[0] ? mapUser(rows[0]) : null;
};

export const resolveOwnerFromVendorName = async (vendedor) => {
  const nombre = normalizeText(vendedor);
  if (!nombre) return null;

  const [rows] = await getPool().query(
    "SELECT * FROM usuarios WHERE LOWER(nombre_completo) = LOWER(?) LIMIT 1",
    [nombre],
  );

  return rows[0] ? mapUser(rows[0]) : null;
};

export const getActiveAdminIds = async () => {
  const [rows] = await getPool().query(
    "SELECT id FROM usuarios WHERE rol = 'admin' AND activo = 1",
  );
  return rows.map((row) => row.id);
};

export const getActiveGerenteIds = async () => {
  const [rows] = await getPool().query(
    "SELECT id FROM usuarios WHERE rol = 'gerente_comercial' AND activo = 1",
  );
  return rows.map((row) => row.id);
};

export const insertNotifications = async (
  usuarioIds,
  notification,
  executor = getPool(),
) => {
  if (!usuarioIds.length) return;

  const timestamp = toDbDateTime(new Date());
  for (const usuarioId of usuarioIds) {
    await executor.query(
      `
      INSERT INTO notificaciones (
        id,
        usuario_id,
        tipo_notificacion,
        titulo,
        mensaje,
        ruta_destino,
        leida,
        creado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        usuarioId,
        notification.type,
        notification.title,
        notification.message,
        notification.linkTo ?? null,
        0,
        timestamp,
      ],
    );
  }
};

export const upsertClienteDesdeCotizacion = async (
  cotizacion,
  extra = {},
  executor = getPool(),
) => {
  const correo = normalizeEmail(cotizacion.formData?.email);
  if (!correo) return null;

  const telefono = normalizeText(cotizacion.formData?.phone);
  const nombre = normalizeText(cotizacion.formData?.fullName);
  const ultimaActividadEn = toDbDateTime(new Date());
  const [existingRows] = await executor.query(
    "SELECT * FROM clientes WHERE correo = ? LIMIT 1",
    [correo],
  );

  const clienteId = existingRows[0]?.id ?? randomUUID();

  if (existingRows[0]) {
    await executor.query(
      `
      UPDATE clientes
      SET telefono = ?, nombre = ?, ultima_actividad_en = ?
      WHERE id = ?
      `,
      [telefono, nombre, ultimaActividadEn, clienteId],
    );
  } else {
    await executor.query(
      `
      INSERT INTO clientes (
        id,
        correo,
        telefono,
        nombre,
        ultima_actividad_en
      ) VALUES (?, ?, ?, ?, ?)
      `,
      [clienteId, correo, telefono, nombre, ultimaActividadEn],
    );
  }

  await executor.query(
    `
    INSERT IGNORE INTO cliente_cotizaciones (cliente_id, cotizacion_id)
    VALUES (?, ?)
    `,
    [clienteId, cotizacion.id],
  );

  if (extra.ventaId) {
    await executor.query(
      `
      INSERT IGNORE INTO cliente_ventas (cliente_id, venta_id)
      VALUES (?, ?)
      `,
      [clienteId, extra.ventaId],
    );
  }

  return clienteId;
};
