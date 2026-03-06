import styles from "./layout.module.css";
import { useAuth } from "../context/AuthContext";
import { useCaja } from "../context/CajaContext";
import { useRole } from "../hooks/useRole";
import { useState } from "react";
import CerrarCajaModal from "../modules/caja/CerrarCajaModal";
import { apiRequest } from "../services/api";
import { useToast } from "../context/ToastContext";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useAuth();
  const { caja } = useCaja();
  const { can } = useRole();
  const { toast } = useToast();
  const [showCerrar, setShowCerrar] = useState(false);
  const [checking, setChecking] = useState(false);

  const restaurant = user?.restaurant;

  async function handleClickCerrar() {
    try {
      setChecking(true);
      const ordenes = await apiRequest("/orders?status=ORDERED");
      const pendientes = Array.isArray(ordenes) ? ordenes.length : 0;

      if (pendientes > 0) {
        toast(
          `Tienes ${pendientes} orden(es) pendiente(s). Complétalas o cancélalas antes de cerrar la caja.`,
          "warning"
        );
        return;
      }

      setShowCerrar(true);
    } catch (err: any) {
      toast(err.message ?? "Error al verificar órdenes", "error");
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <div className={styles.topbar}>

        {/* Botón hamburguesa — solo visible en móvil vía CSS */}
        <button className={styles.menuBtn} onClick={onMenuClick}>
          <span />
          <span />
          <span />
        </button>

        <div className={styles.topbarLeft}>
          <h3 className={styles.topbarTitle}>{restaurant?.name ?? ""}</h3>
          {restaurant?.address && (
            <span className={styles.topbarSub}>📍 {restaurant.address}</span>
          )}
        </div>

        <div className={styles.topbarRight}>
          {restaurant?.phone && (
            <div className={styles.topbarBadge}>📞 {restaurant.phone}</div>
          )}

          {/* Estado de caja — visible para CAJERO y ADMIN */}
          {can.verCaja && (
            <div className={caja ? styles.cajaOpen : styles.cajaClosed}>
              <span className={styles.cajaDot} />
              {caja ? "Caja abierta" : "Caja cerrada"}
            </div>
          )}

          {/* Botón cerrar caja — solo CAJERO */}
          {caja && can.cerrarCaja && (
            <button
              className={styles.cerrarCajaBtn}
              onClick={handleClickCerrar}
              disabled={checking}
            >
              {checking ? "Verificando..." : "Cerrar Caja"}
            </button>
          )}

          {user && (
            <div className={styles.avatar}>
              {user.name?.charAt(0).toUpperCase() ?? "U"}
            </div>
          )}
        </div>
      </div>

      {showCerrar && (
        <CerrarCajaModal onCancel={() => setShowCerrar(false)} />
      )}
    </>
  );
}