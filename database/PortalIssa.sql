-- ============================================================
--  PortalIssa — Schema completo
--  Válido para instalación nueva Y para migración de BD existente.
--  Motor: MySQL 8.0+ / MariaDB 10.4+
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `PortalIssa`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `PortalIssa`;

-- ------------------------------------------------------------
-- TABLAS BASE
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS usuarios (
  id               CHAR(36) PRIMARY KEY,
  nombre_usuario   VARCHAR(100) NOT NULL UNIQUE,
  nombre_completo  VARCHAR(160) NOT NULL,
  correo           VARCHAR(190) NOT NULL UNIQUE,
  rol              VARCHAR(60)  NOT NULL,
  hash_contrasena  VARCHAR(128) NOT NULL,
  activo           TINYINT(1)  NOT NULL DEFAULT 1,
  creado_en        DATETIME NOT NULL,
  actualizado_en   DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sesiones (
  id          CHAR(36) PRIMARY KEY,
  usuario_id  CHAR(36) NOT NULL,
  creado_en   DATETIME NOT NULL,
  expira_en   DATETIME NOT NULL,
  INDEX idx_sesiones_usuario_id (usuario_id),
  INDEX idx_sesiones_expira_en  (expira_en),
  CONSTRAINT fk_sesiones_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- fecha_cierre y alianza se agregaron en migración; están incluidas aquí
-- para instalaciones nuevas.
CREATE TABLE IF NOT EXISTS ventas (
  id                       CHAR(36) PRIMARY KEY,
  numero_poliza            VARCHAR(120) NOT NULL,
  fecha_ingreso            DATETIME NOT NULL,
  fecha_vigencia           DATETIME NULL,
  fecha_cierre             DATETIME NULL,
  dias_proceso             INT NOT NULL DEFAULT 0,
  asegurado                VARCHAR(190) NOT NULL,
  tipo_venta               VARCHAR(80)  NOT NULL,
  producto                 VARCHAR(190) NOT NULL,
  compania                 VARCHAR(190) NOT NULL,
  estado_venta             VARCHAR(80)  NOT NULL,
  moneda                   VARCHAR(10)  NOT NULL,
  suma_asegurada           DECIMAL(15,2) NOT NULL DEFAULT 0,
  prima_neta_anual         DECIMAL(15,2) NOT NULL DEFAULT 0,
  canal                    VARCHAR(80)  NOT NULL,
  alianza                  VARCHAR(190) NULL,
  vendedor_nombre          VARCHAR(190) NOT NULL,
  usuario_propietario_id   CHAR(36) NOT NULL,
  observaciones            TEXT NULL,
  fuente_registro          VARCHAR(40)  NULL,
  cotizacion_id            CHAR(36)     NULL,
  plan_compensacion        VARCHAR(80)  NULL,
  prima_basica_compensable DECIMAL(15,2) NULL,
  creado_en                DATETIME NOT NULL,
  actualizado_en           DATETIME NOT NULL,
  INDEX idx_ventas_usuario_propietario_id (usuario_propietario_id),
  INDEX idx_ventas_fecha_ingreso (fecha_ingreso),
  CONSTRAINT fk_ventas_usuario
    FOREIGN KEY (usuario_propietario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS solicitudes_permiso (
  id                     CHAR(36) PRIMARY KEY,
  empleado               VARCHAR(190) NOT NULL,
  departamento           VARCHAR(190) NULL,
  tipo_solicitud         VARCHAR(80)  NOT NULL,
  fecha_inicio           DATETIME NOT NULL,
  fecha_fin              DATETIME NOT NULL,
  dias                   INT NOT NULL,
  motivo                 TEXT NOT NULL,
  estado_solicitud       VARCHAR(80)  NOT NULL,
  observaciones          TEXT NULL,
  usuario_propietario_id CHAR(36) NULL,
  creado_en              DATETIME NOT NULL,
  actualizado_en         DATETIME NOT NULL,
  INDEX idx_solicitudes_permiso_usuario_propietario_id (usuario_propietario_id),
  CONSTRAINT fk_solicitudes_permiso_usuario
    FOREIGN KEY (usuario_propietario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cotizaciones_viaje (
  id                       CHAR(36) PRIMARY KEY,
  usuario_propietario_id   CHAR(36) NOT NULL,
  estado_cotizacion        VARCHAR(80) NOT NULL,
  plan_seleccionado        VARCHAR(80) NOT NULL,
  datos_formulario         JSON NOT NULL,
  cotizaciones_generadas   JSON NOT NULL,
  cotizacion_recomendada_id VARCHAR(190) NULL,
  venta_convertida_id      CHAR(36) NULL,
  creado_en                DATETIME NOT NULL,
  actualizado_en           DATETIME NOT NULL,
  INDEX idx_cotizaciones_viaje_usuario_propietario_id (usuario_propietario_id),
  CONSTRAINT fk_cotizaciones_viaje_usuario
    FOREIGN KEY (usuario_propietario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS borradores_cotizacion_viaje (
  usuario_propietario_id CHAR(36) PRIMARY KEY,
  paso                   INT NOT NULL,
  plan_seleccionado      VARCHAR(80) NULL,
  datos_formulario       JSON NOT NULL,
  cotizacion_actual_id   CHAR(36) NULL,
  actualizado_en         DATETIME NOT NULL,
  CONSTRAINT fk_borradores_cotizacion_viaje_usuario
    FOREIGN KEY (usuario_propietario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clientes (
  id                  CHAR(36) PRIMARY KEY,
  correo              VARCHAR(190) NOT NULL UNIQUE,
  telefono            VARCHAR(50)  NOT NULL,
  nombre              VARCHAR(190) NOT NULL,
  ultima_actividad_en DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cliente_cotizaciones (
  cliente_id    CHAR(36) NOT NULL,
  cotizacion_id CHAR(36) NOT NULL,
  PRIMARY KEY (cliente_id, cotizacion_id),
  CONSTRAINT fk_cliente_cotizaciones_cliente
    FOREIGN KEY (cliente_id)    REFERENCES clientes(id)           ON DELETE CASCADE,
  CONSTRAINT fk_cliente_cotizaciones_cotizacion
    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones_viaje(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cliente_ventas (
  cliente_id CHAR(36) NOT NULL,
  venta_id   CHAR(36) NOT NULL,
  PRIMARY KEY (cliente_id, venta_id),
  CONSTRAINT fk_cliente_ventas_cliente
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  CONSTRAINT fk_cliente_ventas_venta
    FOREIGN KEY (venta_id)   REFERENCES ventas(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS metas_mensuales (
  id                 CHAR(36) PRIMARY KEY,
  vendedor_id        CHAR(36) NOT NULL,
  mes                INT NOT NULL,
  anio               INT NOT NULL,
  tipo_meta          VARCHAR(80)   NOT NULL,
  porcentaje_manual  DECIMAL(8,2)  NULL,
  valor_manual       DECIMAL(15,2) NULL,
  creado_en          DATETIME NOT NULL,
  actualizado_en     DATETIME NOT NULL,
  UNIQUE KEY uq_metas_vendedor_periodo_tipo (vendedor_id, mes, anio, tipo_meta),
  INDEX idx_metas_mensuales_vendedor_id (vendedor_id),
  CONSTRAINT fk_metas_mensuales_usuario
    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS estados_gestion (
  id             CHAR(36) PRIMARY KEY,
  tipo_estado    VARCHAR(20)  NOT NULL,
  nombre         VARCHAR(190) NOT NULL,
  creado_en      DATETIME NOT NULL,
  actualizado_en DATETIME NOT NULL,
  UNIQUE KEY uq_estados_gestion_tipo_nombre (tipo_estado, nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notificaciones (
  id                 CHAR(36) PRIMARY KEY,
  usuario_id         CHAR(36)     NOT NULL,
  tipo_notificacion  VARCHAR(80)  NOT NULL,
  titulo             VARCHAR(190) NOT NULL,
  mensaje            TEXT NOT NULL,
  ruta_destino       VARCHAR(255) NULL,
  leida              TINYINT(1)   NOT NULL DEFAULT 0,
  creado_en          DATETIME NOT NULL,
  INDEX idx_notificaciones_usuario_id (usuario_id),
  INDEX idx_notificaciones_creado_en  (creado_en),
  CONSTRAINT fk_notificaciones_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS borradores_cuadro_vehiculos (
  usuario_propietario_id CHAR(36) PRIMARY KEY,
  modo                   VARCHAR(40)  NOT NULL,
  nombre_cliente         VARCHAR(190) NOT NULL,
  vehiculos_json         JSON NOT NULL,
  actualizado_en         DATETIME NOT NULL,
  CONSTRAINT fk_borradores_cuadro_vehiculos_usuario
    FOREIGN KEY (usuario_propietario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasas_cotizador_vehiculos (
  id                 CHAR(36) PRIMARY KEY,
  compania_id        VARCHAR(60)   NOT NULL,
  modalidad          VARCHAR(20)   NOT NULL,
  tipo_vehiculo      VARCHAR(60)   NOT NULL,
  origen             VARCHAR(20)   NULL,
  suma_asegurada_min DECIMAL(15,2) NULL,
  suma_asegurada_max DECIMAL(15,2) NULL,
  tasa               DECIMAL(10,6) NOT NULL,
  creado_en          DATETIME NOT NULL,
  actualizado_en     DATETIME NOT NULL,
  INDEX idx_tasas_vehiculos_compania  (compania_id),
  INDEX idx_tasas_vehiculos_modalidad (modalidad),
  INDEX idx_tasas_vehiculos_tipo      (tipo_vehiculo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS historial_cotizaciones_vehiculos (
  id                           CHAR(36) PRIMARY KEY,
  usuario_propietario_id       CHAR(36)     NOT NULL,
  nombre_usuario_generador     VARCHAR(190) NOT NULL,
  correo_usuario_generador     VARCHAR(190) NOT NULL,
  nombre_asegurado             VARCHAR(190) NOT NULL,
  modalidad                    VARCHAR(20)  NOT NULL,
  vehiculos_json               JSON NOT NULL,
  cotizaciones_json            JSON NOT NULL,
  valor_asegurado_total        DECIMAL(15,2) NOT NULL DEFAULT 0,
  creado_en                    DATETIME NOT NULL,
  INDEX idx_historial_cotizaciones_vehiculos_usuario    (usuario_propietario_id),
  INDEX idx_historial_cotizaciones_vehiculos_creado_en  (creado_en),
  CONSTRAINT fk_historial_cotizaciones_vehiculos_usuario
    FOREIGN KEY (usuario_propietario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- CATÁLOGOS
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS catalogo_productos (
  id             CHAR(36) PRIMARY KEY,
  nombre         VARCHAR(190) NOT NULL UNIQUE,
  area           VARCHAR(60)  NOT NULL DEFAULT 'comercial',
  creado_en      DATETIME NOT NULL,
  actualizado_en DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalogo_companias (
  id             CHAR(36) PRIMARY KEY,
  nombre         VARCHAR(190) NOT NULL UNIQUE,
  creado_en      DATETIME NOT NULL,
  actualizado_en DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalogo_canales (
  id             CHAR(36) PRIMARY KEY,
  nombre         VARCHAR(190) NOT NULL UNIQUE,
  creado_en      DATETIME NOT NULL,
  actualizado_en DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalogo_ramos (
  id             CHAR(36) PRIMARY KEY,
  nombre         VARCHAR(190) NOT NULL UNIQUE,
  creado_en      DATETIME NOT NULL,
  actualizado_en DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- MÓDULOS VIDA Y SALUD
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ventas_vida (
  id                     CHAR(36) PRIMARY KEY,
  numero_poliza          VARCHAR(120) NULL,
  fecha_ingreso          DATETIME NOT NULL,
  fecha_vigencia         DATETIME NULL,
  asegurado              VARCHAR(190) NOT NULL,
  tipo                   VARCHAR(80)  NOT NULL,
  producto               VARCHAR(190) NOT NULL,
  ramo                   VARCHAR(190) NULL,
  compania               VARCHAR(190) NOT NULL,
  estado                 VARCHAR(80)  NOT NULL,
  moneda                 VARCHAR(10)  NOT NULL,
  suma_asegurada         DECIMAL(15,2) NOT NULL DEFAULT 0,
  prima_planeada         DECIMAL(15,2) NOT NULL DEFAULT 0,
  prima_basica           DECIMAL(15,2) NULL,
  agente                 VARCHAR(190) NULL,
  alianza                VARCHAR(190) NULL,
  oficial_negocios       VARCHAR(190) NULL,
  canal                  VARCHAR(80)  NOT NULL,
  observaciones          TEXT NULL,
  creado_por_nombre      VARCHAR(190) NOT NULL,
  usuario_propietario_id CHAR(36) NOT NULL,
  creado_en              DATETIME NOT NULL,
  actualizado_en         DATETIME NOT NULL,
  INDEX idx_ventas_vida_usuario_propietario_id (usuario_propietario_id),
  INDEX idx_ventas_vida_fecha_ingreso          (fecha_ingreso),
  CONSTRAINT fk_ventas_vida_usuario
    FOREIGN KEY (usuario_propietario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ventas_salud (
  id                     CHAR(36) PRIMARY KEY,
  numero_poliza          VARCHAR(120) NULL,
  fecha_ingreso          DATETIME NOT NULL,
  fecha_vigencia         DATETIME NULL,
  asegurado              VARCHAR(190) NOT NULL,
  tipo                   VARCHAR(80)  NOT NULL,
  producto               VARCHAR(190) NOT NULL,
  ramo                   VARCHAR(190) NULL,
  compania               VARCHAR(190) NOT NULL,
  estado                 VARCHAR(80)  NOT NULL,
  moneda                 VARCHAR(10)  NOT NULL,
  suma_asegurada         DECIMAL(15,2) NOT NULL DEFAULT 0,
  prima_planeada         DECIMAL(15,2) NOT NULL DEFAULT 0,
  prima_basica           DECIMAL(15,2) NULL,
  agente                 VARCHAR(190) NULL,
  alianza                VARCHAR(190) NULL,
  oficial_negocios       VARCHAR(190) NULL,
  canal                  VARCHAR(80)  NOT NULL,
  observaciones          TEXT NULL,
  creado_por_nombre      VARCHAR(190) NOT NULL,
  usuario_propietario_id CHAR(36) NOT NULL,
  creado_en              DATETIME NOT NULL,
  actualizado_en         DATETIME NOT NULL,
  INDEX idx_ventas_salud_usuario_propietario_id (usuario_propietario_id),
  INDEX idx_ventas_salud_fecha_ingreso          (fecha_ingreso),
  CONSTRAINT fk_ventas_salud_usuario
    FOREIGN KEY (usuario_propietario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- BITÁCORA DE VENTAS (actividad y cambios de status)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bitacora_ventas (
  id              CHAR(36) PRIMARY KEY,
  venta_id        CHAR(36) NOT NULL,
  usuario_id      CHAR(36) NULL,
  tipo            VARCHAR(20) NOT NULL,   -- 'estado' | 'actividad'
  contenido       TEXT NOT NULL,
  datos_extra     JSON NULL,              -- { de, a, tipoEstado }
  fecha_inicio    DATETIME NULL,
  fecha_fin_aprox DATETIME NULL,
  finalizada      TINYINT(1) NOT NULL DEFAULT 0,
  finalizada_en   DATETIME NULL,
  creado_en       DATETIME NOT NULL,
  INDEX idx_bitacora_ventas_venta_id  (venta_id),
  INDEX idx_bitacora_ventas_creado_en (creado_en),
  CONSTRAINT fk_bitacora_ventas_venta
    FOREIGN KEY (venta_id)    REFERENCES ventas(id)    ON DELETE CASCADE,
  CONSTRAINT fk_bitacora_ventas_usuario
    FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MIGRACIÓN — columnas agregadas a tablas existentes
-- Seguro ejecutar en BD nueva (IF NOT EXISTS) y en BD existente.
-- ============================================================

ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS fecha_cierre             DATETIME      NULL AFTER fecha_vigencia,
  ADD COLUMN IF NOT EXISTS alianza                  VARCHAR(190)  NULL AFTER canal,
  ADD COLUMN IF NOT EXISTS plan_compensacion        VARCHAR(80)   NULL AFTER cotizacion_id,
  ADD COLUMN IF NOT EXISTS prima_basica_compensable DECIMAL(15,2) NULL AFTER plan_compensacion;

ALTER TABLE cotizaciones_viaje
  ADD COLUMN IF NOT EXISTS venta_convertida_id CHAR(36) NULL AFTER cotizacion_recomendada_id;

ALTER TABLE metas_mensuales
  ADD COLUMN IF NOT EXISTS porcentaje_manual DECIMAL(8,2)  NULL AFTER tipo_meta,
  ADD COLUMN IF NOT EXISTS valor_manual      DECIMAL(15,2) NULL AFTER porcentaje_manual;

ALTER TABLE catalogo_productos
  ADD COLUMN IF NOT EXISTS area VARCHAR(60) NOT NULL DEFAULT 'comercial' AFTER nombre;

ALTER TABLE bitacora_ventas
  ADD COLUMN IF NOT EXISTS fecha_inicio    DATETIME   NULL           AFTER datos_extra,
  ADD COLUMN IF NOT EXISTS fecha_fin_aprox DATETIME   NULL           AFTER fecha_inicio,
  ADD COLUMN IF NOT EXISTS finalizada      TINYINT(1) NOT NULL DEFAULT 0 AFTER fecha_fin_aprox,
  ADD COLUMN IF NOT EXISTS finalizada_en   DATETIME   NULL           AFTER finalizada;

-- ============================================================
-- MIGRACIÓN DE DATOS — normalización de estados heredados
-- ============================================================

UPDATE ventas SET estado_venta = 'Nuevo'
  WHERE estado_venta = 'NUEVA';

UPDATE ventas SET estado_venta = 'Ingresado a compañía'
  WHERE estado_venta = 'INGRESADA';

UPDATE ventas SET estado_venta = 'Aprobado por la compañía'
  WHERE estado_venta = 'APROBADA';

UPDATE ventas SET estado_venta = 'Trámite cancelado por la compañía'
  WHERE estado_venta IN ('CANCELADO POR COMPAÑIA', 'CANCELADO POR COMPAÑÍA');

UPDATE ventas SET estado_venta = 'No tomado por el cliente'
  WHERE estado_venta = 'NO_TOMADO POR CLIENTE';

UPDATE ventas SET estado_venta = 'Primer contacto realizado'
  WHERE estado_venta IN ('ASIGNACIÓN', 'ASIGNACION');

-- ============================================================
-- SEED DATA — catálogo de estados de gestión
-- ============================================================

INSERT IGNORE INTO estados_gestion (id, tipo_estado, nombre, creado_en, actualizado_en) VALUES
  (UUID(), 'prospecto', 'Primer contacto realizado',            NOW(), NOW()),
  (UUID(), 'prospecto', 'No contactado',                        NOW(), NOW()),
  (UUID(), 'prospecto', 'No interesado',                        NOW(), NOW()),
  (UUID(), 'prospecto', 'Cita programada',                      NOW(), NOW()),
  (UUID(), 'prospecto', 'Cotización enviada',                   NOW(), NOW()),
  (UUID(), 'prospecto', 'Seguimiento de cotización',            NOW(), NOW()),
  (UUID(), 'prospecto', 'Ajustes de cotización',                NOW(), NOW()),
  (UUID(), 'prospecto', 'Interesado - pendiente decisión',      NOW(), NOW()),
  (UUID(), 'prospecto', 'No tomado por el cliente',             NOW(), NOW()),
  (UUID(), 'venta',     'Solicitud en llenado',                 NOW(), NOW()),
  (UUID(), 'venta',     'Documentos pendientes',                NOW(), NOW()),
  (UUID(), 'venta',     'En revisión interna',                  NOW(), NOW()),
  (UUID(), 'venta',     'Ingresado a compañía',                 NOW(), NOW()),
  (UUID(), 'venta',     'Requerimientos adicionales (exámenes/documentos)', NOW(), NOW()),
  (UUID(), 'venta',     'Aprobado por la compañía',             NOW(), NOW()),
  (UUID(), 'venta',     'Pago pendiente',                       NOW(), NOW()),
  (UUID(), 'venta',     'Póliza emitida',                       NOW(), NOW()),
  (UUID(), 'venta',     'Póliza entregada',                     NOW(), NOW()),
  (UUID(), 'venta',     'Nuevo',                                NOW(), NOW()),
  (UUID(), 'venta',     'Trámite cancelado por la compañía',    NOW(), NOW());

-- ------------------------------------------------------------
-- SEED DATA — catálogo de productos
-- ------------------------------------------------------------

INSERT IGNORE INTO catalogo_productos (id, nombre, area, creado_en, actualizado_en) VALUES
  (UUID(), 'Vida y Gastos Médicos Colectivo',   'comercial', NOW(), NOW()),
  (UUID(), 'Accidentes Personales Colectivo',   'comercial', NOW(), NOW()),
  (UUID(), 'Vida y Gastos Médicos PYME',        'comercial', NOW(), NOW()),
  (UUID(), 'Saldo de Deudas Colectivo',         'comercial', NOW(), NOW()),
  (UUID(), 'Accidente Estudiantil',             'comercial', NOW(), NOW()),
  (UUID(), 'Garantía Estudiantil',              'comercial', NOW(), NOW()),
  (UUID(), 'Vida Colectivo',                    'comercial', NOW(), NOW()),
  (UUID(), 'Vida PYME',                         'comercial', NOW(), NOW()),
  (UUID(), 'Gastos Médicos Individual',         'comercial', NOW(), NOW()),
  (UUID(), 'Accidentes Personales',             'comercial', NOW(), NOW()),
  (UUID(), 'Vida Universal',                    'comercial', NOW(), NOW()),
  (UUID(), 'Vida Temporal',                     'comercial', NOW(), NOW()),
  (UUID(), 'Mascotas',                          'comercial', NOW(), NOW()),
  (UUID(), 'Incendio Residencial',              'comercial', NOW(), NOW()),
  (UUID(), 'Construcción',                      'comercial', NOW(), NOW()),
  (UUID(), 'Contra Robo',                       'comercial', NOW(), NOW()),
  (UUID(), 'Automóvil',                         'comercial', NOW(), NOW()),
  (UUID(), 'Equipo y Maquinaria Contratista',   'comercial', NOW(), NOW()),
  (UUID(), 'Rotura de Maquinaria',              'comercial', NOW(), NOW()),
  (UUID(), 'Todo Riesgo Incendio',              'comercial', NOW(), NOW()),
  (UUID(), 'Todo Riesgo Montaje',               'comercial', NOW(), NOW()),
  (UUID(), 'Todo Riesgo Energía',               'comercial', NOW(), NOW()),
  (UUID(), 'Equipo Electrónico',                'comercial', NOW(), NOW()),
  (UUID(), 'Dinero y Valores',                  'comercial', NOW(), NOW()),
  (UUID(), 'Casco Marítimo',                    'comercial', NOW(), NOW()),
  (UUID(), 'Transporte',                        'comercial', NOW(), NOW()),
  (UUID(), 'Calderas',                          'comercial', NOW(), NOW()),
  (UUID(), 'Aviones',                           'comercial', NOW(), NOW());

-- ------------------------------------------------------------
-- SEED DATA — catálogo de compañías
-- ------------------------------------------------------------

INSERT IGNORE INTO catalogo_companias (id, nombre, creado_en, actualizado_en) VALUES
  (UUID(), 'ASSA',               NOW(), NOW()),
  (UUID(), 'Seguros Crefisa',    NOW(), NOW()),
  (UUID(), 'Seguros Continental', NOW(), NOW()),
  (UUID(), 'Seguros Lafise',     NOW(), NOW()),
  (UUID(), 'Seguros Atlantida',  NOW(), NOW()),
  (UUID(), 'Seguros del Pais',   NOW(), NOW()),
  (UUID(), 'MAPFRE',             NOW(), NOW()),
  (UUID(), 'Davivienda',         NOW(), NOW()),
  (UUID(), 'Ficohsa',            NOW(), NOW()),
  (UUID(), 'PALIG',              NOW(), NOW());

-- ------------------------------------------------------------
-- SEED DATA — catálogo de canales
-- ------------------------------------------------------------

INSERT IGNORE INTO catalogo_canales (id, nombre, creado_en, actualizado_en) VALUES
  (UUID(), 'VENTA DIRECTA',  NOW(), NOW()),
  (UUID(), 'REFERIDOS',      NOW(), NOW()),
  (UUID(), 'REDES SOCIALES', NOW(), NOW()),
  (UUID(), 'VENTA CRUZADA',  NOW(), NOW()),
  (UUID(), 'Fusiona2',       NOW(), NOW());

-- ============================================================
-- SEED DATA — tasas cotizador vehículos
-- ============================================================

DROP TEMPORARY TABLE IF EXISTS tmp_tasas_cotizador_vehiculos;

CREATE TEMPORARY TABLE tmp_tasas_cotizador_vehiculos (
  compania_id        VARCHAR(60)   NOT NULL,
  modalidad          VARCHAR(20)   NOT NULL,
  tipo_vehiculo      VARCHAR(60)   NOT NULL,
  origen             VARCHAR(20)   NULL,
  suma_asegurada_min DECIMAL(15,2) NULL,
  suma_asegurada_max DECIMAL(15,2) NULL,
  tasa               DECIMAL(10,6) NOT NULL
);

INSERT INTO tmp_tasas_cotizador_vehiculos
  (compania_id, modalidad, tipo_vehiculo, origen, suma_asegurada_min, suma_asegurada_max, tasa)
VALUES
  -- Ficohsa individual / colectivo
  ('ficohsa','individual','turismo',     NULL, NULL, NULL, 0.026000),
  ('ficohsa','individual','camioneta',   NULL, NULL, NULL, 0.023000),
  ('ficohsa','individual','pickup',      NULL, NULL, NULL, 0.023000),
  ('ficohsa','individual','microbus',    NULL, NULL, NULL, 0.027000),
  ('ficohsa','individual','panel',       NULL, NULL, NULL, 0.027000),
  ('ficohsa','individual','camion',      NULL, NULL, NULL, 0.029500),
  ('ficohsa','individual','cabezal',     NULL, NULL, NULL, 0.034000),
  ('ficohsa','colectivo', 'turismo',     NULL, NULL, NULL, 0.026000),
  ('ficohsa','colectivo', 'camioneta',   NULL, NULL, NULL, 0.023000),
  ('ficohsa','colectivo', 'pickup',      NULL, NULL, NULL, 0.023000),
  ('ficohsa','colectivo', 'microbus',    NULL, NULL, NULL, 0.027000),
  ('ficohsa','colectivo', 'panel',       NULL, NULL, NULL, 0.027000),
  ('ficohsa','colectivo', 'camion',      NULL, NULL, NULL, 0.029500),
  ('ficohsa','colectivo', 'cabezal',     NULL, NULL, NULL, 0.034000),
  -- Davivienda individual / colectivo
  ('davivienda','individual','turismo',   NULL, NULL,      399999.99, 0.026000),
  ('davivienda','individual','turismo',   NULL, 400000.00, NULL,      0.024000),
  ('davivienda','individual','camioneta', NULL, NULL,      399999.99, 0.026000),
  ('davivienda','individual','camioneta', NULL, 400000.00, NULL,      0.024000),
  ('davivienda','individual','pickup',    NULL, NULL,      399999.99, 0.026000),
  ('davivienda','individual','pickup',    NULL, 400000.00, NULL,      0.024000),
  ('davivienda','individual','microbus',  NULL, NULL,      399999.99, 0.028000),
  ('davivienda','individual','microbus',  NULL, 400000.00, NULL,      0.027000),
  ('davivienda','individual','panel',     NULL, NULL,      399999.99, 0.028000),
  ('davivienda','individual','panel',     NULL, 400000.00, NULL,      0.027000),
  ('davivienda','individual','camion',    NULL, NULL,      NULL,      0.029000),
  ('davivienda','colectivo', 'turismo',   NULL, NULL,      399999.99, 0.026000),
  ('davivienda','colectivo', 'turismo',   NULL, 400000.00, NULL,      0.024000),
  ('davivienda','colectivo', 'camioneta', NULL, NULL,      399999.99, 0.026000),
  ('davivienda','colectivo', 'camioneta', NULL, 400000.00, NULL,      0.024000),
  ('davivienda','colectivo', 'pickup',    NULL, NULL,      399999.99, 0.026000),
  ('davivienda','colectivo', 'pickup',    NULL, 400000.00, NULL,      0.024000),
  ('davivienda','colectivo', 'microbus',  NULL, NULL,      399999.99, 0.028000),
  ('davivienda','colectivo', 'microbus',  NULL, 400000.00, NULL,      0.027000),
  ('davivienda','colectivo', 'panel',     NULL, NULL,      399999.99, 0.028000),
  ('davivienda','colectivo', 'panel',     NULL, 400000.00, NULL,      0.027000),
  ('davivienda','colectivo', 'camion',    NULL, NULL,      NULL,      0.029000),
  -- MAPFRE
  ('mapfre','individual','turismo',    NULL, NULL, NULL, 0.025000),
  ('mapfre','individual','camioneta',  NULL, NULL, NULL, 0.025000),
  ('mapfre','individual','pickup',     NULL, NULL, NULL, 0.026000),
  ('mapfre','individual','microbus',   NULL, NULL, NULL, 0.030000),
  ('mapfre','individual','panel',      NULL, NULL, NULL, 0.026000),
  ('mapfre','individual','camion',     NULL, NULL, NULL, 0.038000),
  ('mapfre','individual','cabezal',    NULL, NULL, NULL, 0.038000),
  -- Crefisa
  ('crefisa','individual','turismo',     'agencia',   NULL, NULL, 0.021500),
  ('crefisa','individual','turismo',     'importado',  NULL, NULL, 0.022500),
  ('crefisa','individual','camioneta',   'agencia',   NULL, NULL, 0.021000),
  ('crefisa','individual','camioneta',   'importado',  NULL, NULL, 0.022500),
  ('crefisa','individual','pickup',      'agencia',   NULL, NULL, 0.021500),
  ('crefisa','individual','pickup',      'importado',  NULL, NULL, 0.022000),
  ('crefisa','individual','microbus',    'agencia',   NULL, NULL, 0.024000),
  ('crefisa','individual','microbus',    'importado',  NULL, NULL, 0.025000),
  ('crefisa','individual','panel',       'agencia',   NULL, NULL, 0.021500),
  ('crefisa','individual','panel',       'importado',  NULL, NULL, 0.022000),
  ('crefisa','individual','camion',      'agencia',   NULL, NULL, 0.024000),
  ('crefisa','individual','camion',      'importado',  NULL, NULL, 0.025000),
  ('crefisa','individual','motocicleta', 'agencia',   NULL, NULL, 0.040000),
  ('crefisa','individual','motocicleta', 'importado',  NULL, NULL, 0.050000),
  ('crefisa','individual','blindado',    'agencia',   NULL, NULL, 0.030000),
  ('crefisa','individual','blindado',    'importado',  NULL, NULL, 0.030000),
  -- Continental
  ('continental','individual','turismo',             NULL, NULL, NULL, 0.021500),
  ('continental','individual','camioneta',           NULL, NULL, NULL, 0.021500),
  ('continental','individual','pickup',              NULL, NULL, NULL, 0.021500),
  ('continental','individual','microbus',            NULL, NULL, NULL, 0.025000),
  ('continental','individual','panel',               NULL, NULL, NULL, 0.021500),
  ('continental','individual','camion',              NULL, NULL, NULL, 0.035000),
  ('continental','individual','cabezal',             NULL, NULL, NULL, 0.055000),
  ('continental','individual','transporte_publico',  NULL, NULL, NULL, 0.055000),
  ('continental','individual','camion_carga_pesada', NULL, NULL, NULL, 0.035000);

INSERT INTO tasas_cotizador_vehiculos
  (id, compania_id, modalidad, tipo_vehiculo, origen,
   suma_asegurada_min, suma_asegurada_max, tasa, creado_en, actualizado_en)
SELECT
  UUID(), s.compania_id, s.modalidad, s.tipo_vehiculo, s.origen,
  s.suma_asegurada_min, s.suma_asegurada_max, s.tasa, NOW(), NOW()
FROM tmp_tasas_cotizador_vehiculos s
WHERE NOT EXISTS (
  SELECT 1 FROM tasas_cotizador_vehiculos t
  WHERE t.compania_id        = s.compania_id
    AND t.modalidad          = s.modalidad
    AND t.tipo_vehiculo      = s.tipo_vehiculo
    AND t.origen             <=> s.origen
    AND t.suma_asegurada_min <=> s.suma_asegurada_min
    AND t.suma_asegurada_max <=> s.suma_asegurada_max
);

DROP TEMPORARY TABLE IF EXISTS tmp_tasas_cotizador_vehiculos;

-- ============================================================
-- SEED DATA — usuario administrador por defecto
-- Solo se inserta si la tabla de usuarios está vacía.
-- Contraseña por defecto: Passw0rd26.
-- CAMBIAR EN PRODUCCIÓN INMEDIATAMENTE.
-- ============================================================

INSERT INTO usuarios
  (id, nombre_usuario, nombre_completo, correo, rol, hash_contrasena, activo, creado_en, actualizado_en)
SELECT
  UUID(), 'Admin', 'Administrador General', 'admin@portalissa.local',
  'admin', SHA2('Passw0rd26.', 256), 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM usuarios);

SET FOREIGN_KEY_CHECKS = 1;
