import { createGestionRouter } from "./gestion-factory.mjs";

export const ventasSaludRouter = createGestionRouter({
  tableName: "ventas_salud",
  area: "personas",
  allowedRoles: ["admin", "personas", "gerente_comercial"],
});
