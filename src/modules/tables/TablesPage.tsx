import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import styles from "./tables.module.css";
import CheckoutModal from "../pos/CheckOutModal";

// ---------------------------------------------------
// Types
// ---------------------------------------------------
type OrderItem = {
  id: number;
  productId?: number;
  customName?: string;
  name?: string;
  quantity: number;
  priceUnit?: number;
  priceSell?: number;
  subtotal?: number;
  product?: { name: string };
};

type Order = {
  id: number;
  tableNumber: number;
  total: number;
  status: string;
  type: string;
  createdAt?: string;
  clientNotes?: string;
  items?: OrderItem[];
};

// ---------------------------------------------------
// Status config
// ---------------------------------------------------
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  ORDERED:     { label: "Ordenado",   color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  PREPARATION: { label: "Preparando", color: "#1e40af", bg: "#dbeafe", dot: "#3b82f6" },
  DELIVERY:    { label: "En camino",  color: "#5b21b6", bg: "#ede9fe", dot: "#8b5cf6" },
  COMPLETED:   { label: "Completado", color: "#14532d", bg: "#dcfce7", dot: "#22c55e" },
  CANCELLED:   { label: "Cancelado",  color: "#7f1d1d", bg: "#fee2e2", dot: "#ef4444" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "#475569", bg: "#f1f5f9", dot: "#94a3b8" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "3px 10px", borderRadius: "999px",
      background: cfg.bg, color: cfg.color,
      fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------
// Cancel Modal
// ---------------------------------------------------
interface CancelModalProps {
  orderId: number;
  onClose: () => void;
  onSuccess: () => void;
}

function CancelOrderModal({ orderId, onClose, onSuccess }: CancelModalProps) {
  const [concepto, setConcepto] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const { toast } = useToast();

  async function handleCancel() {
    if (!concepto.trim()) { setError("Ingresa el motivo de cancelación"); return; }
    if (!password.trim()) { setError("Ingresa la contraseña de administrador"); return; }
    try {
      setLoading(true); setError(null);
      await apiRequest(`/orders/${orderId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ concepto, adminPassword: password }),
      });
      toast(`Orden #${orderId} cancelada`, "success");
      onSuccess();
    } catch (err: any) {
      setError(err.message ?? "Error al cancelar la orden");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox}>
        <h3 className={styles.modalTitle}>Cancelar Orden #{orderId}</h3>
        <p className={styles.modalSubtitle}>Ingresa el motivo y la contraseña de un administrador para confirmar.</p>
        {error && <div className={styles.errorMsg}>{error}</div>}
        <input className={styles.modalInput} type="text" placeholder="Motivo de cancelación" value={concepto} onChange={(e) => setConcepto(e.target.value)} autoFocus />
        <input className={styles.modalInput} type="password" placeholder="Contraseña de administrador" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCancel()} style={{ marginTop: "0.75rem" }} />
        <div className={styles.modalActions}>
          <button className={styles.secondaryBtn} onClick={onClose} disabled={loading}>Cerrar</button>
          <button className={styles.deleteBtn} onClick={handleCancel} disabled={loading}>{loading ? "Cancelando..." : "Confirmar cancelación"}</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------
// Order Card (expandible)
// ---------------------------------------------------
function OrderCard({
  order, user, onEdit, onReprint, onCheckout, onCancel, finished,
}: {
  order: Order;
  user: any;
  onEdit: (id: number) => void;
  onReprint: (id: number) => void;
  onCheckout: (order: Order) => void;
  onCancel: (id: number) => void;
  finished?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const time = order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
    : null;

  const items = order.items ?? [];

  return (
    <div className={styles.orderCard} style={{ borderLeft: `4px solid ${STATUS_CONFIG[order.status]?.dot ?? "#94a3b8"}` }}>
      {/* Top row */}
      <div className={styles.orderTop} onClick={() => setExpanded((e) => !e)} style={{ cursor: "pointer" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span className={styles.orderId}>Orden #{order.id}</span>
          {time && <span style={{ fontSize: "11px", color: "#94a3b8" }}>{time}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <StatusBadge status={order.status} />
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expandible: productos + notas */}
      {expanded && (
        <div className={styles.itemsDetail}>
          {order.clientNotes && (
            <div style={{ padding: "6px 10px", background: "#fffbeb", borderRadius: "8px", marginBottom: "6px", fontSize: "12px", color: "#92400e" }}>
              📝 {order.clientNotes}
            </div>
          )}
          {items.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>Sin productos</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ textAlign: "left", padding: "4px 6px", color: "#64748b", fontWeight: 600 }}>Producto</th>
                  <th style={{ textAlign: "center", padding: "4px 6px", color: "#64748b", fontWeight: 600 }}>Cant.</th>
                  <th style={{ textAlign: "right", padding: "4px 6px", color: "#64748b", fontWeight: 600 }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const name     = item.product?.name ?? item.customName ?? item.name ?? "Producto";
                  const qty      = item.quantity;
                  const price    = item.priceUnit ?? item.priceSell ?? 0;
                  const subtotal = item.subtotal ?? price * qty;
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "5px 6px", color: "#0f172a" }}>{name}</td>
                      <td style={{ padding: "5px 6px", textAlign: "center", color: "#475569" }}>{qty}</td>
                      <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>${subtotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Bottom row */}
      <div className={styles.orderBottom}>
        <span className={styles.orderTotal}>${order.total.toFixed(2)}</span>
        <div className={styles.actions}>
          {!finished && (
            <>
              {(user?.role === "ADMIN" || user?.role === "CAJERO") && order.status === "ORDERED" && (
                <button className={styles.secondaryBtn} onClick={() => onEdit(order.id)}>✏️ Editar</button>
              )}
              <button className={styles.secondaryBtn} onClick={() => onReprint(order.id)}>🖨️ Ticket</button>
              {user?.role === "CAJERO" && order.status === "ORDERED" && (
                <button className={styles.primaryBtn} onClick={() => onCheckout(order)}>💳 Cobrar</button>
              )}
              {order.status !== "COMPLETED" && (
                <button className={styles.deleteBtn} onClick={() => onCancel(order.id)}>✕ Cancelar</button>
              )}
            </>
          )}
          {finished && (
            <button className={styles.secondaryBtn} onClick={() => onReprint(order.id)}>🖨️ Reimprimir</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------
// Table Card
// ---------------------------------------------------
function TableCard({
  table, orders, user, finished,
  onEdit, onReprint, onCheckout, onCancel,
}: {
  table: string;
  orders: Order[];
  user: any;
  finished?: boolean;
  onEdit: (id: number) => void;
  onReprint: (id: number) => void;
  onCheckout: (order: Order) => void;
  onCancel: (id: number) => void;
}) {
  const totalTable = orders.reduce((acc, o) => acc + o.total, 0);
  const dotColor   = finished ? "#94a3b8" : "#22c55e";

  return (
    <div className={`${styles.tableCard} ${finished ? styles.tableCardFinished : ""}`}>
      <div className={styles.tableHeader}>
        <div className={styles.tableIndicator} style={{ background: dotColor }} />
        <h3 style={{ flex: 1, margin: 0, fontSize: "16px", fontWeight: 700 }}>🍽️ Mesa {table}</h3>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span className={styles.tableTotal}>${totalTable.toFixed(2)}</span>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>{orders.length} orden{orders.length !== 1 ? "es" : ""}</span>
        </div>
      </div>

      <div className={styles.ordersList}>
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            user={user}
            finished={finished}
            onEdit={onEdit}
            onReprint={onReprint}
            onCheckout={onCheckout}
            onCancel={onCancel}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------
// Main Page
// ---------------------------------------------------
export default function TablesPage() {
  const { user }   = useAuth();
  const { toast }  = useToast();
  const navigate   = useNavigate();

  const [orders, setOrders]               = useState<Order[]>([]);
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      const caja  = await apiRequest("/caja/actual");
      const desde = caja?.fechaApertura ?? new Date().toISOString();
      const hasta = new Date().toISOString();
      const data  = await apiRequest(`/orders?from=${desde}&to=${hasta}&type=DINE_IN`);
      setOrders(data);
    } catch {
      setOrders([]);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      if (checkoutOrder || cancelOrderId) return;
      fetchOrders();
    }, 5000);
    return () => clearInterval(interval);
  }, [checkoutOrder, cancelOrderId]);

  const handleReprint = async (id: number) => {
    try {
      await apiRequest(`/tickets/print/order/${id}`, { method: "POST" });
      toast("Ticket reenviado a impresora", "success");
    } catch (err: any) {
      toast(err.message ?? "Error al reimprimir", "error");
    }
  };

  const dineInActive = orders.filter(
    (o) => o.status !== "COMPLETED" && o.status !== "CANCELLED"
  );
  const dineInFinished = orders.filter(
    (o) => o.status === "COMPLETED" || o.status === "CANCELLED"
  );

  const grouped = dineInActive.reduce((acc: any, o) => {
    const k = String(o.tableNumber);
    if (!acc[k]) acc[k] = [];
    acc[k].push(o);
    return acc;
  }, {});

  const groupedFinished = dineInFinished.reduce((acc: any, o) => {
    const k = String(o.tableNumber);
    if (!acc[k]) acc[k] = [];
    acc[k].push(o);
    return acc;
  }, {});

  const activeKeys   = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));
  const finishedKeys = Object.keys(groupedFinished).sort((a, b) => Number(a) - Number(b));

  return (
    <div className={styles.container}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 className={styles.title} style={{ margin: 0 }}>Mesas Activas</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.875rem" }}>
            {activeKeys.length} mesa{activeKeys.length !== 1 ? "s" : ""} con órdenes activas
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {Object.entries(STATUS_CONFIG).slice(0, 4).map(([key, cfg]) => (
            <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", color: cfg.color, background: cfg.bg, padding: "3px 10px", borderRadius: "999px", fontWeight: 600 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot }} />
              {cfg.label}
            </span>
          ))}
        </div>
      </div>

      {/* Mesas activas */}
      {activeKeys.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 0", color: "#94a3b8" }}>
          <p style={{ fontSize: "3rem", margin: 0 }}>🍽️</p>
          <p style={{ marginTop: "0.5rem" }}>No hay mesas activas en este momento</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {activeKeys.map((table) => (
            <TableCard
              key={table}
              table={table}
              orders={grouped[table]}
              user={user}
              onEdit={(id) => navigate(`/dashboard?orderId=${id}`)}
              onReprint={handleReprint}
              onCheckout={(order) => setCheckoutOrder(order)}
              onCancel={(id) => setCancelOrderId(id)}
            />
          ))}
        </div>
      )}

      {/* Mesas finalizadas */}
      {finishedKeys.length > 0 && (
        <div className={styles.finishedSection}>
          <h2 className={styles.title}>Órdenes Finalizadas</h2>
          <div className={styles.grid}>
            {finishedKeys.map((table) => (
              <TableCard
                key={table}
                table={table}
                orders={groupedFinished[table]}
                user={user}
                finished
                onEdit={(id) => navigate(`/dashboard?orderId=${id}`)}
                onReprint={handleReprint}
                onCheckout={(order) => setCheckoutOrder(order)}
                onCancel={(id) => setCancelOrderId(id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {checkoutOrder && (
        <CheckoutModal
          orderId={checkoutOrder.id}
          cart={(checkoutOrder.items ?? []).map((item) => ({
  id: item.productId ?? item.id,
  name: item.product?.name ?? item.customName ?? item.name ?? "Producto",
  quantity: item.quantity,
  priceSell: item.priceUnit ?? item.priceSell ?? 0,
}))}
          total={checkoutOrder.total}
          onClose={() => setCheckoutOrder(null)}
          onSuccess={() => { setCheckoutOrder(null); fetchOrders(); }}
        />
      )}
      {cancelOrderId && (
        <CancelOrderModal
          orderId={cancelOrderId}
          onClose={() => setCancelOrderId(null)}
          onSuccess={() => { setCancelOrderId(null); fetchOrders(); }}
        />
      )}
    </div>
  );
}