import {OperationsProvider} from '../context/OperationsContext';
import OrderAlerts from './OrderAlerts';
import { Outlet } from "react-router-dom";
import { AdminProvider } from "../context/AdminContext";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import "./admin.css";
import "./management.css";
import "./operations.css";
import AdminAccessGate from "./AdminAccessGate";

export default function AdminLayout() {
  return (
    <AdminAccessGate><AdminProvider><OperationsProvider>
      <div className="alaAdmin">
        <AdminSidebar />

        <div className="alaAdminMain">
          <AdminHeader />

          <main className="alaAdminContent">
            <OrderAlerts />
            <Outlet />
          </main>
        </div>
      </div>
    </OperationsProvider></AdminProvider></AdminAccessGate>
  );
}
