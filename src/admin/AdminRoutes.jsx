import { Navigate, Route, Routes } from "react-router-dom";

import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminOrders from "./pages/AdminOrders";
import AdminProducts from "./pages/AdminProducts";
import AdminCategories from "./pages/AdminCategories";
import AdminBrands from "./pages/AdminBrands";
import AdminOffers from "./pages/AdminOffers";
import AdminCatalog from "./pages/AdminCatalog";
import AdminCustomers from "./pages/AdminCustomers";
import AdminReports from "./pages/AdminReports";
import AdminBilling from "./pages/AdminBilling";
import AdminCoupons from "./pages/AdminCoupons";
import AdminCouriers from "./pages/AdminCouriers";
import AdminReviews from "./pages/AdminReviews";
import AdminSettings from "./pages/AdminSettings";

import AdminDeliveryZones from './pages/AdminDeliveryZones';
import AdminLoyalty from './pages/AdminLoyalty';
export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="catalog" element={<AdminCatalog />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="brands" element={<AdminBrands />} />
        <Route path="offers" element={<AdminOffers />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="billing" element={<AdminBilling />} />
        <Route path="loyalty" element={<AdminLoyalty/>}/><Route path="coupons" element={<AdminCoupons />} />
        <Route path="delivery-zones" element={<AdminDeliveryZones />} />
        <Route path="couriers" element={<AdminCouriers />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="store" element={<Navigate to="/admin/settings" replace />} />
        <Route path="users" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="logs" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
