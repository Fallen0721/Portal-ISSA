import { GestionModule } from "../../components/gestion/GestionModule";
import { VentasVidaService } from "../../services/ventasVida.service";

export const GestionVidaPage = () => (
  <GestionModule
    title="Gestión Vida"
    formLabel="Vida"
    statusArea="personas"
    productArea="vida"
    service={VentasVidaService}
    storageKey="pvida"
  />
);
