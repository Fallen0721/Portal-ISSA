import { format } from "date-fns";
import { jsPDF } from "jspdf";
import { formatCurrency, formatNumber } from "../../utils/format";
import {
  VEHICLE_ORIGIN_LABELS,
  VEHICLE_TYPE_LABELS,
} from "./constants";
import {
  CoverageRow,
  VehicleComparisonMode,
  VehicleEntry,
  VehicleQuoteBreakdown,
} from "./types";

interface GenerateVehicleComparisonPdfInput {
  mode: VehicleComparisonMode;
  customerName: string;
  vehicles: VehicleEntry[];
  quotes: VehicleQuoteBreakdown[];
  totalInsuredValue: number;
  baseCoverages: CoverageRow[];
  specialCoverages?: CoverageRow[];
  generatedByName?: string;
  generatedByEmail?: string;
  generatedAt?: string;
}

const COLORS = {
  primary: [9, 74, 137] as const,
  primaryDark: [6, 46, 86] as const,
  accent: [14, 165, 233] as const,
  text: [15, 23, 42] as const,
  muted: [100, 116, 139] as const,
  border: [226, 232, 240] as const,
  surface: [248, 250, 252] as const,
  successBg: [236, 253, 245] as const,
  successText: [22, 163, 74] as const,
  warningBg: [255, 251, 235] as const,
  warningText: [180, 83, 9] as const,
} as const;

const PAGE_MARGIN = 36;
const FOOTER_SPACE = 28;
const LINE_HEIGHT = 11;
const CELL_PADDING_X = 6;
const CELL_PADDING_Y = 7;

const getModeLabel = (mode: VehicleComparisonMode) =>
  mode === "individual" ? "Individual" : "Colectivo";

const getSafeFilename = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();

const applyTextColor = (
  document: jsPDF,
  color: readonly [number, number, number],
) => {
  document.setTextColor(color[0], color[1], color[2]);
};

const applyFillColor = (
  document: jsPDF,
  color: readonly [number, number, number],
) => {
  document.setFillColor(color[0], color[1], color[2]);
};

const applyDrawColor = (
  document: jsPDF,
  color: readonly [number, number, number],
) => {
  document.setDrawColor(color[0], color[1], color[2]);
};

export const generateVehicleComparisonPdf = ({
  mode,
  customerName,
  vehicles,
  quotes,
  totalInsuredValue,
  baseCoverages,
  specialCoverages = [],
  generatedByName,
  generatedByEmail,
  generatedAt,
}: GenerateVehicleComparisonPdfInput) => {
  const document = new jsPDF({
    unit: "pt",
    format: "a4",
    orientation: "landscape",
  });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const maxContentY = pageHeight - PAGE_MARGIN - FOOTER_SPACE;
  let y = PAGE_MARGIN;

  const scaleWidths = (widths: number[]) => {
    const total = widths.reduce((sum, width) => sum + width, 0);
    return widths.map((width) => (width / total) * contentWidth);
  };

  const ensureSpace = (space: number, afterBreak?: () => void) => {
    if (y + space <= maxContentY) return;
    document.addPage();
    drawRepeatedHeader();
    if (afterBreak) afterBreak();
  };

  const drawRepeatedHeader = () => {
    y = PAGE_MARGIN;
    applyTextColor(document, COLORS.muted);
    document.setFont("helvetica", "bold");
    document.setFontSize(9);
    document.text("Portal ISSA", PAGE_MARGIN, y + 10);
    document.setFont("helvetica", "normal");
    document.text("Cuadro comparativo vehicular", pageWidth - PAGE_MARGIN, y + 10, {
      align: "right",
    });
    applyDrawColor(document, COLORS.border);
    document.line(PAGE_MARGIN, y + 18, pageWidth - PAGE_MARGIN, y + 18);
    y += 32;
  };

  const drawSectionHeading = (title: string, subtitle?: string) => {
    ensureSpace(subtitle ? 44 : 28);
    applyTextColor(document, COLORS.primary);
    document.setFont("helvetica", "bold");
    document.setFontSize(15);
    document.text(title, PAGE_MARGIN, y);
    y += 18;

    if (subtitle) {
      applyTextColor(document, COLORS.muted);
      document.setFont("helvetica", "normal");
      document.setFontSize(9);
      const lines = document.splitTextToSize(subtitle, contentWidth);
      document.text(lines, PAGE_MARGIN, y);
      y += lines.length * LINE_HEIGHT + 4;
    }
  };

  const drawTextBlock = (
    text: string,
    width: number,
    options?: { size?: number; color?: readonly [number, number, number] },
  ) => {
    const lines = document.splitTextToSize(text, width);
    ensureSpace(lines.length * LINE_HEIGHT + 4);
    applyTextColor(document, options?.color ?? COLORS.text);
    document.setFont("helvetica", "normal");
    document.setFontSize(options?.size ?? 10);
    document.text(lines, PAGE_MARGIN, y);
    y += lines.length * LINE_HEIGHT;
  };

  const drawMetricCards = (
    items: { label: string; value: string; note?: string }[],
  ) => {
    const gap = 12;
    const cardWidth = (contentWidth - gap * (items.length - 1)) / items.length;
    document.setFont("helvetica", "normal");
    document.setFontSize(8);
    const maxNoteLines = Math.max(
      ...items.map((item) =>
        item.note
          ? document.splitTextToSize(item.note, cardWidth - 28).length
          : 0,
      ),
      0,
    );
    const cardHeight = Math.max(82, 58 + maxNoteLines * LINE_HEIGHT + 16);
    ensureSpace(cardHeight);

    items.forEach((item, index) => {
      const cardX = PAGE_MARGIN + index * (cardWidth + gap);
      applyFillColor(document, COLORS.surface);
      applyDrawColor(document, COLORS.border);
      document.roundedRect(cardX, y, cardWidth, cardHeight, 16, 16, "FD");

      applyTextColor(document, COLORS.muted);
      document.setFont("helvetica", "bold");
      document.setFontSize(8);
      document.text(item.label.toUpperCase(), cardX + 14, y + 18);

      applyTextColor(document, COLORS.text);
      document.setFont("helvetica", "bold");
      document.setFontSize(18);
      document.text(item.value, cardX + 14, y + 44);

      if (item.note) {
        applyTextColor(document, COLORS.muted);
        document.setFont("helvetica", "normal");
        document.setFontSize(8);
        const lines = document.splitTextToSize(item.note, cardWidth - 28);
        document.text(lines, cardX + 14, y + 61);
      }
    });

    y += cardHeight + 18;
  };

  const drawDetailRows = (items: { label: string; value: string }[]) => {
    const columnGap = 24;
    const columnWidth = (contentWidth - columnGap) / 2;
    const pairCount = Math.ceil(items.length / 2);

    for (let row = 0; row < pairCount; row += 1) {
      const leftItem = items[row * 2];
      const rightItem = items[row * 2 + 1];
      const rowItems = [leftItem, rightItem].filter(
        (item): item is { label: string; value: string } => Boolean(item),
      );
      const rowHeight =
        Math.max(
          ...rowItems.map((item) => {
            const lines = document.splitTextToSize(item.value, columnWidth - 6);
            return lines.length * LINE_HEIGHT + 18;
          }),
          34,
        ) + 6;

      ensureSpace(rowHeight);

      rowItems.forEach((item, column) => {
        const x = PAGE_MARGIN + column * (columnWidth + columnGap);

        applyTextColor(document, COLORS.muted);
        document.setFont("helvetica", "bold");
        document.setFontSize(8);
        document.text(item.label.toUpperCase(), x, y);

        applyTextColor(document, COLORS.text);
        document.setFont("helvetica", "normal");
        document.setFontSize(11);
        const lines = document.splitTextToSize(item.value, columnWidth - 6);
        document.text(lines, x, y + 14);
      });

      y += rowHeight;
    }

    y += 8;
  };

  const drawTable = ({
    title,
    subtitle,
    headers,
    rows,
    columnWidths,
  }: {
    title: string;
    subtitle?: string;
    headers: string[];
    rows: string[][];
    columnWidths: number[];
  }) => {
    const getRowHeight = (row: string[]) => {
      document.setFont("helvetica", "normal");
      document.setFontSize(8.5);
      const lineCounts = row.map((cell, cellIndex) => {
        const lines = document.splitTextToSize(
          cell,
          Math.max(columnWidths[cellIndex] - CELL_PADDING_X * 2, 12),
        );
        return Math.max(lines.length, 1);
      });

      return Math.max(...lineCounts) * LINE_HEIGHT + CELL_PADDING_Y * 2;
    };

    const drawHeaderRow = () => {
      const headerHeight = 28;
      applyFillColor(document, COLORS.primaryDark);
      document.roundedRect(
        PAGE_MARGIN,
        y,
        contentWidth,
        headerHeight,
        12,
        12,
        "F",
      );
      applyTextColor(document, [255, 255, 255] as const);
      document.setFont("helvetica", "bold");
      document.setFontSize(8);
      let x = PAGE_MARGIN;
      headers.forEach((header, headerIndex) => {
        document.text(header, x + CELL_PADDING_X, y + 17, {
          maxWidth: columnWidths[headerIndex] - CELL_PADDING_X * 2,
        });
        x += columnWidths[headerIndex];
      });
      y += headerHeight + 6;
    };

    document.setFont("helvetica", "normal");
    document.setFontSize(9);
    const subtitleLines = subtitle
      ? document.splitTextToSize(subtitle, contentWidth).length
      : 0;
    const sectionHeight = 18 + (subtitleLines > 0 ? subtitleLines * LINE_HEIGHT + 4 : 0);
    const firstRowHeight = rows[0] ? getRowHeight(rows[0]) : 0;
    ensureSpace(sectionHeight + 34 + firstRowHeight + 2);

    drawSectionHeading(title, subtitle);
    drawHeaderRow();

    rows.forEach((row, rowIndex) => {
      const rowHeight = getRowHeight(row);

      ensureSpace(rowHeight + 2, drawHeaderRow);

      const fill =
        rowIndex % 2 === 0
          ? ([255, 255, 255] as const)
          : COLORS.surface;
      applyFillColor(document, fill);
      applyDrawColor(document, COLORS.border);
      document.rect(PAGE_MARGIN, y, contentWidth, rowHeight, "FD");

      let x = PAGE_MARGIN;
      row.forEach((cell, cellIndex) => {
        const cellWidth = columnWidths[cellIndex];
        const lines = document.splitTextToSize(
          cell,
          Math.max(cellWidth - CELL_PADDING_X * 2, 12),
        );
        const cellX = x + CELL_PADDING_X;
        const cellY = y + CELL_PADDING_Y + 8;
        applyTextColor(document, COLORS.text);
        document.setFont("helvetica", "normal");
        document.text(lines, cellX, cellY);
        x += cellWidth;
      });

      y += rowHeight;
    });

    y += 16;
  };

  const drawHero = () => {
    const heroHeight = 130;
    const stampWidth = Math.max(170, contentWidth * 0.24);
    const stampOffsetLeft = 28;
    const stampX = pageWidth - PAGE_MARGIN - stampWidth - stampOffsetLeft;

    applyFillColor(document, COLORS.primary);
    document.roundedRect(
      PAGE_MARGIN,
      y,
      contentWidth,
      heroHeight,
      15,
      15,
      "F",
    );

    applyFillColor(document, COLORS.accent);
    document.roundedRect(
      stampX,
      y + 14,
      stampWidth,
      heroHeight - 28,
      18,
      18,
      "F",
    );

    applyTextColor(document, [255, 255, 255] as const);
    document.setFont("helvetica", "bold");
    document.setFontSize(24);
    document.text("Cuadro Comparativo de Vehiculos", PAGE_MARGIN + 22, y + 34);

    document.setFont("helvetica", "normal");
    document.setFontSize(11);
    document.text(
      "",
      PAGE_MARGIN + 22,
      y + 56,
    );

    document.setFont("helvetica", "bold");
    document.setFontSize(9);
    document.text("CLIENTE", stampX + 14, y + 34);
    document.setFont("helvetica", "normal");
    document.setFontSize(11);
    const customerLines = document.splitTextToSize(
      customerName,
      stampWidth - 28,
    );
    document.text(customerLines, stampX + 14, y + 52);
    document.text(`Modalidad: ${getModeLabel(mode)}`, stampX + 14, y + 84);
    document.text(
      `Emitido: ${format(generatedAt ? new Date(generatedAt) : new Date(), "dd/MM/yyyy HH:mm")}`,
      stampX + 14,
      y + 100,
    );

    y += heroHeight + 18;
  };

  drawHero();

  drawMetricCards([
    {
      label: "Vehiculos evaluados",
      value: formatNumber(vehicles.length),
      note:
        mode === "individual"
          ? "Comparativo unitario"
          : "Flota consolidada",
    },
    {
      label: "Valor asegurado total",
      value: formatCurrency(totalInsuredValue, "L"),
      note: "Suma del valor reportado en la solicitud",
    },
    {
      label: "Aseguradoras",
      value: formatNumber(quotes.length),
    },
  ]);

  drawSectionHeading(
    "Resumen ejecutivo",
    "Se presenta el detalle de vehiculos, el comparativo de primas y las coberturas.",
  );
  drawDetailRows([
    { label: "Cliente", value: customerName },
    { label: "Modalidad", value: getModeLabel(mode) },
    { label: "Vehiculos incluidos", value: `${formatNumber(vehicles.length)}` },
    {
      label: "Fecha de emision",
      value: format(generatedAt ? new Date(generatedAt) : new Date(), "dd/MM/yyyy HH:mm"),
    },
    {
      label: "Realizado por",
      value: generatedByName || "Usuario no disponible",
    },
    {
      label: "Correo del usuario",
      value: generatedByEmail || "Correo no disponible",
    },
  ]);

  drawTable({
    title: "Detalle de vehiculos",
    subtitle:
      "Informacion capturada para el cuadro comparativo vehicular.",
    headers: [
      "No.",
      "Origen",
      "Marca",
      "Tipo",
      "Modelo",
      "Año",
      "Valor asegurado",
    ],
    columnWidths: scaleWidths([28, 70, 88, 82, 98, 44, 122]),
    rows: vehicles.map((vehicle, index) => [
      `${index + 1}`,
      vehicle.origin ? VEHICLE_ORIGIN_LABELS[vehicle.origin] : "-",
      vehicle.brand || "-",
      vehicle.type ? VEHICLE_TYPE_LABELS[vehicle.type] : "-",
      vehicle.model || "-",
      vehicle.year || "-",
      formatCurrency(Number(vehicle.insuredValue || 0), "L"),
    ]),
  });

  drawTable({
    title: "Comparativo de aseguradoras",
    subtitle:
      "Comparacion de prima bruta, descuento, ISV, gastos de emision y total estimado.",
    headers: [
      "Aseguradora",
      "Prima bruta",
      "Desc.",
      "Prima neta",
      "ISV",
      "Gastos",
      "Total",
    ],
    columnWidths: scaleWidths([92, 65, 48, 67, 52, 55, 66]),
    rows: quotes.map((quote) => [
      quote.name,
      quote.grossPremium !== null ? formatCurrency(quote.grossPremium, "L") : "-",
      quote.discount ? formatCurrency(quote.discount, "L") : "-",
      quote.netPremium !== null ? formatCurrency(quote.netPremium, "L") : "-",
      quote.tax !== null ? formatCurrency(quote.tax, "L") : "-",
      quote.emission !== null ? formatCurrency(quote.emission, "L") : "-",
      quote.total !== null ? formatCurrency(quote.total, "L") : "-",
    ]),
  });

  drawTable({
    title: "Coberturas principales",
    headers: ["Cobertura", "Ficohsa", "Davivienda"],
    columnWidths: scaleWidths([300, 116, 116]),
    rows: baseCoverages.map((coverage) => [
      coverage.label,
      typeof coverage.ficohsa === "number"
        ? formatCurrency(coverage.ficohsa, "L")
        : coverage.ficohsa,
      typeof coverage.davivienda === "number"
        ? formatCurrency(coverage.davivienda, "L")
        : coverage.davivienda,
    ]),
  });

  if (specialCoverages.length > 0) {
    drawTable({
      title: "Coberturas especiales",
      headers: ["Cobertura", "Ficohsa", "Davivienda"],
      columnWidths: scaleWidths([300, 116, 116]),
      rows: specialCoverages.map((coverage) => [
        coverage.label,
        typeof coverage.ficohsa === "number"
          ? formatCurrency(coverage.ficohsa, "L")
          : coverage.ficohsa,
        typeof coverage.davivienda === "number"
          ? formatCurrency(coverage.davivienda, "L")
          : coverage.davivienda,
      ]),
    });
  }

  drawSectionHeading("Notas de referencia");
  drawTextBlock(
    `ISV aplicado: 15% sobre la prima neta. Gastos de emision: ${
      mode === "individual"
        ? "Ficohsa L 350 y el resto de aseguradoras L 500."
        : "no parametrizados en la hoja colectiva."
    }`,
    contentWidth,
    { size: 9, color: COLORS.muted },
  );
  y += 6;
  drawTextBlock(
    mode === "individual"
      ? "En la plantilla individual, Ficohsa refleja un descuento del 4% sobre la prima bruta."
      : "En la plantilla colectiva el comparativo visible esta parametrizado para Ficohsa y Davivienda.",
    contentWidth,
    { size: 9, color: COLORS.muted },
  );

  const totalPages = document.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    document.setPage(page);
    applyDrawColor(document, COLORS.border);
    document.line(
      PAGE_MARGIN,
      pageHeight - PAGE_MARGIN - 10,
      pageWidth - PAGE_MARGIN,
      pageHeight - PAGE_MARGIN - 10,
    );
    applyTextColor(document, COLORS.muted);
    document.setFont("helvetica", "normal");
    document.setFontSize(8);
    document.text(
      "Cuadro Comparativo | ISSA",
      PAGE_MARGIN,
      pageHeight - PAGE_MARGIN,
    );
    document.text(
      `Pagina ${page} de ${totalPages}`,
      pageWidth - PAGE_MARGIN,
      pageHeight - PAGE_MARGIN,
      { align: "right" },
    );
  }

  document.save(
    `vehiculos-${getSafeFilename(customerName) || "cliente"}-${mode}.pdf`,
  );
};
