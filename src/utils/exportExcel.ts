import { format, parseISO } from "date-fns";
import * as XLSX from "xlsx";
import { Venta } from "../types/models";

const dateCell = (iso: string | null | undefined): string => {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "dd/MM/yyyy");
  } catch {
    return "";
  }
};

const HEADERS = [
  "No. Póliza",
  "Fecha Ingreso",
  "Fecha Vigencia",
  "Fecha Cierre",
  "Días en Proceso",
  "Asegurado",
  "Vendedor",
  "Tipo",
  "Producto",
  "Compañía",
  "Status",
  "Moneda",
  "Suma Asegurada",
  "Prima Neta Anual",
  "Canal",
  "Alianza",
  "Observaciones",
];

export const exportVentasToExcel = (ventas: Venta[], filename = "gestiones") => {
  const rows = ventas.map((v) => [
    v.no,
    dateCell(v.fechaIngreso),
    dateCell(v.fechaVigencia),
    dateCell(v.fechaCierre),
    v.diasProceso,
    v.asegurado,
    v.vendedor,
    v.tipo,
    v.producto,
    v.compania,
    v.status,
    v.moneda,
    v.sumaAsegurada,
    v.primaNetaAnual,
    v.canal,
    v.alianza ?? "",
    v.observaciones ?? "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);

  // Column widths
  ws["!cols"] = [
    { wch: 18 }, // No. Póliza
    { wch: 14 }, // Fecha Ingreso
    { wch: 14 }, // Fecha Vigencia
    { wch: 14 }, // Fecha Cierre
    { wch: 14 }, // Días en Proceso
    { wch: 28 }, // Asegurado
    { wch: 22 }, // Vendedor
    { wch: 12 }, // Tipo
    { wch: 14 }, // Producto
    { wch: 18 }, // Compañía
    { wch: 30 }, // Status
    { wch: 8 },  // Moneda
    { wch: 16 }, // Suma Asegurada
    { wch: 16 }, // Prima Neta Anual
    { wch: 18 }, // Canal
    { wch: 20 }, // Alianza
    { wch: 36 }, // Observaciones
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Gestiones");

  XLSX.writeFile(wb, `${filename}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
};
