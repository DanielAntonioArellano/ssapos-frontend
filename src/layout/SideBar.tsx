import styles from "./layout.module.css";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, Package,
  Users, Settings, BookOpenCheck, PackageSearch, X, Printer
} from "lucide-react";
import { useRole } from "../hooks/useRole";
import MeseroPage from "../modules/mesero/meseroPage";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { can, isSuperAdmin } = useRole();
  const location = useLocation();
  const navigate = useNavigate();

  const restaurant = user?.restaurant;
  const initials = restaurant?.name
    ? restaurant.name.slice(0, 2).toUpperCase()
    : "PO";

  const allNavItems = [
    { label: "Panel Principal", icon: LayoutDashboard, path: "/dashboard", show: can.verCaja },
    //{ label: "Panel Mesero",    icon: MeseroPage,      path: "/mesero", show: can.verMesero },
    { label: "Ordenes",         icon: ClipboardList,   path: "/orders",    show: true },
    { label: "Mesas",           icon: ClipboardList,   path: "/tables",    show: true },
    { label: "Productos",       icon: PackageSearch,   path: "/products",  show: can.verProductos },
    { label: "Inventario",      icon: Package,         path: "/inventory", show: can.verInventario },
    { label: "Reportes",        icon: BookOpenCheck,   path: "/reportes",  show: can.verReportes },
    { label: "Usuarios",        icon: Users,           path: "/users",     show: can.verUsuarios },
    { label: "Clientes",        icon: Users,           path: "/Customers", show: can.verClientes },
    { label: "Impresoras",      icon: Printer,         path: "/printers",  show: can.verUsuarios },
  ];

  // SuperAdmin ve todo
  const navItems = allNavItems.filter(item => isSuperAdmin || item.show);

  function handleNav(path: string) {
    navigate(path);
    onClose();
  }

  return (
    <div className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}>
      {/* Botón cerrar — solo visible en móvil */}
      <button className={styles.sidebarCloseBtn} onClick={onClose}>
        <X size={18} />
      </button>

      <div>
        <div className={styles.logoBlock}>
          <div className={styles.logoCircle}>{initials}</div>
          <div>
            <h3>{restaurant?.name ?? "Mi Restaurante"}</h3>
            <span>{restaurant?.address ?? "POS Console"}</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <button
                key={item.label}
                onClick={() => handleNav(item.path)}
                className={`${styles.navItem} ${active ? styles.active : ""}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {active && <div className={styles.activeIndicator} />}
              </button>
            );
          })}
        </nav>
      </div>

      <div className={styles.footer}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{user?.name}</p>
          <span style={{ fontSize: 11, opacity: 0.5 }}>{user?.email ?? ""}</span>
        </div>
        <button onClick={logout} className={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </div>
  );
}