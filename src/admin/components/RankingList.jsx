function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function RankingList({
  title,
  items,
  type = "product",
  buttonLabel,
}) {
  return (
    <article className="dashboardCard rankingCard">
      <strong className="dashboardCardTitle">{title}</strong>

      <div className="rankingList">
        {items.map((item, index) => (
          <div className="rankingRow" key={item.name}>
            <span className={`rankingNumber rank${index + 1}`}>
              {index + 1}
            </span>

            {type === "product" ? (
              <div className="rankingThumb">{item.emoji}</div>
            ) : (
              <div className="rankingAvatar">
                {item.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")}
              </div>
            )}

            <div className="rankingInfo">
              <strong>{item.name}</strong>
              <span>
                {type === "product"
                  ? `${item.sales} vendas`
                  : `${item.orders} pedidos`}
              </span>
            </div>

            <b>{money(item.revenue)}</b>
          </div>
        ))}
      </div>

      <button type="button" className="fullSoftButton">
        {buttonLabel}
      </button>
    </article>
  );
}
