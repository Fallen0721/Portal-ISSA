# Handoff — Gestión Comercial para `personas` y `daños`

Estado al cierre de esta sesión (2026-05-23). Para detalle funcional ver
[`gestion-comercial-personas-danos.md`](./gestion-comercial-personas-danos.md).

## Estado actual

- ✅ Implementadas las 5 fases (BD, backend, frontend personas, frontend daños, lógica de prima).
- ✅ `npx tsc -b` → exit 0. `npm run build` → OK (✓ built ~21s).
- ✅ `node --check` OK en todos los `.mjs` modificados.
- ⚠️ **NO se ejecutó contra MySQL en vivo** — falta levantar el server para aplicar las
  migraciones y probar el flujo de punta a punta.
- ⚠️ Los catálogos nuevos (productos por área, tipos, tipo gestión, pipelines de status)
  están **vacíos**: los carga el gerente desde Opciones (sin seed, por diseño).

## Decisiones tomadas (confirmadas con el usuario)

1. **Construir sobre lo existente**: tablas separadas `ventas_vida`/`ventas_salud` +
   nueva `ventas_generales` (daños). No se consolidó en `ventas`.
2. **Prima Vida**: `prima_neta = prima_planeada + prima_basica` (suma simple).
3. Visibilidad: personas/daños ven y editan **toda su área**.

## Archivos

### Backend creados
- `server/routes/gestion-factory.mjs` — fábrica de rutas compartida.
- `server/routes/ventas-generales.mjs` — ruta de daños.
- `server/routes/tipos.mjs`, `server/routes/tipos-gestion.mjs` — catálogos nuevos.

### Backend modificados
- `server/db.mjs` — tabla `ventas_generales`, catálogos `catalogo_tipos`/`catalogo_tipos_gestion`,
  columnas nuevas en `ventas_vida`/`ventas_salud`, `area`/`etapa`/`es_cierre` + unicidad
  `(area, nombre)` en `estados_gestion`.
- `server/helpers.mjs` — `mapVentaGenerales` (mapa unificado), `isClosingStatus`, `area/etapa/esCierre` en `mapStatusGestion`.
- `server/routes/statuses.mjs` — filtro `?area=`, soporte etapa/esCierre.
- `server/routes/ventas-vida.mjs`, `ventas-salud.mjs` — ahora wrappers de la fábrica.
- `server/index.mjs` — registro de las rutas nuevas.

### Frontend creados
- `src/components/gestion/GestionModule.tsx`
- `src/components/forms/GestionFormDrawer.tsx`
- `src/components/tables/GestionTable.tsx`
- `src/pages/danos/RiesgosGeneralesPage.tsx`
- `src/services/gestion.service.ts`, `ventasGenerales.service.ts`, `tipos.service.ts`, `tiposGestion.service.ts`

### Frontend modificados
- `src/types/models.ts` — modelo unificado `Gestion`; `VentaVida`/`VentaSalud` ahora alias.
- `src/pages/personas/GestionVidaPage.tsx`, `GestionSaludPage.tsx` — usan `GestionModule`.
- `src/pages/OpcionesPage.tsx` — secciones Tipo y Tipo Gestión.
- `src/components/options/StatusSection.tsx`, `src/components/forms/StatusFormDrawer.tsx` — área + etapa + es_cierre.
- `src/routes/router.tsx` (`/danos`), `src/components/layout/Sidebar.tsx`, `src/services/auth.service.ts`.
- `src/services/statuses.service.ts`, `ventasVida.service.ts`, `ventasSalud.service.ts`.

### Frontend eliminados (reemplazados por los compartidos)
- `VentaVidaFormDrawer.tsx`, `VentaSaludFormDrawer.tsx`, `VentasVidaTable.tsx`, `VentasSaludTable.tsx`.

## Próximos pasos para continuar

1. **Levantar el server** y verificar que las migraciones corren sin error:
   `! npm run dev:server` (o `npm run dev`). Revisar consola — ojo con la migración del
   índice único de `estados_gestion`.
2. **Probar el flujo** como gerente: cargar en Opciones → productos (vida/salud/daños),
   tipos, tipo gestión, y los **pipelines de status por área con su etapa** (marcando los
   de cierre). Luego crear gestiones como `personas` y `daños`.
3. **Verificar visibilidad**: que un usuario `personas` vea las gestiones de otros vendedores
   de su área; ídem `daños`.
4. **Verificar prima**: producto Vida → Planeada+Básica con neta calculada; producto Salud/
   Generales → Prima Neta directa.
5. **Verificar fecha de cierre**: pasar una gestión a un status marcado "cierre" → se llena sola.

## Pendientes deliberados (no bloqueantes)

- Bitácora / notificaciones para personas/daños (no estaban en el patrón previo).
- Dashboard sigue usando `VentaVidaStatus.NUEVA`; puede requerir realineación con el pipeline real.
- `PermissionMap` no expandido (autorización vive en route-guards + `router.tsx`).
