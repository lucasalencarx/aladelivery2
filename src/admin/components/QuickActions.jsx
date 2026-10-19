import {
  BarChart3,
  FileDown,
  Gift,
  PackagePlus,
  Settings2,
  Ticket,
} from "lucide-react";

const actions = [
  { label: "Novo Produto", icon: PackagePlus },
  { label: "Nova Oferta", icon: Gift },
  { label: "Gerenciar Bebidas", icon: Settings2 },
  { label: "Meus Cupons", icon: Ticket },
  { label: "Relatório de Vendas", icon: BarChart3 },
  { label: "Exportar Dados", icon: FileDown },
];

export default function QuickActions() {
  return (
    <article className="dashboardCard quickActionsCard">
      <strong className="dashboardCardTitle">Ações Rápidas</strong>

      <div className="quickActionsGrid">
        {actions.map(({ label, icon: Icon }) => (
          <button type="button" key={label}>
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </article>
  );
}
