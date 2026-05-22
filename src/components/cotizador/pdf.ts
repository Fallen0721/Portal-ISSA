import { format, parseISO } from "date-fns";
import { jsPDF } from "jspdf";
import {
  ComputedQuote,
  CotizacionFormData,
  PlanDefinition,
} from "../../types/models";
import { calculateTripDays, formatUSD, getTravelerCounts } from "./helpers";

export const generateQuotePdf = ({
  formData,
  selectedPlan,
  quotes,
}: {
  formData: CotizacionFormData;
  selectedPlan: PlanDefinition;
  quotes: ComputedQuote[];
}) => {
  const document = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 32;
  const pageWidth = document.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  const rankedQuotes = [...quotes].sort((a, b) => a.price - b.price);
  const tripDays = calculateTripDays(formData);
  const { adultCount, childCount } = getTravelerCounts(formData);
  const cheapestQuoteId = rankedQuotes[0]?.id;
  let y = margin;

  const drawRow = (label: string, value: string) => {
    document.setFont("helvetica", "bold");
    document.setFontSize(10);
    document.setTextColor(100, 116, 139);
    document.text(label.toUpperCase(), margin, y);

    document.setFont("helvetica", "normal");
    document.setFontSize(12);
    document.setTextColor(30, 41, 59);
    document.text(value, margin + 120, y);
    y += 22;
  };

  document.setFillColor(0, 90, 167);
  document.roundedRect(margin, y, contentWidth, 92, 16, 16, "F");
  document.setTextColor(255, 255, 255);
  document.setFont("helvetica", "bold");
  document.setFontSize(22);
  document.text("Cotizacion de Seguro de Viaje", margin + 20, y + 34);
  document.setFont("helvetica", "normal");
  document.setFontSize(11);
  document.text(
    `Emitida el ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
    margin + 20,
    y + 56,
  );
  document.text(`Titular: ${formData.fullName}`, margin + 20, y + 74);
  y += 120;

  drawRow("Plan", selectedPlan.name);
  drawRow("Destino", formData.destination);
  drawRow(
    "Fechas",
    `${format(parseISO(formData.departureDate), "dd/MM/yyyy")} - ${format(
      parseISO(formData.returnDate),
      "dd/MM/yyyy",
    )}`,
  );
  drawRow(
    "Grupo",
    `${formData.travelersCount} viajeros (A:${adultCount} / N:${childCount})`,
  );
  drawRow("Duracion", `${tripDays} dias`);
  drawRow("Correo", formData.email);
  drawRow("Telefono", formData.phone);
  y += 12;

  rankedQuotes.forEach((quote, index) => {
    const cardY = y + index * 138;
    const isHighlighted = quote.id === cheapestQuoteId;

    if (isHighlighted) {
      document.setFillColor(240, 253, 244);
      document.setDrawColor(22, 163, 74);
    } else {
      document.setFillColor(255, 255, 255);
      document.setDrawColor(226, 232, 240);
    }
    document.roundedRect(margin, cardY, contentWidth, 120, 14, 14, "FD");

    document.setTextColor(15, 23, 42);
    document.setFont("helvetica", "bold");
    document.setFontSize(14);
    document.text(`${quote.provider} - ${quote.productName}`, margin + 16, cardY + 24);
    document.setFontSize(10);
    document.setTextColor(100, 116, 139);
    document.text(
      isHighlighted ? "Recomendacion por precio" : quote.highlight || "Opcion disponible",
      margin + 16,
      cardY + 42,
    );

    document.setTextColor(0, 90, 167);
    document.setFont("helvetica", "bold");
    document.setFontSize(24);
    document.text(formatUSD(quote.price), margin + 16, cardY + 76);

    document.setTextColor(51, 65, 85);
    document.setFont("helvetica", "normal");
    document.setFontSize(10);
    document.text(
      `Cobertura medica: ${formatUSD(quote.coverageMedical)} | Equipaje: ${formatUSD(
        quote.coverageBaggage,
      )}`,
      margin + 16,
      cardY + 98,
    );
    document.text(
      `Cancelacion: ${formatUSD(
        quote.coverageCancellation,
      )} | Deducible: ${formatUSD(quote.deductible)}`,
      margin + 16,
      cardY + 114,
    );
  });

  const safeName = formData.fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();

  document.save(
    `cotizador-${safeName || "cliente"}-${formData.departureDate}.pdf`,
  );
};
