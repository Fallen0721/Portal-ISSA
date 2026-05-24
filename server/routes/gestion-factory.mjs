import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getPool } from "../db.mjs";
import {
  asyncHandler,
  isClosingStatus,
  mapVentaGenerales,
  normalizeText,
  resolveOwnerFromVendorName,
  sendError,
  toDbDateTime,
  toNullableDbDateTime,
} from "../helpers.mjs";

const ELEVATED_ROLES = ["admin", "gerente_comercial"];

const toNumberOrNull = (value) =>
  value === undefined || value === null || value === "" ? null : Number(value);

// Resuelve el vendedor/propietario. Solo admin y gerente pueden asignar a otro
// vendedor; los roles de área (personas/daños) quedan como propietarios.
const resolveOwner = async (req, fallbackOwnerId, fallbackVendorName) => {
  if (!ELEVATED_ROLES.includes(req.user.role)) {
    return { ownerUserId: fallbackOwnerId, vendorName: fallbackVendorName };
  }

  const resolved = await resolveOwnerFromVendorName(req.body?.vendedor);
  const ownerUserId =
    req.body?.ownerUserId ?? resolved?.id ?? fallbackOwnerId;
  const vendorName =
    normalizeText(resolved?.name ?? req.body?.vendedor) || fallbackVendorName;

  return { ownerUserId, vendorName };
};

// Calcula la prima neta: si el front la manda, se respeta; de lo contrario,
// para productos de línea Vida, se deriva como prima_planeada + prima_basica.
const resolvePrimaNeta = (body, primaPlaneada, primaBasica) => {
  const explicit = toNumberOrNull(body?.primaNeta);
  if (explicit !== null) return explicit;

  const planeada = primaPlaneada ?? 0;
  const basica = primaBasica ?? 0;
  if (planeada > 0 || basica > 0) return planeada + basica;

  return null;
};

export const createGestionRouter = ({ tableName, area, allowedRoles }) => {
  const router = Router();
  const map = mapVentaGenerales;

  const guard = (req, res) => {
    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, 403, "No autorizado");
      return false;
    }
    return true;
  };

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      if (!guard(req, res)) return;

      // Los roles del área (y gerente/admin) ven TODAS las gestiones del área.
      const [rows] = await getPool().query(
        `SELECT * FROM ${tableName} ORDER BY fecha_ingreso DESC`,
      );
      res.json(rows.map(map));
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      if (!guard(req, res)) return;

      const [rows] = await getPool().query(
        `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`,
        [req.params.id],
      );
      if (!rows[0]) return res.status(404).json(null);
      res.json(map(rows[0]));
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      if (!guard(req, res)) return;

      const { ownerUserId, vendorName } = await resolveOwner(
        req,
        req.user.id,
        req.user.name,
      );

      const id = randomUUID();
      const timestamp = toDbDateTime(new Date());

      const primaPlaneada = Number(req.body?.primaPlaneada ?? 0);
      const primaBasica = toNumberOrNull(req.body?.primaBasica);
      const primaNeta = resolvePrimaNeta(req.body, primaPlaneada, primaBasica);

      const status = normalizeText(req.body?.status);
      let fechaCierre = toNullableDbDateTime(req.body?.fechaCierre);
      if (!fechaCierre && (await isClosingStatus(area, status))) {
        fechaCierre = timestamp;
      }

      await getPool().query(
        `INSERT INTO ${tableName} (
          id, numero_poliza, fecha_ingreso, fecha_vigencia, fecha_cierre,
          asegurado, tipo, tipo_gestion, producto, ramo, compania, estado,
          moneda, suma_asegurada, prima_neta, prima_planeada, prima_basica,
          agente, alianza, oficial_negocios, canal, observaciones,
          vendedor_nombre, creado_por_nombre, usuario_propietario_id,
          creado_en, actualizado_en
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          normalizeText(req.body?.no) || null,
          toDbDateTime(req.body?.fechaIngreso),
          toNullableDbDateTime(req.body?.fechaVigencia),
          fechaCierre,
          normalizeText(req.body?.asegurado),
          normalizeText(req.body?.tipo),
          normalizeText(req.body?.tipoGestion) || null,
          normalizeText(req.body?.producto),
          normalizeText(req.body?.ramo) || null,
          normalizeText(req.body?.compania),
          status,
          normalizeText(req.body?.moneda),
          Number(req.body?.sumaAsegurada ?? 0),
          primaNeta,
          primaPlaneada,
          primaBasica,
          normalizeText(req.body?.agente) || null,
          normalizeText(req.body?.alianza) || null,
          normalizeText(req.body?.oficialNegocios) || null,
          normalizeText(req.body?.canal),
          normalizeText(req.body?.observaciones) || null,
          vendorName,
          req.user.name,
          ownerUserId,
          timestamp,
          timestamp,
        ],
      );

      const [rows] = await getPool().query(
        `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`,
        [id],
      );
      res.status(201).json(map(rows[0]));
    }),
  );

  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      if (!guard(req, res)) return;

      const [rows] = await getPool().query(
        `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`,
        [req.params.id],
      );
      if (!rows[0]) return sendError(res, 404, "Registro no encontrado");

      const current = map(rows[0]);

      const { ownerUserId, vendorName } = await resolveOwner(
        req,
        current.ownerUserId,
        current.vendedor,
      );

      const primaPlaneada = Number(
        req.body?.primaPlaneada ?? current.primaPlaneada ?? 0,
      );
      const primaBasica =
        req.body?.primaBasica !== undefined
          ? toNumberOrNull(req.body.primaBasica)
          : current.primaBasica;
      const primaNeta = resolvePrimaNeta(
        { primaNeta: req.body?.primaNeta ?? current.primaNeta },
        primaPlaneada,
        primaBasica,
      );

      const status = normalizeText(req.body?.status ?? current.status);
      const prevStatus = current.status;

      // Auto-llenado de fecha de cierre al pasar a un status de cierre.
      let fechaCierre =
        req.body?.fechaCierre !== undefined
          ? toNullableDbDateTime(req.body.fechaCierre)
          : current.fechaCierre
            ? toDbDateTime(current.fechaCierre)
            : null;
      if (
        !fechaCierre &&
        status !== prevStatus &&
        (await isClosingStatus(area, status))
      ) {
        fechaCierre = toDbDateTime(new Date());
      }

      await getPool().query(
        `UPDATE ${tableName} SET
          numero_poliza = ?,
          fecha_ingreso = ?,
          fecha_vigencia = ?,
          fecha_cierre = ?,
          asegurado = ?,
          tipo = ?,
          tipo_gestion = ?,
          producto = ?,
          ramo = ?,
          compania = ?,
          estado = ?,
          moneda = ?,
          suma_asegurada = ?,
          prima_neta = ?,
          prima_planeada = ?,
          prima_basica = ?,
          agente = ?,
          alianza = ?,
          oficial_negocios = ?,
          canal = ?,
          observaciones = ?,
          vendedor_nombre = ?,
          usuario_propietario_id = ?,
          actualizado_en = ?
        WHERE id = ?`,
        [
          req.body?.no !== undefined
            ? normalizeText(req.body.no) || null
            : current.no,
          toDbDateTime(req.body?.fechaIngreso ?? current.fechaIngreso),
          req.body?.fechaVigencia !== undefined
            ? toNullableDbDateTime(req.body.fechaVigencia)
            : current.fechaVigencia
              ? toDbDateTime(current.fechaVigencia)
              : null,
          fechaCierre,
          normalizeText(req.body?.asegurado ?? current.asegurado),
          normalizeText(req.body?.tipo ?? current.tipo),
          req.body?.tipoGestion !== undefined
            ? normalizeText(req.body.tipoGestion) || null
            : (current.tipoGestion ?? null),
          normalizeText(req.body?.producto ?? current.producto),
          req.body?.ramo !== undefined
            ? normalizeText(req.body.ramo) || null
            : (current.ramo ?? null),
          normalizeText(req.body?.compania ?? current.compania),
          status,
          normalizeText(req.body?.moneda ?? current.moneda),
          Number(req.body?.sumaAsegurada ?? current.sumaAsegurada),
          primaNeta,
          primaPlaneada,
          primaBasica,
          req.body?.agente !== undefined
            ? normalizeText(req.body.agente) || null
            : (current.agente ?? null),
          req.body?.alianza !== undefined
            ? normalizeText(req.body.alianza) || null
            : (current.alianza ?? null),
          req.body?.oficialNegocios !== undefined
            ? normalizeText(req.body.oficialNegocios) || null
            : (current.oficialNegocios ?? null),
          normalizeText(req.body?.canal ?? current.canal),
          req.body?.observaciones !== undefined
            ? normalizeText(req.body.observaciones) || null
            : (current.observaciones ?? null),
          vendorName,
          ownerUserId,
          toDbDateTime(new Date()),
          req.params.id,
        ],
      );

      const [updated] = await getPool().query(
        `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`,
        [req.params.id],
      );
      res.json(map(updated[0]));
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      if (!guard(req, res)) return;

      await getPool().query(`DELETE FROM ${tableName} WHERE id = ?`, [
        req.params.id,
      ]);
      res.json({ ok: true });
    }),
  );

  return router;
};
