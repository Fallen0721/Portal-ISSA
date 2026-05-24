import { createGestionRouter } from "./gestion-factory.mjs";

export const ventasGeneralesRouter = createGestionRouter({
  tableName: "ventas_generales",
  area: "danos",
  allowedRoles: ["admin", "daños", "gerente_comercial"],
});
