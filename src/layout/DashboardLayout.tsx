import { Outlet } from "react-router-dom";
import Sidebar from "./SideBar";
import Topbar from "./TopBar";
import styles from "./layout.module.css";
import { useCaja } from "../context/CajaContext";
import AbrirCajaModal from "../modules/caja/AbrirCajaModal";
import { useState } from "react";

export default function DashboardLayout({ children }: any) {
  const { caja, loading, refreshCaja } = useCaja();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) return null;

  return (
    <div className={styles.wrapper}>
      {/* Overlay para cerrar sidebar en móvil */}
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {!caja && <AbrirCajaModal onSuccess={refreshCaja} />}

      <div className={styles.main}>
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}