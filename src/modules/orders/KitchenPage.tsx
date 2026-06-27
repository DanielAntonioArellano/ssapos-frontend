import { useEffect, useState, useCallback } from "react";
import { apiRequest } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import styles from "./kitchen.module.css";

// ---------------------------------------------------
// Types
// ---------------------------------------------------
type OrderStatus = "ORDERED" | "PREPARATION" | "DELIVERY" | "COMPLETED" | "CANCELLED";
type OrderType = "DELIVERY" | "DINE_IN" | "TAKEAWAY";

type OrderItem = {
  id: number;
  productId: number | null;
  customName: string | null;
  notes: string | null;
  quantity: number;
  priceUnit: number;
  subtotal: number;
  product?: { name: string };
};

type Order = {
  id: number;
  status: OrderStatus;
  type: OrderType;
  tableNumber: number | null;
  clientName: string | null;
  clientPhone: string | null;
  clientNotes: string | null;
  createdAt: string;
  items: OrderItem[];
};

// ---------------------------------------------------
// Helpers
// ---------------------------------------------------
function getElapsed(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function isLate(createdAt: string): boolean {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  return mins >= 15;
}

// ---------------------------------------------------
// Order Card
// ---------------------------------------------------
function OrderCard({ order, onStatusChange }: {
  order: Order;
  onStatusChange: (id: number, status: "PREPARATION" | "DELIVERY" | "ORDERED" ) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const isPrep = order.status === "PREPARATION";

  async function handleChange(newStatus: "PREPARATION" | "DELIVERY" | "ORDERED" ) {
    setLoading(true);
    await onStatusChange(order.id, newStatus);
    setLoading(false);
  }

  const elapsed = getElapsed(order.createdAt);
  const late = isLate(order.createdAt);

  return (
    <div className={`${styles.card} ${isPrep ? styles.cardPrep : ""}`}>
      {/* Header */}
      <div className={`${styles.cardHeader} ${isPrep ? styles.cardHeaderPrep : ""}`}>
        <div className={styles.cardHeaderLeft}>
          <span className={styles.orderNum}>Orden #{order.id}</span>
          <div className={styles.cardMeta}>
            {order.type === "DINE_IN" ? (
              <span className={styles.badgeDine}>Mesa {order.tableNumber ?? "-"}</span>
            ) : (
              <span className={styles.badgeDelivery}>Domicilio</span>
            )}
            <span className={late ? styles.timerLate : styles.timerOk}>
              {elapsed}
            </span>
          </div>
        </div>
        <span className={`${styles.statusBadge} ${isPrep ? styles.statusPrep : styles.statusOrdered}`}>
          {isPrep ? "En preparación" : "Ordenado"}
        </span>
      </div>

      {/* Body */}
      <div className={styles.cardBody}>
        {order.items.map((item, i) => (
          <div key={item.id ?? i} className={styles.itemRow}>
            <div className={styles.itemMain}>
              <span className={styles.itemQty}>{item.quantity}</span>
              <span className={styles.itemName}>
                {item.product?.name ?? item.customName ?? "Producto"}
              </span>
            </div>
            {item.notes && (
              <div className={styles.itemNote}>
                ✎ {item.notes}
              </div>
            )}
          </div>
        ))}

        {/* Notas del cliente o datos de entrega */}
        {(order.clientNotes || order.clientName || order.clientPhone) && (
          <>
            <div className={styles.divider} />
            <div className={styles.clientSection}>
              {(order.clientName || order.clientPhone) && (
                <div className={styles.clientRow}>
                  <span className={styles.clientIcon}>👤</span>
                  <span>{[order.clientName, order.clientPhone].filter(Boolean).join(" · ")}</span>
                </div>
              )}
              {order.clientNotes && (
                <div className={styles.clientRow}>
                  <span className={styles.clientIcon}>📝</span>
                  <span>{order.clientNotes}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className={styles.cardFooter}>
        {!isPrep ? (
          <button
            className={styles.btnPrep}
            onClick={() => handleChange("PREPARATION")}
            disabled={loading}
          >
            {loading ? "..." : "En preparación"}
          </button>
        ) : (
          <>
            <button
              className={styles.btnBack}
              onClick={() => handleChange("ORDERED")}
              disabled={loading}
            >
              ← Regresar
            </button>
            <button
              className={styles.btnDone}
              onClick={() => handleChange("DELIVERY")}
              disabled={loading}
            >
              {loading ? "..." : "Listo / Entregado"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------
// Main Page
// ---------------------------------------------------
export default function KitchenPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "ORDERED" | "PREPARATION">("ALL");
  const [tick, setTick] = useState(0);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await apiRequest(
        "/orders"
      );
      // Filtrar solo ORDERED y PREPARATION
      const active = (data as Order[]).filter(
        (o) => o.status === "ORDERED" || o.status === "PREPARATION"
      );
      // Ordenar: ORDERED primero, luego por fecha
      active.sort((a, b) => {
        if (a.status === b.status) {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return a.status === "ORDERED" ? -1 : 1;
      });
      setOrders(active);
    } catch {
      // silencioso para no interrumpir la cocina
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh cada 15 segundos
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders();
      setTick((t) => t + 1);
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Actualizar timers cada 30 segundos sin llamar al API
  useEffect(() => {
    const timerInterval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timerInterval);
  }, []);

  async function handleStatusChange(
    orderId: number,
    newStatus: "PREPARATION" | "DELIVERY" | "ORDERED"
  ) {
    try {
      await apiRequest(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchOrders();
      if (newStatus === "DELIVERY") {
        toast(`Orden #${orderId} lista para entrega`, "success");
      }
    } catch (err: any) {
      toast(err.message ?? "Error al cambiar estado", "error");
    }
  }

  const filtered = orders.filter((o) => {
    if (filter === "ORDERED") return o.status === "ORDERED";
    if (filter === "PREPARATION") return o.status === "PREPARATION";
    return true;
  });

  const countOrdered = orders.filter((o) => o.status === "ORDERED").length;
  const countPrep = orders.filter((o) => o.status === "PREPARATION").length;

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <p>Cargando órdenes...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Panel de cocina</h1>
          <p className={styles.subtitle}>Órdenes activas · actualiza cada 15s</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchOrders}>
          ↻ Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${filter === "ALL" ? styles.tabActive : ""}`}
          onClick={() => setFilter("ALL")}
        >
          Todas
          <span className={styles.countBadge}>{orders.length}</span>
        </button>
        <button
          className={`${styles.tab} ${filter === "ORDERED" ? styles.tabActive : ""}`}
          onClick={() => setFilter("ORDERED")}
        >
          Ordenado
          <span className={`${styles.countBadge} ${styles.countOrdered}`}>{countOrdered}</span>
        </button>
        <button
          className={`${styles.tab} ${filter === "PREPARATION" ? styles.tabActive : ""}`}
          onClick={() => setFilter("PREPARATION")}
        >
          En preparación
          <span className={`${styles.countBadge} ${styles.countPrep}`}>{countPrep}</span>
        </button>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>No hay órdenes activas</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}