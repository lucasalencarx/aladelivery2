export const dashboardMetrics = {
  ordersToday: 128,
  revenueToday: 2458.9,
  averageTicket: 19.21,
  visitorsToday: 842,
  ordersGrowth: 18,
  revenueGrowth: 22,
  ticketGrowth: 8,
  visitorsGrowth: 15,
};

export const overviewData = [
  { label: "00:00", revenue: 140, orders: 80 },
  { label: "02:00", revenue: 120, orders: 90 },
  { label: "04:00", revenue: 220, orders: 120 },
  { label: "06:00", revenue: 360, orders: 180 },
  { label: "08:00", revenue: 780, orders: 420 },
  { label: "10:00", revenue: 1240, orders: 720 },
  { label: "12:00", revenue: 1720, orders: 1080 },
  { label: "14:00", revenue: 2280, orders: 1190 },
  { label: "16:00", revenue: 2190, orders: 1420 },
  { label: "18:00", revenue: 2640, orders: 1600 },
  { label: "20:00", revenue: 2460, orders: 1490 },
  { label: "22:00", revenue: 2140, orders: 1420 },
  { label: "23:59", revenue: 1760, orders: 1210 },
];

export const paymentData = [
  { name: "PIX", percentage: 65, amount: 1598.29 },
  { name: "Cartão", percentage: 25, amount: 614.72 },
  { name: "Dinheiro", percentage: 10, amount: 245.89 },
];

export const realtimeOrders = [
  { id: "#1258", customer: "João Silva", items: 2, total: 36.5, distance: "3,2 km", status: "Novo", time: "11:42" },
  { id: "#1257", customer: "Maria Souza", items: 4, total: 78.9, distance: "2,1 km", status: "Novo", time: "11:41" },
  { id: "#1256", customer: "Carlos Lima", items: 3, total: 45.7, distance: "1,3 km", status: "Preparando", time: "11:40" },
  { id: "#1255", customer: "Ana Beatriz", items: 5, total: 92.3, distance: "4,7 km", status: "Saiu para entrega", time: "11:38" },
  { id: "#1254", customer: "Fernanda Dias", items: 2, total: 28.6, distance: "2,8 km", status: "Entregue", time: "11:30" },
];

export const topProducts = [
  { name: "Amstel 350ml", sales: 156, revenue: 780, emoji: "🍺" },
  { name: "Skol 350ml", sales: 132, revenue: 660, emoji: "🥫" },
  { name: "Coca-Cola 2L", sales: 98, revenue: 490, emoji: "🥤" },
  { name: "Red Bull 250ml", sales: 85, revenue: 425, emoji: "🥫" },
  { name: "Heineken 330ml", sales: 74, revenue: 370, emoji: "🍺" },
];

export const topCustomers = [
  { name: "João Silva", orders: 12, revenue: 456.8 },
  { name: "Maria Souza", orders: 9, revenue: 389.4 },
  { name: "Carlos Lima", orders: 8, revenue: 312.5 },
  { name: "Ana Beatriz", orders: 7, revenue: 298.7 },
  { name: "Fernanda Dias", orders: 6, revenue: 245.6 },
];
