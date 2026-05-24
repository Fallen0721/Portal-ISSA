import { GestionModule } from "../../components/gestion/GestionModule";
import { VentasSaludService } from "../../services/ventasSalud.service";

export const GestionSaludPage = () => (
  <GestionModule
    title="Gestión Salud (Gastos Médicos)"
    formLabel="Salud"
    statusArea="personas"
    productArea="salud"
    service={VentasSaludService}
    storageKey="psalud"
  />
);
