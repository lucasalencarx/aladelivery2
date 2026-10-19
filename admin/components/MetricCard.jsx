import { TrendingUp } from "lucide-react";

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function MetricCard({
  title,
  value,
  growth,
  moneyValue = false,
}) {
  return (
    <article className="metricCard">
      <span className="metricCardLabel">{title}</span>

      <strong className="metricCardValue">
        {moneyValue ? money(value) : value}
      </strong>

      {growth !== undefined && (
        <div className="metricGrowth">
          <span>
            <TrendingUp size={11} />
            {growth}%
          </span>
        </div>
      )}

      <small>Em relação a ontem</small>
    </article>
  );
}
