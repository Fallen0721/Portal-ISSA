import mysql from "mysql2/promise";
import { createHash, randomUUID } from "node:crypto";
import { config } from "./config.mjs";

let pool;

const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");

const hashPassword = (password) =>
  createHash("sha256").update(password.trim()).digest("hex");

const createConnectionConfig = (withDatabase) => ({
  host: config.mysqlHost,
  port: config.mysqlPort,
  user: config.mysqlUser,
  password: config.mysqlPassword,
  charset: "utf8mb4",
  ...(withDatabase ? { database: config.mysqlDatabase } : {}),
});

const schemaStatements = [
  `
  CREATE TABLE IF NOT EXISTS usuarios (
    id CHAR(36) PRIMARY KEY,
    nombre_usuario VARCHAR(100) NOT NULL UNIQUE,
    nombre_completo VARCHAR(160) NOT NULL,
    correo VARCHAR(190) NOT NULL UNIQUE,
    rol VARCHAR(60) NOT NULL,
    hash_contrasena VARCHAR(128) NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en DATETIME NOT NULL,
    actualizado_en DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS sesiones (
    id CHAR(36) PRIMARY KEY,
    usuario_id CHAR(36) NOT NULL,
    creado_en DATETIME NOT NULL,
    expira_en DATETIME NOT NULL,
    INDEX idx_sesiones_usuario_id (usuario_id),
    INDEX idx_sesiones_expira_en (expira_en),
    CONSTRAINT fk_sesiones_usuario
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS ventas (
    id CHAR(36) PRIMARY KEY,
    numero_poliza VARCHAR(120) NOT NULL,
    fecha_ingreso DATETIME NOT NULL,
    fecha_vigencia DATETIME NULL,
    dias_proceso INT NOT NULL DEFAULT 0,
    asegurado VARCHAR(190) NOT NULL,
    tipo_venta VARCHAR(80) NOT NULL,
    producto VARCHAR(190) NOT NULL,
    compania VARCHAR(190) NOT NULL,
    estado_venta VARCHAR(80) NOT NULL,
    moneda VARCHAR(10) NOT NULL,
    suma_asegurada DECIMAL(15,2) NOT NULL DEFAULT 0,
    prima_neta_anual DECIMAL(15,2) NOT NULL DEFAULT 0,
    canal VARCHAR(80) NOT NULL,
    alianza VARCHAR(190) NULL,
    vendedor_nombre VARCHAR(190) NOT NULL,
    usuario_propietario_id CHAR(36) NOT NULL,
    observaciones TEXT NULL,
    fuente_registro VARCHAR(40) NULL,
    cotizacion_id CHAR(36) NULL,
    plan_compensacion VARCHAR(80) NULL,
    prima_basica_compensable DECIMAL(15,2) NULL,
    creado_en DATETIME NOT NULL,
    actualizado_en DATETIME NOT NULL,
    INDEX idx_ventas_usuario_propietario_id (usuario_propietario_id),
    INDEX idx_ventas_fecha_ingreso (fecha_ingreso),
    CONSTRAINT fk_ventas_usuario
      FOREIGN KEY (usuario_propietario_id) REFERENCES usuarios(id)
      ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS solicitudes_permiso (
    id CHAR(36) PRIMARY KEY,
    empleado VARCHAR(190) NOT NULL,
    departamento VARCHAR(190) NULL,
    tipo_solicitud VARCHAR(80) NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    dias INT NOT NULL,
    motivo TEXT NOT NULL,
    estado_solicitud VARCHAR(80) NOT NULL,
    observaciones TEXT NULL,
    usuario_propietario_id CHAR(36) NULL,
    creado_en DATETIME NOT NULL,
    actualizado_en DATETIME NOT NULL,
    INDEX idx_solicitudes_permiso_usuario_propietario_id (usuario_propietario_id),
    CONSTRAINT fk_solicitudes_permiso_usuario
      FOREIGN KEY (usuario_propietario_id) REFERENCES usuarios(id)
      ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS cotizaciones_viaje (
    id CHAR(36) PRIMARY KEY,
    usuario_propietario_id CHAR(36) NOT NULL,
    estado_cotizacion VARCHAR(80) NOT NULL,
    plan_seleccionado VARCHAR(80) NOT NULL,
    datos_formulario JSON NOT NULL,
    cotizaciones_generadas JSON NOT NULL,
    cotizacion_recomendada_id VARCHAR(190) NULL,
    venta_convertida_id CHAR(36) NULL,
    creado_en DATETIME NOT NULL,
    actualizado_en DATETIME NOT NULL,
    INDEX idx_cotizaciones_viaje_usuario_propietario_id (usuario_propietario_id),
    CONSTRAINT fk_cotizaciones_viaje_usuario
      FOREIGN KEY (usuario_propietario_id) REFERENCES usuarios(id)
      ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS borradores_cotizacion_viaje (
    usuario_propietario_id CHAR(36) PRIMARY KEY,
    paso INT NOT NULL,
    plan_seleccionado VARCHAR(80) NULL,
    datos_formulario JSON NOT NULL,
    cotizacion_actual_id CHAR(36) NULL,
    actualizado_en DATETIME NOT NULL,
    CONSTRAINT fk_borradores_cotizacion_viaje_usuario
      FOREIGN KEY (usuario_propietario_id) REFERENCES usuarios(id)
      ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS clientes (
    id CHAR(36) PRIMARY KEY,
    correo VARCHAR(190) NOT NULL UNIQUE,
    telefono VARCHAR(50) NOT NULL,
    nombre VARCHAR(190) NOT NULL,
    ultima_actividad_en DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS cliente_cotizaciones (
    cliente_id CHAR(36) NOT NULL,
    cotizacion_id CHAR(36) NOT NULL,
    PRIMARY KEY (cliente_id, cotizacion_id),
    CONSTRAINT fk_cliente_cotizaciones_cliente
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      ON DELETE CASCADE,
    CONSTRAINT fk_cliente_cotizaciones_cotizacion
      FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones_viaje(id)
      ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS cliente_ventas (
    cliente_id CHAR(36) NOT NULL,
    venta_id CHAR(36) NOT NULL,
    PRIMARY KEY (cliente_id, venta_id),
    CONSTRAINT fk_cliente_ventas_cliente
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      ON DELETE CASCADE,
    CONSTRAINT fk_cliente_ventas_venta
      FOREIGN KEY (venta_id) REFERENCES ventas(id)
      ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS metas_mensuales (
    id CHAR(36) PRIMARY KEY,
    vendedor_id CHAR(36) NOT NULL,
    mes INT NOT NULL,
    anio INT NOT NULL,
    tipo_meta VARCHAR(80) NOT NULL,
    porcentaje_manual DECIMAL(8,2) NULL,
    valor_manual DECIMAL(15,2) NULL,
    creado_en DATETIME NOT NULL,
    actualizado_en DATETIME NOT NULL,
    UNIQUE KEY uq_metas_vendedor_periodo_tipo (vendedor_id, mes, anio, tipo_meta),
    INDEX idx_metas_mensuales_vendedor_id (vendedor_id),
    CONSTRAINT fk_metas_mensuales_usuario
      FOREIGN KEY (vendedor_id) REFERENCES usuarios(id)
      ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS estados_gestion (
    id CHAR(36) PRIMARY KEY,
    tipo_estado VARCHAR(20) NOT NULL,
    area VARCHAR(60) NOT NULL DEFAULT 'comercial',
    etapa VARCHAR(120) NULL,
    es_cierre TINYINT(1) NOT NULL DEFAULT 0,
    nombre VARCHAR(190) NOT NULL,
    creado_en DATETIME NOT NULL,
    actualizado_en DATETIME NOT NULL,
    UNIQUE KEY uq_estados_gestion_area_nombre (area, nombre)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS notificaciones (
    id CHAR(36) PRIMARY KEY,
    usuario_id CHAR(36) NOT NULL,
    tipo_notificacion VARCHAR(80) NOT NULL,
    titulo VARCHAR(190) NOT NULL,
    mensaje TEXT NOT NULL,
    ruta_destino VARCHAR(255) NULL,
    leida TINYINT(1) NOT NULL DEFAULT 0,
    creado_en DATETIME NOT NULL,
    INDEX idx_notificaciones_usuario_id (usuario_id),
    INDEX idx_notificaciones_creado_en (creado_en),
    CONSTRAINT fk_notificaciones_usuario
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS borradores_cuadro_vehiculos (
    usuario_propietario_id CHAR(36) PRIMARY KEY,
    modo VARCHAR(40) NOT NULL,
    nombre_cliente VARCHAR(190) NOT NULL,
    vehiculos_json JSON NOT NULL,
    actualizado_en DATETIME NOT NULL,
    CONSTRAINT fk_borradores_cuadro_vehiculos_usuario
      FOREIGN KEY (usuario_propietario_id) REFERENCES usuarios(id)
      ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS tasas_cotizador_vehiculos (
    id CHAR(36) PRIMARY KEY,
    compania_id VARCHAR(60) NOT NULL,
    modalidad VARCHAR(20) NOT NULL,
    tipo_vehiculo VARCHAR(60) NOT NULL,
    origen VARCHAR(20) NULL,
    suma_asegurada_min DECIMAL(15,2) NULL,
    suma_asegurada_max DECIMAL(15,2) NULL,
    tasa DECIMAL(10,6) NOT NULL,
    creado_en DATETIME NOT NULL,
    actualizado_en DATETIME NOT NULL,
    INDEX idx_tasas_vehiculos_compania (compania_id),
    INDEX idx_tasas_vehiculos_modalidad (modalidad),
    INDEX idx_tasas_vehiculos_tipo (tipo_vehiculo)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS historial_cotizaciones_vehiculos (
    id CHAR(36) PRIMARY KEY,
    usuario_propietario_id CHAR(36) NOT NULL,
    nombre_usuario_generador VARCHAR(190) NOT NULL,
    correo_usuario_generador VARCHAR(190) NOT NULL,
    nombre_asegurado VARCHAR(190) NOT NULL,
    modalidad VARCHAR(20) NOT NULL,
    vehiculos_json JSON NOT NULL,
    cotizaciones_json JSON NOT NULL,
    valor_asegurado_total DECIMAL(15,2) NOT NULL DEFAULT 0,
    creado_en DATETIME NOT NULL,
    INDEX idx_historial_cotizaciones_vehiculos_usuario (usuario_propietario_id),
    INDEX idx_historial_cotizaciones_vehiculos_creado_en (creado_en),
    CONSTRAINT fk_historial_cotizaciones_vehiculos_usuario
      FOREIGN KEY (usuario_propietario_id) REFERENCES usuarios(id)
      ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS catalogo_productos (
    id            CHAR(36) PRIMARY KEY,
    nombre        VARCHAR(190) NOT NULL UNIQUE,
    creado_en     DATETIME NOT NULL,
    actualizado_en DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS catalogo_companias (
    id            CHAR(36) PRIMARY KEY,
    nombre        VARCHAR(190) NOT NULL UNIQUE,
    creado_en     DATETIME NOT NULL,
    actualizado_en DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS catalogo_canales (
    id            CHAR(36) PRIMARY KEY,
    nombre        VARCHAR(190) NOT NULL UNIQUE,
    creado_en     DATETIME NOT NULL,
    actualizado_en DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS catalogo_ramos (
    id            CHAR(36) PRIMARY KEY,
    nombre        VARCHAR(190) NOT NULL UNIQUE,
    creado_en     DATETIME NOT NULL,
    actualizado_en DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS ventas_vida (
    id                   CHAR(36) PRIMARY KEY,
    numero_poliza        VARCHAR(120) NULL,
    fecha_ingreso        DATETIME NOT NULL,
    fecha_vigencia       DATETIME NULL,
    asegurado            VARCHAR(190) NOT NULL,
    tipo                 VARCHAR(80) NOT NULL,
    producto             VARCHAR(190) NOT NULL,
    ramo                 VARCHAR(190) NULL,
    compania             VARCHAR(190) NOT NULL,
    estado               VARCHAR(80) NOT NULL,
    moneda               VARCHAR(10) NOT NULL,
    suma_asegurada       DECIMAL(15,2) NOT NULL DEFAULT 0,
    prima_planeada       DECIMAL(15,2) NOT NULL DEFAULT 0,
    prima_basica         DECIMAL(15,2) NULL,
    agente               VARCHAR(190) NULL,
    alianza              VARCHAR(190) NULL,
    oficial_negocios     VARCHAR(190) NULL,
    canal                VARCHAR(80) NOT NULL,
    observaciones        TEXT NULL,
    creado_por_nombre    VARCHAR(190) NOT NULL,
    usuario_propietario_id CHAR(36) NOT NULL,
    creado_en            DATETIME NOT NULL,
    actualizado_en       DATETIME NOT NULL,
    INDEX idx_ventas_vida_usuario_propietario_id (usuario_propietario_id),
    INDEX idx_ventas_vida_fecha_ingreso (fecha_ingreso),
    CONSTRAINT fk_ventas_vida_usuario
      FOREIGN KEY (usuario_propietario_id) REFERENCES usuarios(id)
      ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS ventas_salud (
    id                   CHAR(36) PRIMARY KEY,
    numero_poliza        VARCHAR(120) NULL,
    fecha_ingreso        DATETIME NOT NULL,
    fecha_vigencia       DATETIME NULL,
    asegurado            VARCHAR(190) NOT NULL,
    tipo                 VARCHAR(80) NOT NULL,
    producto             VARCHAR(190) NOT NULL,
    ramo                 VARCHAR(190) NULL,
    compania             VARCHAR(190) NOT NULL,
    estado               VARCHAR(80) NOT NULL,
    moneda               VARCHAR(10) NOT NULL,
    suma_asegurada       DECIMAL(15,2) NOT NULL DEFAULT 0,
    prima_planeada       DECIMAL(15,2) NOT NULL DEFAULT 0,
    prima_basica         DECIMAL(15,2) NULL,
    agente               VARCHAR(190) NULL,
    alianza              VARCHAR(190) NULL,
    oficial_negocios     VARCHAR(190) NULL,
    canal                VARCHAR(80) NOT NULL,
    observaciones        TEXT NULL,
    creado_por_nombre    VARCHAR(190) NOT NULL,
    usuario_propietario_id CHAR(36) NOT NULL,
    creado_en            DATETIME NOT NULL,
    actualizado_en       DATETIME NOT NULL,
    INDEX idx_ventas_salud_usuario_propietario_id (usuario_propietario_id),
    INDEX idx_ventas_salud_fecha_ingreso (fecha_ingreso),
    CONSTRAINT fk_ventas_salud_usuario
      FOREIGN KEY (usuario_propietario_id) REFERENCES usuarios(id)
      ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS ventas_generales (
    id                   CHAR(36) PRIMARY KEY,
    numero_poliza        VARCHAR(120) NULL,
    fecha_ingreso        DATETIME NOT NULL,
    fecha_vigencia       DATETIME NULL,
    fecha_cierre         DATETIME NULL,
    asegurado            VARCHAR(190) NOT NULL,
    tipo                 VARCHAR(80) NOT NULL,
    tipo_gestion         VARCHAR(120) NULL,
    producto             VARCHAR(190) NOT NULL,
    ramo                 VARCHAR(190) NULL,
    compania             VARCHAR(190) NOT NULL,
    estado               VARCHAR(80) NOT NULL,
    moneda               VARCHAR(10) NOT NULL,
    suma_asegurada       DECIMAL(15,2) NOT NULL DEFAULT 0,
    prima_neta           DECIMAL(15,2) NULL,
    prima_planeada       DECIMAL(15,2) NULL,
    prima_basica         DECIMAL(15,2) NULL,
    agente               VARCHAR(190) NULL,
    alianza              VARCHAR(190) NULL,
    oficial_negocios     VARCHAR(190) NULL,
    canal                VARCHAR(80) NOT NULL,
    observaciones        TEXT NULL,
    vendedor_nombre      VARCHAR(190) NULL,
    creado_por_nombre    VARCHAR(190) NOT NULL,
    usuario_propietario_id CHAR(36) NOT NULL,
    creado_en            DATETIME NOT NULL,
    actualizado_en       DATETIME NOT NULL,
    INDEX idx_ventas_generales_usuario_propietario_id (usuario_propietario_id),
    INDEX idx_ventas_generales_fecha_ingreso (fecha_ingreso),
    CONSTRAINT fk_ventas_generales_usuario
      FOREIGN KEY (usuario_propietario_id) REFERENCES usuarios(id)
      ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS catalogo_tipos (
    id            CHAR(36) PRIMARY KEY,
    nombre        VARCHAR(190) NOT NULL UNIQUE,
    creado_en     DATETIME NOT NULL,
    actualizado_en DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS catalogo_tipos_gestion (
    id            CHAR(36) PRIMARY KEY,
    nombre        VARCHAR(190) NOT NULL UNIQUE,
    creado_en     DATETIME NOT NULL,
    actualizado_en DATETIME NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS bitacora_ventas (
    id               CHAR(36) PRIMARY KEY,
    venta_id         CHAR(36) NOT NULL,
    usuario_id       CHAR(36) NULL,
    tipo             VARCHAR(20) NOT NULL,
    contenido        TEXT NOT NULL,
    datos_extra      JSON NULL,
    fecha_inicio     DATETIME NULL,
    fecha_fin_aprox  DATETIME NULL,
    finalizada       TINYINT(1) NOT NULL DEFAULT 0,
    finalizada_en    DATETIME NULL,
    creado_en        DATETIME NOT NULL,
    INDEX idx_bitacora_ventas_venta_id (venta_id),
    INDEX idx_bitacora_ventas_creado_en (creado_en),
    CONSTRAINT fk_bitacora_ventas_venta
      FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    CONSTRAINT fk_bitacora_ventas_usuario
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
];

const defaultStatusSeeds = [
  { tipo: "prospecto", nombre: "Primer contacto realizado" },
  { tipo: "prospecto", nombre: "No contactado" },
  { tipo: "prospecto", nombre: "No interesado" },
  { tipo: "prospecto", nombre: "Cita programada" },
  { tipo: "prospecto", nombre: "Cotización enviada" },
  { tipo: "prospecto", nombre: "Seguimiento de cotización" },
  { tipo: "prospecto", nombre: "Ajustes de cotización" },
  { tipo: "prospecto", nombre: "Interesado - pendiente decisión" },
  { tipo: "prospecto", nombre: "No tomado por el cliente" },
  { tipo: "venta", nombre: "Solicitud en llenado" },
  { tipo: "venta", nombre: "Documentos pendientes" },
  { tipo: "venta", nombre: "En revisión interna" },
  { tipo: "venta", nombre: "Ingresado a compañía" },
  {
    tipo: "venta",
    nombre: "Requerimientos adicionales (exámenes/documentos)",
  },
  { tipo: "venta", nombre: "Aprobado por la compañía" },
  { tipo: "venta", nombre: "Pago pendiente" },
  { tipo: "venta", nombre: "Póliza emitida" },
  { tipo: "venta", nombre: "Póliza entregada" },
  { tipo: "venta", nombre: "Nuevo" },
  { tipo: "venta", nombre: "Trámite cancelado por la compañía" },
];

const defaultProductoSeeds = [
  "Vida y Gastos Médicos Colectivo",
  "Accidentes Personales Colectivo",
  "Vida y Gastos Médicos PYME",
  "Saldo de Deudas Colectivo",
  "Accidente Estudiantil",
  "Garantía Estudiantil",
  "Vida Colectivo",
  "Vida PYME",
  "Gastos Médicos Individual",
  "Accidentes Personales",
  "Vida Universal",
  "Vida Temporal",
  "Mascotas",
  "Incendio Residencial",
  "Construcción",
  "Contra Robo",
  "Automóvil",
  "Equipo y Maquinaria Contratista",
  "Rotura de Maquinaria",
  "Todo Riesgo Incendio",
  "Todo Riesgo Montaje",
  "Todo Riesgo Energía",
  "Equipo Electrónico",
  "Dinero y Valores",
  "Casco Marítimo",
  "Transporte",
  "Calderas",
  "Aviones",
];

const defaultCompaniaSeeds = [
  "ASSA",
  "Seguros Crefisa",
  "Seguros Continental",
  "Seguros Lafise",
  "Seguros Atlantida",
  "Seguros del Pais",
  "MAPFRE",
  "Davivienda",
  "Ficohsa",
  "PALIG",
];

const defaultCanalSeeds = [
  "VENTA DIRECTA",
  "REFERIDOS",
  "REDES SOCIALES",
  "VENTA CRUZADA",
  "Fusiona2",
];

const defaultVehicleRateSeeds = [
  ...["individual", "colectivo"].flatMap((modalidad) => [
    { companiaId: "ficohsa", modalidad, tipoVehiculo: "turismo", tasa: 0.026 },
    { companiaId: "ficohsa", modalidad, tipoVehiculo: "camioneta", tasa: 0.023 },
    { companiaId: "ficohsa", modalidad, tipoVehiculo: "pickup", tasa: 0.023 },
    { companiaId: "ficohsa", modalidad, tipoVehiculo: "microbus", tasa: 0.027 },
    { companiaId: "ficohsa", modalidad, tipoVehiculo: "panel", tasa: 0.027 },
    { companiaId: "ficohsa", modalidad, tipoVehiculo: "camion", tasa: 0.0295 },
    { companiaId: "ficohsa", modalidad, tipoVehiculo: "cabezal", tasa: 0.034 },
    {
      companiaId: "davivienda",
      modalidad,
      tipoVehiculo: "turismo",
      sumaAseguradaMax: 399999.99,
      tasa: 0.026,
    },
    {
      companiaId: "davivienda",
      modalidad,
      tipoVehiculo: "turismo",
      sumaAseguradaMin: 400000,
      tasa: 0.024,
    },
    {
      companiaId: "davivienda",
      modalidad,
      tipoVehiculo: "camioneta",
      sumaAseguradaMax: 399999.99,
      tasa: 0.026,
    },
    {
      companiaId: "davivienda",
      modalidad,
      tipoVehiculo: "camioneta",
      sumaAseguradaMin: 400000,
      tasa: 0.024,
    },
    {
      companiaId: "davivienda",
      modalidad,
      tipoVehiculo: "pickup",
      sumaAseguradaMax: 399999.99,
      tasa: 0.026,
    },
    {
      companiaId: "davivienda",
      modalidad,
      tipoVehiculo: "pickup",
      sumaAseguradaMin: 400000,
      tasa: 0.024,
    },
    {
      companiaId: "davivienda",
      modalidad,
      tipoVehiculo: "microbus",
      sumaAseguradaMax: 399999.99,
      tasa: 0.028,
    },
    {
      companiaId: "davivienda",
      modalidad,
      tipoVehiculo: "microbus",
      sumaAseguradaMin: 400000,
      tasa: 0.027,
    },
    {
      companiaId: "davivienda",
      modalidad,
      tipoVehiculo: "panel",
      sumaAseguradaMax: 399999.99,
      tasa: 0.028,
    },
    {
      companiaId: "davivienda",
      modalidad,
      tipoVehiculo: "panel",
      sumaAseguradaMin: 400000,
      tasa: 0.027,
    },
    { companiaId: "davivienda", modalidad, tipoVehiculo: "camion", tasa: 0.029 },
  ]),
  { companiaId: "mapfre", modalidad: "individual", tipoVehiculo: "turismo", tasa: 0.025 },
  { companiaId: "mapfre", modalidad: "individual", tipoVehiculo: "camioneta", tasa: 0.025 },
  { companiaId: "mapfre", modalidad: "individual", tipoVehiculo: "pickup", tasa: 0.026 },
  { companiaId: "mapfre", modalidad: "individual", tipoVehiculo: "microbus", tasa: 0.03 },
  { companiaId: "mapfre", modalidad: "individual", tipoVehiculo: "panel", tasa: 0.026 },
  { companiaId: "mapfre", modalidad: "individual", tipoVehiculo: "camion", tasa: 0.038 },
  { companiaId: "mapfre", modalidad: "individual", tipoVehiculo: "cabezal", tasa: 0.038 },
  { companiaId: "crefisa", modalidad: "individual", tipoVehiculo: "turismo", origen: "agencia", tasa: 0.0215 },
  { companiaId: "crefisa", modalidad: "individual", tipoVehiculo: "turismo", origen: "importado", tasa: 0.0225 },
  { companiaId: "crefisa", modalidad: "individual", tipoVehiculo: "camioneta", origen: "agencia", tasa: 0.021 },
  { companiaId: "crefisa", modalidad: "individual", tipoVehiculo: "camioneta", origen: "importado", tasa: 0.0225 },
  { companiaId: "crefisa", modalidad: "individual", tipoVehiculo: "pickup", origen: "agencia", tasa: 0.0215 },
  { companiaId: "crefisa", modalidad: "individual", tipoVehiculo: "pickup", origen: "importado", tasa: 0.022 },
  { companiaId: "crefisa", modalidad: "individual", tipoVehiculo: "microbus", origen: "agencia", tasa: 0.024 },
  { companiaId: "crefisa", modalidad: "individual", tipoVehiculo: "microbus", origen: "importado", tasa: 0.025 },
  { companiaId: "crefisa", modalidad: "individual", tipoVehiculo: "panel", origen: "agencia", tasa: 0.0215 },
  { companiaId: "crefisa", modalidad: "individual", tipoVehiculo: "panel", origen: "importado", tasa: 0.022 },
  { companiaId: "crefisa", modalidad: "individual", tipoVehiculo: "camion", origen: "agencia", tasa: 0.024 },
  { companiaId: "crefisa", modalidad: "individual", tipoVehiculo: "camion", origen: "importado", tasa: 0.025 },
  { companiaId: "crefisa", modalidad: "individual", tipoVehiculo: "motocicleta", origen: "agencia", tasa: 0.04 },
  { companiaId: "crefisa", modalidad: "individual", tipoVehiculo: "motocicleta", origen: "importado", tasa: 0.05 },
  { companiaId: "crefisa", modalidad: "individual", tipoVehiculo: "blindado", origen: "agencia", tasa: 0.03 },
  { companiaId: "crefisa", modalidad: "individual", tipoVehiculo: "blindado", origen: "importado", tasa: 0.03 },
  { companiaId: "continental", modalidad: "individual", tipoVehiculo: "turismo", tasa: 0.0215 },
  { companiaId: "continental", modalidad: "individual", tipoVehiculo: "camioneta", tasa: 0.0215 },
  { companiaId: "continental", modalidad: "individual", tipoVehiculo: "pickup", tasa: 0.0215 },
  { companiaId: "continental", modalidad: "individual", tipoVehiculo: "microbus", tasa: 0.025 },
  { companiaId: "continental", modalidad: "individual", tipoVehiculo: "panel", tasa: 0.0215 },
  { companiaId: "continental", modalidad: "individual", tipoVehiculo: "camion", tasa: 0.035 },
  { companiaId: "continental", modalidad: "individual", tipoVehiculo: "cabezal", tasa: 0.055 },
  { companiaId: "continental", modalidad: "individual", tipoVehiculo: "transporte_publico", tasa: 0.055 },
  { companiaId: "continental", modalidad: "individual", tipoVehiculo: "camion_carga_pesada", tasa: 0.035 },
];

const migrationStatements = [
  `
  UPDATE ventas
  SET estado_venta = 'Nuevo'
  WHERE estado_venta = 'NUEVA'
  `,
  `
  UPDATE ventas
  SET estado_venta = 'Ingresado a compañía'
  WHERE estado_venta = 'INGRESADA'
  `,
  `
  UPDATE ventas
  SET estado_venta = 'Aprobado por la compañía'
  WHERE estado_venta = 'APROBADA'
  `,
  `
  UPDATE ventas
  SET estado_venta = 'Trámite cancelado por la compañía'
  WHERE estado_venta IN ('CANCELADO POR COMPAÑIA', 'CANCELADO POR COMPAÑÍA')
  `,
  `
  UPDATE ventas
  SET estado_venta = 'No tomado por el cliente'
  WHERE estado_venta = 'NO_TOMADO POR CLIENTE'
  `,
  `
  UPDATE ventas
  SET estado_venta = 'Primer contacto realizado'
  WHERE estado_venta IN ('ASIGNACIÓN', 'ASIGNACION')
  `,
];

const ensureColumnExists = async (tableName, columnName, definition) => {
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE ?`, [
    columnName,
  ]);

  if (rows.length > 0) {
    return;
  }

  await pool.query(
    `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`,
  );
};

export const initializeDatabase = async () => {
  pool = mysql.createPool({
    ...createConnectionConfig(true),
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    decimalNumbers: true,
  });

  if (!config.dbBootstrapEnabled) {
    await pool.query("SELECT 1");
    return;
  }

  const connection = await mysql.createConnection(createConnectionConfig(false));
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.mysqlDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.end();

  await pool.query("SELECT 1");

  for (const statement of schemaStatements) {
    await pool.query(statement);
  }

  await ensureColumnExists(
    "cotizaciones_viaje",
    "venta_convertida_id",
    "CHAR(36) NULL",
  );
  await ensureColumnExists(
    "metas_mensuales",
    "porcentaje_manual",
    "DECIMAL(8,2) NULL",
  );
  await ensureColumnExists(
    "metas_mensuales",
    "valor_manual",
    "DECIMAL(15,2) NULL",
  );
  await ensureColumnExists("ventas", "fecha_cierre", "DATETIME NULL");
  await ensureColumnExists("ventas", "alianza", "VARCHAR(190) NULL");
  await ensureColumnExists("ventas", "plan_compensacion", "VARCHAR(80) NULL");
  await ensureColumnExists("ventas", "prima_basica_compensable", "DECIMAL(15,2) NULL");
  await ensureColumnExists("bitacora_ventas", "fecha_inicio", "DATETIME NULL");
  await ensureColumnExists("bitacora_ventas", "fecha_fin_aprox", "DATETIME NULL");
  await ensureColumnExists("bitacora_ventas", "finalizada", "TINYINT(1) NOT NULL DEFAULT 0");
  await ensureColumnExists("bitacora_ventas", "finalizada_en", "DATETIME NULL");
  await ensureColumnExists("catalogo_productos", "area", 'VARCHAR(60) NOT NULL DEFAULT "comercial"');

  // Nuevos campos de gestión Personas (Vida/Salud) y Daños
  for (const tabla of ["ventas_vida", "ventas_salud"]) {
    await ensureColumnExists(tabla, "fecha_cierre", "DATETIME NULL");
    await ensureColumnExists(tabla, "prima_neta", "DECIMAL(15,2) NULL");
    await ensureColumnExists(tabla, "tipo_gestion", "VARCHAR(120) NULL");
    await ensureColumnExists(tabla, "vendedor_nombre", "VARCHAR(190) NULL");
  }

  // Status por área y agrupación por etapa (lo existente queda como 'comercial')
  await ensureColumnExists(
    "estados_gestion",
    "area",
    'VARCHAR(60) NOT NULL DEFAULT "comercial"',
  );
  await ensureColumnExists("estados_gestion", "etapa", "VARCHAR(120) NULL");
  await ensureColumnExists(
    "estados_gestion",
    "es_cierre",
    "TINYINT(1) NOT NULL DEFAULT 0",
  );

  // La unicidad pasa de (tipo_estado, nombre) a (area, nombre) para que cada
  // área (comercial/personas/danos) pueda tener nombres de status repetidos.
  const [areaNombreIdx] = await pool.query(
    "SHOW INDEX FROM estados_gestion WHERE Key_name = 'uq_estados_gestion_area_nombre'",
  );
  if (areaNombreIdx.length === 0) {
    const [tipoNombreIdx] = await pool.query(
      "SHOW INDEX FROM estados_gestion WHERE Key_name = 'uq_estados_gestion_tipo_nombre'",
    );
    if (tipoNombreIdx.length > 0) {
      await pool.query(
        "ALTER TABLE estados_gestion DROP INDEX uq_estados_gestion_tipo_nombre",
      );
    }
    await pool.query(
      "ALTER TABLE estados_gestion ADD UNIQUE KEY uq_estados_gestion_area_nombre (area, nombre)",
    );
  }

  for (const status of defaultStatusSeeds) {
    await pool.query(
      `
      INSERT IGNORE INTO estados_gestion (
        id,
        tipo_estado,
        nombre,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        status.tipo,
        status.nombre,
        now(),
        now(),
      ],
    );
  }

  for (const nombre of defaultProductoSeeds) {
    await pool.query(
      `INSERT IGNORE INTO catalogo_productos (id, nombre, creado_en, actualizado_en) VALUES (?, ?, ?, ?)`,
      [randomUUID(), nombre, now(), now()],
    );
  }

  for (const nombre of defaultCompaniaSeeds) {
    await pool.query(
      `INSERT IGNORE INTO catalogo_companias (id, nombre, creado_en, actualizado_en) VALUES (?, ?, ?, ?)`,
      [randomUUID(), nombre, now(), now()],
    );
  }

  for (const nombre of defaultCanalSeeds) {
    await pool.query(
      `INSERT IGNORE INTO catalogo_canales (id, nombre, creado_en, actualizado_en) VALUES (?, ?, ?, ?)`,
      [randomUUID(), nombre, now(), now()],
    );
  }

  for (const rate of defaultVehicleRateSeeds) {
    const [duplicates] = await pool.query(
      `
      SELECT id
      FROM tasas_cotizador_vehiculos
      WHERE compania_id = ?
        AND modalidad = ?
        AND tipo_vehiculo = ?
        AND (
          (origen IS NULL AND ? IS NULL) OR
          origen = ?
        )
        AND (
          (suma_asegurada_min IS NULL AND ? IS NULL) OR
          suma_asegurada_min = ?
        )
        AND (
          (suma_asegurada_max IS NULL AND ? IS NULL) OR
          suma_asegurada_max = ?
        )
      LIMIT 1
      `,
      [
        rate.companiaId,
        rate.modalidad,
        rate.tipoVehiculo,
        rate.origen ?? null,
        rate.origen ?? null,
        rate.sumaAseguradaMin ?? null,
        rate.sumaAseguradaMin ?? null,
        rate.sumaAseguradaMax ?? null,
        rate.sumaAseguradaMax ?? null,
      ],
    );

    if (duplicates[0]) {
      continue;
    }

    await pool.query(
      `
      INSERT INTO tasas_cotizador_vehiculos (
        id,
        compania_id,
        modalidad,
        tipo_vehiculo,
        origen,
        suma_asegurada_min,
        suma_asegurada_max,
        tasa,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        rate.companiaId,
        rate.modalidad,
        rate.tipoVehiculo,
        rate.origen ?? null,
        rate.sumaAseguradaMin ?? null,
        rate.sumaAseguradaMax ?? null,
        rate.tasa,
        now(),
        now(),
      ],
    );
  }

  for (const statement of migrationStatements) {
    await pool.query(statement);
  }

  const [rows] = await pool.query("SELECT COUNT(*) AS total FROM usuarios");
  if (rows[0].total === 0) {
    const timestamp = now();
    await pool.query(
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
      [
        randomUUID(),
        "Admin",
        "Administrador General",
        "admin@portalissa.local",
        "admin",
        hashPassword("Passw0rd26."),
        1,
        timestamp,
        timestamp,
      ],
    );
  }
};

export const getPool = () => {
  if (!pool) {
    throw new Error("La base de datos no ha sido inicializada");
  }

  return pool;
};

export const withTransaction = async (callback) => {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const cleanupExpiredSessions = async () => {
  if (!pool) return;
  await pool.query("DELETE FROM sesiones WHERE expira_en <= NOW()");
};
