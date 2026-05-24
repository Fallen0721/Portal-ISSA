# Gestión Comercial — Personas (Vida / Salud) y Daños (Riesgos Generales)

Documentación del módulo de gestión comercial para los roles `personas` y `daños`,
construido reutilizando el patrón del módulo comercial existente.

> **Decisión de arquitectura.** En lugar de un discriminador sobre la tabla `ventas`,
> se construyó **sobre la implementación previa de tablas separadas**. Hay tres tablas
> de gestión con la misma forma (`ventas_vida`, `ventas_salud`, `ventas_generales`) y
> toda la lógica se comparte mediante una fábrica en el backend y componentes genéricos
> en el frontend. El módulo del rol `comercial` (tabla `ventas`) **no se tocó**.

---

## 1. Mapa de áreas y líneas

| Rol        | Ruta        | Sub-módulos        | Tabla              | `area` de status | `area` de producto |
|------------|-------------|--------------------|--------------------|------------------|--------------------|
| `personas` | `/personas` | Vida, Salud        | `ventas_vida`, `ventas_salud` | `personas` | `vida`, `salud` |
| `daños`    | `/danos`    | (uno solo)         | `ventas_generales` | `danos`          | `daños`            |
| `comercial`| `/ventas`   | —                  | `ventas`           | `comercial`      | `comercial`        |

> Nota sobre la grafía: el **área de producto** usa `daños` (con ñ, convención
> heredada del catálogo). El **área de status** usa `danos` (ASCII). Ambas son
> internamente consistentes; no mezclar.

---

## 2. Base de datos (`server/db.mjs`)

Migraciones no destructivas vía `ensureColumnExists` (se aplican al arrancar el server).

### Tablas de gestión
`ventas_vida`, `ventas_salud` y `ventas_generales` comparten estas columnas:

| Columna | Tipo | Notas |
|---|---|---|
| `numero_poliza` | VARCHAR(120) NULL | No. Póliza / Referencia |
| `fecha_ingreso` | DATETIME | default = hoy en el form |
| `fecha_cierre` | DATETIME NULL | **autollenado** al cerrar |
| `asegurado` | VARCHAR(190) | |
| `tipo` | VARCHAR(80) | catálogo (Individual/Corporativo) |
| `tipo_gestion` | VARCHAR(120) NULL | catálogo |
| `producto` | VARCHAR(190) | catálogo filtrado por área |
| `compania` | VARCHAR(190) | catálogo |
| `estado` | VARCHAR(80) | catálogo de status (por área) |
| `moneda` | VARCHAR(10) | `L` / `$` |
| `suma_asegurada` | DECIMAL(15,2) | |
| `prima_neta` | DECIMAL(15,2) NULL | no-Vida: capturado / Vida: calculado |
| `prima_planeada` | DECIMAL(15,2) | solo Vida |
| `prima_basica` | DECIMAL(15,2) NULL | solo Vida |
| `canal` | VARCHAR(80) | catálogo |
| `vendedor_nombre` | VARCHAR(190) NULL | FK lógica al vendedor |
| `usuario_propietario_id` | CHAR(36) | FK `usuarios` |
| `observaciones` | TEXT NULL | |

`ventas_vida`/`ventas_salud` conservan además `ramo`, `agente`, `alianza`,
`oficial_negocios` y `fecha_vigencia` por compatibilidad con datos previos.

### Catálogo de status (`estados_gestion`)
Columnas añadidas: `area` (`comercial`|`personas`|`danos`), `etapa` (texto libre, agrupa
el pipeline) y `es_cierre` (TINYINT, marca los status que disparan `fecha_cierre`).
La unicidad pasó de `(tipo_estado, nombre)` a **`(area, nombre)`**, para que distintas
áreas puedan reutilizar el mismo nombre de status.

### Catálogos nuevos
`catalogo_tipos` (Individual/Corporativo) y `catalogo_tipos_gestion`. **Sin seed** —
los carga el gerente desde Opciones.

---

## 3. Backend (`server/routes/`)

| Archivo | Qué hace |
|---|---|
| `gestion-factory.mjs` | `createGestionRouter({ tableName, area, allowedRoles })`. Genera GET/GET:id/POST/PUT/DELETE con visibilidad por área, resolución de vendedor y autollenado de `fecha_cierre`. |
| `ventas-vida.mjs` / `ventas-salud.mjs` | Wrappers: `area: "personas"`, roles `admin/personas/gerente_comercial`. |
| `ventas-generales.mjs` | Wrapper: `area: "danos"`, roles `admin/daños/gerente_comercial`. |
| `tipos.mjs`, `tipos-gestion.mjs` | CRUD de catálogos (alta/edición solo `gerente_comercial`). |
| `statuses.mjs` | GET con filtro `?area=`; POST/PUT aceptan `area`, `etapa`, `esCierre`. |

Helpers relevantes (`server/helpers.mjs`): `mapVentaGenerales` (mapa unificado de fila),
`isClosingStatus(area, nombre)`.

### Reglas de negocio
- **Visibilidad:** los roles del área (y gerente/admin) ven y editan **todas** las
  gestiones del área (la tabla *es* el área). `comercial` sigue restringido a lo suyo.
- **Vendedor:** por defecto el usuario logueado. Solo `admin`/`gerente_comercial` pueden
  reasignarlo (se resuelve el propietario por nombre); para `personas`/`daños` queda fijo.
- **Prima neta:** si el front la envía se respeta; si no y hay planeada/básica, se deriva
  como `prima_planeada + prima_basica`.
- **Fecha de cierre:** al guardar, si el status pasa a uno con `es_cierre = 1` y la fecha
  está vacía, se setea a la fecha actual.

---

## 4. Frontend (`src/`)

### Modelo unificado (`types/models.ts`)
`Gestion` y `GestionMutationInput`. `VentaVida` / `VentaSalud` / `VentaGenerales` son
**alias** de `Gestion` (retrocompatibilidad con el dashboard y los summaries).

### Componentes compartidos
| Componente | Rol |
|---|---|
| `components/gestion/GestionModule.tsx` | Página completa: filtros (status por etapa, vendedor, compañía, fecha, moneda) + tabla + drawer + borrado. |
| `components/forms/GestionFormDrawer.tsx` | Formulario; carga todo desde catálogo; alterna Prima Neta vs Planeada/Básica según el producto. |
| `components/tables/GestionTable.tsx` | Tabla resumen; colorea el status según su etapa. |
| `services/gestion.service.ts` | `createGestionService(basePath)`; instancias en `ventasVida/Salud/Generales.service.ts`. |

### Páginas
- `pages/personas/GestionVidaPage.tsx`, `GestionSaludPage.tsx` → `GestionModule` (área `personas`).
- `pages/danos/RiesgosGeneralesPage.tsx` → `GestionModule` (área `danos`).

### Lógica de prima en el formulario
El form busca el producto seleccionado en el catálogo: si `producto.area === "vida"`
muestra **Prima Planeada + Prima Básica** (y muestra `prima_neta` calculada = suma);
en cualquier otro caso muestra **Prima Neta** directa.

### Ruteo / navegación
- `routes/router.tsx`: `/danos` para `daños`/`admin`.
- `components/layout/Sidebar.tsx`: entrada "Gestión Comercial" para `daños`.
- `services/auth.service.ts`: ruta por defecto de `daños` → `/danos`.

---

## 5. Configuración por el gerente (Opciones) — **sin seed**

El rol `gerente_comercial` carga en `/opciones`:

1. **Productos** — con su área (`vida` / `salud` / `daños`).
2. **Tipo** — Individual, Corporativo, …
3. **Tipo Gestión** — los que apliquen.
4. **Compañías** y **Canal** — compartidos entre áreas.
5. **Status** — pestaña por área (Comercial / Personas / Daños); cada status lleva su
   **Etapa** (ej. `ETAPA COTIZACIÓN`, `ETAPA DOCUMENTACIÓN`, …) y se marcan como **cierre**
   los que deben autollenar la fecha de cierre (Cerrado, No Tomado por el Cliente,
   Trámite Cancelado por la Compañía).

Pipeline de referencia (lo define el gerente):

- **Personas (Vida/Salud):** Cotización → Documentación → Compañía → Emisión → Final.
- **Daños:** igual, pero la etapa de documentación es **Documentación / Inspección**.

---

## 6. Permisos

- La autorización de los módulos nuevos vive en los **route-guards** (`allowedRoles` de la
  fábrica) y en `router.tsx` (`RequireAuth allowedRoles`). El `PermissionMap` genérico
  (`permissions.ts` / `permissions.mjs`) cubre los módulos originales y **no se expandió**.
- `personas`/`daños`: ven y editan toda su área. `gerente_comercial`/`admin`: todo.
  `comercial`: solo lo suyo (sin cambios).

---

## 7. Pendientes / no incluido

- **Bitácora y notificaciones** para personas/daños (no existían en el patrón previo).
- El **dashboard** sigue usando el enum heredado `VentaVidaStatus.NUEVA`; al definir el
  pipeline real puede requerir realineación.
- Formalizar (si se desea) los módulos nuevos en el `PermissionMap` para exponerlos en UI.

---

## 8. Cómo agregar otra área/línea en el futuro

1. **BD:** crear `ventas_<x>` (o reutilizar) con la forma canónica.
2. **Backend:** `createGestionRouter({ tableName, area, allowedRoles })` + registrar en `index.mjs`.
3. **Catálogo:** agregar el valor de área a `productos.mjs` (`VALID_AREAS`) y a `statuses.mjs`.
4. **Frontend:** un servicio con `createGestionService("/api/...")` y una página que monte
   `GestionModule` con `productArea`/`statusArea`. Ruta + Sidebar + permisos.
