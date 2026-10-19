import { Lock, Settings } from "lucide-react";
import { useAdmin } from "../context/AdminContext";

export default function StoreStatusCard() {
  const { storeOpen, setStoreOpen } = useAdmin();

  return (
    <article className="dashboardCard storeStatusCard">
      <strong className="dashboardCardTitle">Status da Loja</strong>

      <span className={`storePill ${storeOpen ? "open" : "closed"}`}>
        {storeOpen ? "Aberta" : "Fechada"}
      </span>

      <p>Desde 08:00 • 07/08/2026</p>

      <button
        type="button"
        className="yellowAction"
        onClick={() => setStoreOpen((value) => !value)}
      >
        {storeOpen ? "Fechar Loja" : "Abrir Loja"}
        <Lock size={12} />
      </button>

      <button type="button" className="softAction">
        Configurações da Loja
        <Settings size={13} />
      </button>
    </article>
  );
}
