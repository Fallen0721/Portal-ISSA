import { createGestionRouter } from "./gestion-factory.mjs";

export const ventasVidaRouter = createGestionRouter({
  tableName: "ventas_vida",
  area: "personas",
  allowedRoles: ["admin", "personas", "gerente_comercial"],
});
