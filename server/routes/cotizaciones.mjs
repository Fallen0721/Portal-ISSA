import { Router } from "express";
import { randomUUID } from "node:crypto";
import { getPool, withTransaction } from "../db.mjs";
import { getPermissionMap } from "../permissions.mjs";
import {
  asyncHandler,
  canManageRecord,
  canViewRecord,
  mapCotizacion,
  mapVenta,
  normalizeText,
  sendError,
  toDbDateTime,
  upsertClienteDesdeCotizacion,
  parseJson,
} from "../helpers.mjs";

export const cotizacionesRouter = Router();
export const cotizacionesDraftRouter = Router();

cotizacionesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const permissions = getPermissionMap(req.user.role);
    if (!permissions.cotizador_viaje.view) {
      return sendError(res, 403, "No autorizado");
    }

    const [rows] = await getPool().query(
      "SELECT * FROM cotizaciones_viaje ORDER BY actualizado_en DESC",
    );

    const quotes = rows
      .map(mapCotizacion)
      .filter((quote) => canViewRecord(req.user, quote.ownerUserId));

    res.json(quotes);
  }),
);

cotizacionesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const [rows] = await getPool().query(
      "SELECT * FROM cotizaciones_viaje WHERE id = ? LIMIT 1",
      [req.params.id],
    );

    if (!rows[0]) {
      return res.status(404).json(null);
    }

    const quote = mapCotizacion(rows[0]);
    if (!canViewRecord(req.user, quote.ownerUserId)) {
      return sendError(res, 403, "No autorizado");
    }

    res.json(quote);
  }),
);

const saveCotizacion = async (req, res, currentQuoteId = null) => {
  const permissions = getPermissionMap(req.user.role);
  if (!permissions.cotizador_viaje.create && !permissions.cotizador_viaje.edit) {
    return sendError(res, 403, "No autorizado");
  }

  const quoteId = currentQuoteId ?? randomUUID();
  const [rows] = currentQuoteId
    ? await getPool().query(
        "SELECT * FROM cotizaciones_viaje WHERE id = ? LIMIT 1",
        [currentQuoteId],
      )
    : [[]];
  const currentQuote = rows[0] ? mapCotizacion(rows[0]) : null;

  if (currentQuote && !canManageRecord(req.user, currentQuote.ownerUserId)) {
    return sendError(res, 403, "No autorizado");
  }

  const timestamp = toDbDateTime(new Date());
  const payload = {
    ownerUserId: currentQuote?.ownerUserId ?? req.user.id,
    status: normalizeText(req.body?.status ?? currentQuote?.status ?? "cotizada"),
    formData: req.body?.formData ?? currentQuote?.formData ?? {},
    selectedPlanId: normalizeText(req.body?.selectedPlanId ?? currentQuote?.selectedPlanId),
    quotes: req.body?.quotes ?? currentQuote?.quotes ?? [],
    recommendedQuoteId:
      req.body?.recommendedQuoteId ?? currentQuote?.recommendedQuoteId ?? null,
    convertedVentaId: currentQuote?.convertedVentaId ?? null,
  };

  if (!payload.selectedPlanId) {
    return sendError(res, 400, "El plan seleccionado es obligatorio");
  }

  if (currentQuote) {
    await getPool().query(
      `
      UPDATE cotizaciones_viaje
      SET
        usuario_propietario_id = ?,
        estado_cotizacion = ?,
        plan_seleccionado = ?,
        datos_formulario = ?,
        cotizaciones_generadas = ?,
        cotizacion_recomendada_id = ?,
        venta_convertida_id = ?,
        actualizado_en = ?
      WHERE id = ?
      `,
      [
        payload.ownerUserId,
        payload.status,
        payload.selectedPlanId,
        JSON.stringify(payload.formData),
        JSON.stringify(payload.quotes),
        payload.recommendedQuoteId,
        payload.convertedVentaId,
        timestamp,
        quoteId,
      ],
    );
  } else {
    await getPool().query(
      `
      INSERT INTO cotizaciones_viaje (
        id,
        usuario_propietario_id,
        estado_cotizacion,
        plan_seleccionado,
        datos_formulario,
        cotizaciones_generadas,
        cotizacion_recomendada_id,
        venta_convertida_id,
        creado_en,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        quoteId,
        payload.ownerUserId,
        payload.status,
        payload.selectedPlanId,
        JSON.stringify(payload.formData),
        JSON.stringify(payload.quotes),
        payload.recommendedQuoteId,
        payload.convertedVentaId,
        timestamp,
        timestamp,
      ],
    );
  }

  const [savedRows] = await getPool().query(
    "SELECT * FROM cotizaciones_viaje WHERE id = ? LIMIT 1",
    [quoteId],
  );
  const savedQuote = mapCotizacion(savedRows[0]);
  await upsertClienteDesdeCotizacion(savedQuote);
  res.status(currentQuote ? 200 : 201).json(savedQuote);
};

cotizacionesRouter.post("/", asyncHandler(async (req, res) => saveCotizacion(req, res)));
cotizacionesRouter.put(
  "/:id",
  asyncHandler(async (req, res) => saveCotizacion(req, res, req.params.id)),
);

cotizacionesRouter.post(
  "/:id/estado",
  asyncHandler(async (req, res) => {
    const [rows] = await getPool().query(
      "SELECT * FROM cotizaciones_viaje WHERE id = ? LIMIT 1",
      [req.params.id],
    );

    if (!rows[0]) {
      return sendError(res, 404, "Cotización no encontrada");
    }

    const quote = mapCotizacion(rows[0]);
    if (!canManageRecord(req.user, quote.ownerUserId)) {
      return sendError(res, 403, "No autorizado");
    }

    await getPool().query(
      "UPDATE cotizaciones_viaje SET estado_cotizacion = ?, actualizado_en = ? WHERE id = ?",
      [normalizeText(req.body?.status), toDbDateTime(new Date()), req.params.id],
    );

    const [updatedRows] = await getPool().query(
      "SELECT * FROM cotizaciones_viaje WHERE id = ? LIMIT 1",
      [req.params.id],
    );
    res.json(mapCotizacion(updatedRows[0]));
  }),
);

cotizacionesRouter.post(
  "/:id/convertir-a-venta",
  asyncHandler(async (req, res) => {
    const [rows] = await getPool().query(
      "SELECT * FROM cotizaciones_viaje WHERE id = ? LIMIT 1",
      [req.params.id],
    );

    if (!rows[0]) {
      return sendError(res, 404, "Cotización no encontrada");
    }

    const quote = mapCotizacion(rows[0]);
    if (!canManageRecord(req.user, quote.ownerUserId)) {
      return sendError(res, 403, "No autorizado");
    }

    if (quote.convertedVentaId) {
      return sendError(res, 400, "Esta cotización ya fue convertida");
    }

    const recommendedQuote =
      quote.quotes.find((item) => item.id === quote.recommendedQuoteId) ??
      [...quote.quotes].sort((a, b) => a.price - b.price)[0];
    const planLabels = {
      estudiantil: "Plan Estudiantil",
      empresarial: "Plan Empresarial",
      personal: "Plan Personal",
    };

    const venta = await withTransaction(async (connection) => {
      const ventaId = randomUUID();
      const timestamp = toDbDateTime(new Date());
      const [ownerRows] = await connection.query(
        "SELECT nombre_completo FROM usuarios WHERE id = ? LIMIT 1",
        [quote.ownerUserId],
      );
      const ownerName = ownerRows[0]?.nombre_completo ?? req.user.name;

      await connection.query(
        `
        INSERT INTO ventas (
          id,
          numero_poliza,
          fecha_ingreso,
          fecha_vigencia,
          dias_proceso,
          asegurado,
          tipo_venta,
          producto,
          compania,
          estado_venta,
          moneda,
          suma_asegurada,
          prima_neta_anual,
          canal,
          vendedor_nombre,
          usuario_propietario_id,
          observaciones,
          fuente_registro,
          cotizacion_id,
          plan_compensacion,
          prima_basica_compensable,
          creado_en,
          actualizado_en
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          ventaId,
          "",
          timestamp,
          null,
          0,
          normalizeText(quote.formData?.fullName),
          "Nueva",
          `Seguro de Viaje - ${planLabels[quote.selectedPlanId] ?? quote.selectedPlanId}`,
          recommendedQuote?.provider ?? null,
          "Cotización enviada",
          "$",
          recommendedQuote?.coverageMedical ?? 0,
          recommendedQuote?.price ?? 0,
          "VENTA DIRECTA",
          ownerName,
          quote.ownerUserId,
          `Generado desde cotización ${quote.id}. Contacto: ${normalizeText(quote.formData?.phone)} / ${normalizeText(quote.formData?.email)}`.trim(),
          "cotizacion",
          quote.id,
          "none",
          null,
          timestamp,
          timestamp,
        ],
      );

      await connection.query(
        `
        UPDATE cotizaciones_viaje
        SET
          estado_cotizacion = 'convertida',
          venta_convertida_id = ?,
          actualizado_en = ?
        WHERE id = ?
        `,
        [ventaId, timestamp, quote.id],
      );

      await upsertClienteDesdeCotizacion(
        { ...quote, convertedVentaId: ventaId },
        { ventaId },
        connection,
      );

      const [ventaRows] = await connection.query(
        "SELECT * FROM ventas WHERE id = ? LIMIT 1",
        [ventaId],
      );
      return mapVenta(ventaRows[0]);
    });

    res.json(venta);
  }),
);

cotizacionesDraftRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const [rows] = await getPool().query(
      "SELECT * FROM borradores_cotizacion_viaje WHERE usuario_propietario_id = ? LIMIT 1",
      [req.user.id],
    );

    if (!rows[0]) {
      return res.json(null);
    }

    res.json({
      ownerUserId: rows[0].usuario_propietario_id,
      step: rows[0].paso,
      formData: parseJson(rows[0].datos_formulario, {}),
      selectedPlanId: rows[0].plan_seleccionado ?? "",
      updatedAt: new Date(rows[0].actualizado_en).toISOString(),
      currentQuoteId: rows[0].cotizacion_actual_id ?? undefined,
    });
  }),
);

cotizacionesDraftRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const permissions = getPermissionMap(req.user.role);
    if (!permissions.cotizador_viaje.create && !permissions.cotizador_viaje.edit) {
      return sendError(res, 403, "No autorizado");
    }

    const updatedAt = toDbDateTime(new Date());
    await getPool().query(
      `
      INSERT INTO borradores_cotizacion_viaje (
        usuario_propietario_id,
        paso,
        plan_seleccionado,
        datos_formulario,
        cotizacion_actual_id,
        actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        paso = VALUES(paso),
        plan_seleccionado = VALUES(plan_seleccionado),
        datos_formulario = VALUES(datos_formulario),
        cotizacion_actual_id = VALUES(cotizacion_actual_id),
        actualizado_en = VALUES(actualizado_en)
      `,
      [
        req.user.id,
        Number(req.body?.step ?? 1),
        req.body?.selectedPlanId || null,
        JSON.stringify(req.body?.formData ?? {}),
        req.body?.currentQuoteId ?? null,
        updatedAt,
      ],
    );

    res.json({
      ownerUserId: req.user.id,
      step: Number(req.body?.step ?? 1),
      formData: req.body?.formData ?? {},
      selectedPlanId: req.body?.selectedPlanId ?? "",
      updatedAt: new Date(updatedAt.replace(" ", "T") + "Z").toISOString(),
      currentQuoteId: req.body?.currentQuoteId ?? undefined,
    });
  }),
);

cotizacionesDraftRouter.delete(
  "/",
  asyncHandler(async (req, res) => {
    await getPool().query(
      "DELETE FROM borradores_cotizacion_viaje WHERE usuario_propietario_id = ?",
      [req.user.id],
    );
    res.json({ ok: true });
  }),
);
