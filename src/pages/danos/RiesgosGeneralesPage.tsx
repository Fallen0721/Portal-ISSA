import { GestionModule } from "../../components/gestion/GestionModule";
import { VentasGeneralesService } from "../../services/ventasGenerales.service";

export const RiesgosGeneralesPage = () => (
  <GestionModule
    title="Riesgos Generales"
    formLabel="Riesgos Generales"
    statusArea="danos"
    productArea="daños"
    service={VentasGeneralesService}
    storageKey="pgenerales"
  />
);
