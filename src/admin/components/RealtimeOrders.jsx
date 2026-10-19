import { ChevronRight } from "lucide-react";
import StatusBadge from "./StatusBadge";

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function RealtimeOrders({ orders = [] }) {
  return (
    <article className="dashboardCard realtimeCard">
      <div className="cardHeadingRow">
        <div>
          <strong>Pedidos em Tempo Real</strong>
          <span className="newOrdersBadge">12 novos</span>
        </div>

        <select defaultValue="all">
          <option value="all">Todos</option>
          <option value="new">Novos</option>
          <option value="preparing">Preparando</option>
        </select>
      </div>

      <div className="realtimeList">
        {orders.map((order) => (
          <div className="realtimeOrder" key={order.id}>
            <div className="realtimeOrderMain">
              <div className="orderCodeLine">
                <strong>{order.id}</strong>
                <StatusBadge>{order.status}</StatusBadge>
              </div>

              <b>{order.customer}</b>
              <span>
                {order.items} itens • {money(order.total)}
              </span>
              <small>Entrega • {order.distance}</small>
            </div>

            <div className="realtimeOrderSide">
              <small>{order.time}</small>
              <button type="button">
                Ver pedido
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="fullSoftButton">
        Ver todos os pedidos
        <ChevronRight size={13} />
      </button>
    </article>
  );
}
