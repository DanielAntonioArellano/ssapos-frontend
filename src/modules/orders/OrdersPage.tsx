import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useRole } from "../../hooks/useRole";
import styles from "./orders.module.css";
import CheckoutModal from "../pos/CheckOutModal";
import { useToast } from "../../context/ToastContext";

// ---------------------------------------------------
// Types
// ---------------------------------------------------
type OrderItem = {
  id: number;
  productId?: number;
  customName?: string;
  notes?: string;
  quantity: number;
  priceUnit: number;
  subtotal: number;
  product?: { name: string };
};

type Order = {
  id: number;
  clientName?: string;
  clientPhone?: string;
  clientNotes?: string;
  total: number;
  type: "DELIVERY" | "DINE_IN" | "TAKEAWAY";
  tableNumber?: number;
  createdAt: string;
  status: "ORDERED" | "PREPARATION" | "DELIVERY" | "COMPLETED" | "CANCELLED";
  items?: OrderItem[];
};

type CartItem = {
  id: number;
  name: string;
  quantity: number;
  priceSell: number;
};

type CheckoutOrder = {
  id: number;
  total: number;
  items: CartItem[];
};

// ---------------------------------------------------
// Helpers
// ---------------------------------------------------
//function getElapsed(createdAt: string): string {
  //const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  //if (diff < 60) return `${diff}s`;
  //const mins = Math.floor(diff / 60);
  //if (mins < 60) return `${mins}m`;
  //return `${Math.floor(mins / 60)}h ${mins % 60}m`;
//}

//function isLate(createdAt: string): boolean {
  //return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000) >= 15;
//}

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleCancel() {
    if (!concepto.trim()) { setError("Ingresa el motivo de cancelación"); return; }
    if (!password.trim()) { setError("Ingresa la contraseña de administrador"); return; }
    try {
      setLoading(true);
      setError(null);
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
        <p className={styles.modalSubtitle}>Ingresa el motivo y la contraseña de un administrador.</p>
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
// Order Card
// ---------------------------------------------------
function OrderCard({ order, can, navigate, onStartPrep, onSendDelivery, onBackOrdered, onCheckout, onCancel, onReprint }: any) {
  //const late = isLate(order.createdAt);
  //const elapsed = getElapsed(order.createdAt);
  const itemsPreview = (order.items ?? []).slice(0, 2);
  const extraItems = (order.items ?? []).length - 2;

  return (
    <div className={styles.card}>
      {/* Card Top */}
      <div className={styles.cardTop}>
        <div className={styles.cardTopLeft}>
          <span className={styles.cardId}>#{order.id}</span>
          {/*<span className={late ? styles.timerLate : styles.timerOk}>{elapsed}</span>*/}
        </div>
        <span className={order.type === "DINE_IN" ? styles.badgeDine : styles.badgeDelivery}>
          {order.type === "DINE_IN" ? `Mesa ${order.tableNumber ?? "-"}` : "Domicilio"}
        </span>
      </div>

      {/* Client */}
      <div className={styles.cardClient}>
        {order.clientName ?? order.clientPhone ?? "Sin cliente"}
      </div>

      {/* Items preview */}
      <div className={styles.cardItems}>
        {itemsPreview.map((item: OrderItem, i: number) => (
          <div key={i} className={styles.cardItemRow}>
            <span className={styles.cardItemQty}>{item.quantity}×</span>
            <span className={styles.cardItemName}>
              {item.product?.name ?? item.customName ?? "Producto"}
            </span>
          </div>
        ))}
        {extraItems > 0 && (
          <div className={styles.cardItemMore}>+{extraItems} más</div>
        )}
        {/* Notas del cliente */}
        {order.clientNotes && (
          <div className={styles.cardNote}>📝 {order.clientNotes}</div>
        )}
      </div>

      {/* Total */}
      <div className={styles.cardTotal}>${order.total.toFixed(2)}</div>

      {/* Actions */}
      <div className={styles.cardActions}>
        {order.status === "ORDERED" && (
          <>
            {can.verProductos && (
              <button className={styles.btnEdit} onClick={() => navigate(`/dashboard?orderId=${order.id}`)}>✎</button>
            )}
            {can.changeStatus && (
              <button className={styles.btnPrimary} onClick={() => onStartPrep(order.id)}>Preparar</button>
            )}
            {onReprint && (
              <button className={styles.btnIcon} onClick={() => onReprint(order.id)}>🖨</button>
            )}
            {onCancel && (
              <button className={styles.btnDanger} onClick={() => onCancel(order.id)}>✕</button>
            )}
          </>
        )}

        {order.status === "PREPARATION" && (
          <>
            {can.changeStatus && (
              <>
                <button className={styles.btnSecondary} onClick={() => onBackOrdered(order.id)}>← Volver</button>
                <button className={styles.btnPrimary} onClick={() => onSendDelivery(order.id)}>Enviar</button>
              </>
            )}
            {onCancel && (
              <button className={styles.btnDanger} onClick={() => onCancel(order.id)}>✕</button>
            )}
          </>
        )}

        {order.status === "DELIVERY" && (
          <>
            {can.checkout && (
              <button className={styles.btnPrimary} onClick={() => onCheckout(order)}>Cobrar</button>
            )}
            {onReprint && (
              <button className={styles.btnIcon} onClick={() => onReprint(order.id)}>🖨</button>
            )}
            {onCancel && (
              <button className={styles.btnDanger} onClick={() => onCancel(order.id)}>✕</button>
            )}
          </>
        )}

        {order.status === "COMPLETED" && onReprint && (
          <button className={styles.btnSecondary} onClick={() => onReprint(order.id)}>🖨 Reimprimir</button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------
// Order Column
// ---------------------------------------------------
function OrderColumn({ title, orders, statusColor, can, navigate, onStartPrep, onSendDelivery, onBackOrdered, onCheckout, onCancel, onReprint }: any) {
  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <div className={styles.columnTitleRow}>
          <span className={styles.columnDot} style={{ background: statusColor }} />
          <span className={styles.columnTitle}>{title}</span>
        </div>
        <span className={styles.columnCount}>{orders.length}</span>
      </div>
      <div className={styles.cards}>
        {orders.length === 0 && (
          <div className={styles.emptyCol}>Sin órdenes</div>
        )}
        {orders.map((order: Order) => (
          <OrderCard
            key={order.id}
            order={order}
            can={can}
            navigate={navigate}
            onStartPrep={onStartPrep}
            onSendDelivery={onSendDelivery}
            onBackOrdered={onBackOrdered}
            onCheckout={onCheckout}
            onCancel={onCancel}
            onReprint={onReprint}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------
// Main Page
// ---------------------------------------------------
export default function OrdersPage() {
  const { user } = useAuth();
  const { can } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<CheckoutOrder | null>(null);
  const [search, setSearch] = useState("");
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const caja = await apiRequest("/caja/actual");
      const desde = caja?.fechaApertura ?? new Date().toISOString();
      const hasta = new Date().toISOString();
      const activas = await apiRequest(`/orders?from=${desde}&to=${hasta}&type=DELIVERY`);
      setOrders(activas);
    } catch (err: any) {
      setError(err.message || "Error cargando órdenes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      if (checkoutOrder || cancelOrderId) return;
      fetchOrders();
    }, 40000);
    return () => clearInterval(interval);
  }, [checkoutOrder, cancelOrderId]);

  const changeStatus = async (id: number, status: string) => {
    try {
      await apiRequest(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      fetchOrders();
    } catch (err: any) {
      toast(err.message ?? "Error al cambiar estado", "error");
    }
  };

  const openCheckout = (order: Order) => {
    setCheckoutOrder({
      id: order.id,
      total: order.total,
      items: (order.items ?? []).map(item => ({
        id: item.productId ?? 0,
        name: item.product?.name ?? item.customName ?? "Producto",
        quantity: item.quantity,
        priceSell: item.priceUnit,
      })),
    });
  };

  const handleReprint = async (id: number) => {
    try {
      await apiRequest(`/tickets/print/order/${id}`, { method: "POST" });
      toast("Ticket reenviado a impresora", "success");
    } catch (err: any) {
      toast(err.message ?? "Error al reimprimir", "error");
    }
  };

  const filtered = search.trim()
    ? orders.filter(o => {
        const q = search.toLowerCase();
        return o.clientName?.toLowerCase().includes(q) || String(o.id).includes(q);
      })
    : orders;

  const ordered     = filtered.filter(o => o.status === "ORDERED");
  const preparation = filtered.filter(o => o.status === "PREPARATION");
  const delivery    = filtered.filter(o => o.status === "DELIVERY");
  const completed   = filtered.filter(o => o.status === "COMPLETED");

  if (loading) return <div className={styles.container}><p className={styles.loadingText}>Cargando órdenes...</p></div>;
  if (error)   return <div className={styles.container}><p className={styles.errorText}>{error}</p></div>;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Órdenes</h1>
          <p className={styles.subtitle}>{orders.length} orden{orders.length !== 1 ? "es" : ""} activa{orders.length !== 1 ? "s" : ""}</p>
        </div>
        <input
          className={styles.searchInput}
          placeholder="Buscar por cliente o #orden..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Board */}
      <div className={styles.board}>
        <OrderColumn
          title="Ordenado"
          statusColor="#F59E0B"
          orders={ordered}
          can={can}
          navigate={navigate}
          onStartPrep={(id: number) => changeStatus(id, "PREPARATION")}
          onCancel={(id: number) => setCancelOrderId(id)}
          onReprint={handleReprint}
        />
        <OrderColumn
          title="Preparación"
          statusColor="#3B82F6"
          orders={preparation}
          can={can}
          navigate={navigate}
          onSendDelivery={(id: number) => changeStatus(id, "DELIVERY")}
          onBackOrdered={(id: number) => changeStatus(id, "ORDERED")}
          onCancel={(id: number) => setCancelOrderId(id)}
        />
        <OrderColumn
          title="Delivery"
          statusColor="#8B5CF6"
          orders={delivery}
          can={can}
          navigate={navigate}
          onCheckout={openCheckout}
          onCancel={(id: number) => setCancelOrderId(id)}
          onReprint={handleReprint}
        />
        <OrderColumn
          title="Completado"
          statusColor="#22C55E"
          orders={completed}
          can={can}
          navigate={navigate}
          onReprint={handleReprint}
        />
      </div>

      {checkoutOrder && (
        <CheckoutModal
          orderId={checkoutOrder.id}
          cart={checkoutOrder.items}
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