import {usePublicStoreSettings} from '../../services/storeSettings';
import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Gift,
  LogOut,
  MenuSquare,
  Package,
  Settings,
  ShoppingBag,
  Star,
  Store,
  Tag,
  Ticket,
  Truck,
  Users,
  X,
  Layers3,
} from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { supabase } from "../../supabase/supabase";
import logoMarca from "../../assets/images/logoadmin.png";
const directItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/admin/orders", label: "Pedidos", icon: ClipboardList },
];

const lowerItems = [
  { to: "/admin/loyalty", label: "Quem mais compra", icon: Gift },
  { to: "/admin/delivery-zones", label: "Taxas de entrega", icon: Truck },
  { to: "/admin/catalog", label: "Biblioteca de Fotos", icon: Package },
  { to: "/admin/offers", label: "Ofertas e Seções", icon: Gift },
  { to: "/admin/customers", label: "Clientes", icon: Users },
  { to: "/admin/reports", label: "Relatórios", icon: FileText },
  { to: "/admin/billing", label: "Faturamento", icon: CircleDollarSign },
  { to: "/admin/coupons", label: "Cupons", icon: Ticket },
  { to: "/admin/couriers", label: "Entregadores", icon: Truck },
  { to: "/admin/reviews", label: "Avaliações", icon: Star },
  { to: "/admin/settings", label: "Configurações", icon: Settings },
];

export default function AdminSidebar() {
  const brand=usePublicStoreSettings()?.settings;
  const [catalogOpen, setCatalogOpen] = useState(true);
  const { sidebarOpen, setSidebarOpen } = useAdmin();

  return (
    <>
      <button
        type="button"
        className={`adminSidebarBackdrop ${sidebarOpen ? "show" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-label="Fechar menu"
      />

      <aside className={`adminSidebar ${sidebarOpen ? "mobileOpen" : ""}`}>
        <div className="adminSidebarBrand">

  <img
    src={brand?.logo_url||logoMarca}
    alt="Ala Delivery"
    className="adminSidebarLogo"
  />

  <button
    type="button"
    className="adminSidebarCloseMobile"
    onClick={() => setSidebarOpen(false)}
    aria-label="Fechar menu"
  >
    <X size={20} />
  </button>

</div>

        <nav className="adminNav">
          {directItems.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `adminNavItem ${isActive ? "active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {badge && <b className="adminNavBadge">{badge}</b>}
            </NavLink>
          ))}

          <button
            type="button"
            className="adminNavItem adminNavParent"
            onClick={() => setCatalogOpen((value) => !value)}
          >
            <BookOpen size={17} />
            <span>Cardápio</span>
            <ChevronDown
              size={15}
              className={catalogOpen ? "rotated" : ""}
            />
          </button>

          <div className={`adminNavSubmenu ${catalogOpen ? "open" : ""}`}>
            <NavLink to="/admin/products" onClick={() => setSidebarOpen(false)}>
              <Package size={15} />
              Produtos
            </NavLink>

            <NavLink to="/admin/categories" onClick={() => setSidebarOpen(false)}>
              <Layers3 size={15} />
              Categorias
            </NavLink>

            <NavLink to="/admin/brands" onClick={() => setSidebarOpen(false)}>
              <Tag size={15} />
              Marcas
            </NavLink>
          </div>

          {lowerItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `adminNavItem ${isActive ? "active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="adminSidebarFooter">
          <div className="adminUserCard">
            <div className="adminAvatar">LA</div>
            <div>
              <strong>Lucas Alencar</strong>
              <span>Administrador</span>
            </div>
          </div>

          <button type="button" className="adminLogout" onClick={() => supabase.auth.signOut()}>
            <LogOut size={17} />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
