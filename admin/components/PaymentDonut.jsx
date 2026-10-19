function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function PaymentDonut({ data }) {
  const pix = data[0]?.percentage ?? 65;
  const card = data[1]?.percentage ?? 25;
  const pixEnd = pix;
  const cardEnd = pix + card;

  const gradient = `conic-gradient(
    #111 0 ${pixEnd}%,
    #ffc400 ${pixEnd}% ${cardEnd}%,
    #c7c7c7 ${cardEnd}% 100%
  )`;

  return (
    <div className="paymentDonutWrap">
      <div className="paymentDonut" style={{ background: gradient }}>
        <div />
      </div>

      <div className="paymentLegend">
        {data.map((item, index) => (
          <div key={item.name} className="paymentLegendRow">
            <span
              className={`paymentColor paymentColor${index + 1}`}
            />
            <div>
              <strong>{item.name}</strong>
              <small>{money(item.amount)}</small>
            </div>
            <b>{item.percentage}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}
