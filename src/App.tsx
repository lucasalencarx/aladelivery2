import "./App.css";
import MyOrders from './storefront/MyOrders';
import OrderTracking from "./storefront/OrderTracking";
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AgeRestriction from './storefront/AgeRestriction';
import Storefront from "./storefront/Storefront";
const CustomerAuthReturn=lazy(()=>import('./storefront/CustomerAuthReturn'));
const CourierApp=lazy(()=>import('./courier/CourierApp'));
const AdminRoutes = lazy(() => import("./admin/AdminRoutes"));
export default function App() {
 return <Routes><Route path="/conta/retorno" element={<Suspense fallback={<p>Confirmando acesso…</p>}><CustomerAuthReturn/></Suspense>}/><Route path="/entregador/*" element={<Suspense fallback={<p>Carregando entregas…</p>}><CourierApp/></Suspense>}/><Route path="/pedidos" element={<MyOrders/>}/><Route path="/rastrear" element={<OrderTracking/>}/><Route path="/" element={<Storefront/>}/><Route path="/acesso-restrito" element={<AgeRestriction/>}/><Route path="/admin/*" element={<Suspense fallback={<p role="status">Carregando painel…</p>}><AdminRoutes/></Suspense>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>;
}
