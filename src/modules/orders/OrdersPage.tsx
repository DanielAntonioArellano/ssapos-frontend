import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useRole } from "../../hooks/useRole";
import styles from "./orders.module.css";
import CheckoutModal from "../pos/CheckOutModal";
import { useToast } from "../../context/ToastContext";

type OrderItem = {
  id: number;
  productId?: number;
  customName?: string;
  quantity: number;
  priceUnit: number;
  subtotal: number;
  product?: { name: string };
};

type Order = {
  id: number;
  clientName?: string;
  total: number;
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
// Modal de cancelación con concepto + contraseña admin
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
    if (!concepto.trim()) {
      setError("Ingresa el motivo de cancelación");
      return;
    }
    if (!password.trim()) {
      setError("Ingresa la contraseña de administrador");
      return;
    }

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
        <p className={styles.modalSubtitle}>
          Ingresa el motivo y la contraseña de un administrador para confirmar.
        </p>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <input
          className={styles.modalInput}
          type="text"
          placeholder="Motivo de cancelación"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          autoFocus
        />

        <input
          className={styles.modalInput}
          type="password"
          placeholder="Contraseña de administrador"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCancel()}
          style={{ marginTop: "0.75rem" }}
        />

        <div className={styles.modalActions}>
          <button
            className={styles.secondaryBtn}
            onClick={onClose}
            disabled={loading}
          >
            Cerrar
          </button>
          <button
            className={styles.deleteBtn}
            onClick={handleCancel}
            disabled={loading}
          >
            {loading ? "Cancelando..." : "Confirmar cancelación"}
          </button>
        </div>
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
    });
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
    const mapped: CheckoutOrder = {
      id: order.id,
      total: order.total,
      items: (order.items ?? []).map(item => ({
        id: item.productId ?? 0,
        name: item.product?.name ?? item.customName ?? "Producto",
        quantity: item.quantity,
        priceSell: item.priceUnit,
      })),
    };
    setCheckoutOrder(mapped);
  };

  const filtered = search.trim()
    ? orders.filter(o => {
        const q = search.toLowerCase();
        return (
          o.clientName?.toLowerCase().includes(q) ||
          String(o.id).includes(q)
        );
      })
    : orders;

  const ordered     = filtered.filter(o => o.status === "ORDERED");
  const preparation = filtered.filter(o => o.status === "PREPARATION");
  const delivery    = filtered.filter(o => o.status === "DELIVERY");
  const completed   = filtered.filter(o => o.status === "COMPLETED");

  if (loading) return <div className={styles.container}>Cargando...</div>;
  if (error)   return <div className={styles.container}>{error}</div>;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Orders</h2>

      <div className={styles.content}>
        <div className={styles.filters}>
          <h3>Filtros</h3>
          <input
            placeholder="Buscar por cliente o #orden..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearBtn} onClick={() => setSearch("")}>
              Limpiar
            </button>
          )}
          {search && (
            <p className={styles.filterResult}>
              {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className={styles.board}>
          <OrderColumn
            title="Ordered"
            orders={ordered}
            can={can}
            navigate={navigate}
            onStartPrep={(id: number) => changeStatus(id, "PREPARATION")}
            onCancel={(id: number) => setCancelOrderId(id)}
            onReprint={async (id: number) => {
              try {
                await apiRequest(`/tickets/print/order/${id}`, { method: "POST" });
                toast("Ticket reenviado a impresora", "success");
              } catch (err: any) {
                toast(err.message ?? "Error al reimprimir", "error");
              }
            }}
          />
          <OrderColumn
            title="Preparation"
            orders={preparation}
            can={can}
            navigate={navigate}
            onSendDelivery={(id: number) => changeStatus(id, "DELIVERY")}
            onBackOrdered={(id: number) => changeStatus(id, "ORDERED")}
            onCancel={(id: number) => setCancelOrderId(id)}
          />
          <OrderColumn
            title="Delivery"
            orders={delivery}
            can={can}
            navigate={navigate}
            onCheckout={openCheckout}
            onCancel={(id: number) => setCancelOrderId(id)}
            onReprint={async (id: number) => {
              try {
                await apiRequest(`/tickets/print/order/${id}`, { method: "POST" });
                toast("Ticket reenviado a impresora", "success");
              } catch (err: any) {
                toast(err.message ?? "Error al reimprimir", "error");
              }
            }}
          />
          <OrderColumn
            title="Completed"
            orders={completed}
            can={can}
            navigate={navigate}
            onReprint={async (id: number) => {
              try {
                await apiRequest(`/tickets/print/order/${id}`, { method: "POST" });
                toast("Ticket reenviado a impresora", "success");
              } catch (err: any) {
                toast(err.message ?? "Error al reimprimir", "error");
              }
            }}
          />
        </div>
      </div>

      {checkoutOrder && (
        <CheckoutModal
          orderId={checkoutOrder.id}
          cart={checkoutOrder.items}
          total={checkoutOrder.total}
          onClose={() => setCheckoutOrder(null)}
          onSuccess={() => {
            setCheckoutOrder(null);
            fetchOrders();
          }}
        />
      )}

      {cancelOrderId && (
        <CancelOrderModal
          orderId={cancelOrderId}
          onClose={() => setCancelOrderId(null)}
          onSuccess={() => {
            setCancelOrderId(null);
            fetchOrders();
          }}
        />
      )}
    </div>
  );
}

function OrderColumn({
  title,
  orders,
  can,
  navigate,
  onStartPrep,
  onSendDelivery,
  onBackOrdered,
  onCheckout,
  onCancel,
  onReprint,
}: any) {
  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <h3>{title}</h3>
        <span>{orders.length}</span>
      </div>
      <div className={styles.cards}>
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

function OrderCard({
  order,
  can,
  navigate,
  onStartPrep,
  onSendDelivery,
  onBackOrdered,
  onCheckout,
  onCancel,
  onReprint,
}: any) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <strong>Ordenes #{order.id}</strong>
      </div>
      <div className={styles.cardBody}>
        <p>{order.clientName ?? "Sin cliente"}</p>
        <p>${order.total.toFixed(2)}</p>
      </div>
      <div className={styles.cardActions}>

        {order.status === "ORDERED" && (
          <>
            {can.verProductos && (
              <button
                className={styles.editBtn}
                onClick={() => navigate(`/dashboard?orderId=${order.id}`)}
              >
                Edit
              </button>
            )}
            {can.changeStatus && (
              <button
                className={styles.primaryBtn}
                onClick={() => onStartPrep(order.id)}
              >
                Iniciar preparación
              </button>
            )}
          </>
        )}

        {order.status === "PREPARATION" && (
          <>
            {can.changeStatus && (
              <button
                className={styles.primaryBtn}
                onClick={() => onSendDelivery(order.id)}
              >
                Cambiar a Enviado
              </button>
            )}
            {can.changeStatus && (
              <button
                className={styles.secondaryBtn}
                onClick={() => onBackOrdered(order.id)}
              >
                Volver a Ordenado
              </button>
            )}
          </>
        )}

        {order.status === "DELIVERY" && can.checkout && (
          <button
            className={styles.primaryBtn}
            onClick={() => onCheckout(order)}
          >
            Cobrar
          </button>
        )}

        {order.status === "COMPLETED" && onReprint && (
          <button
            className={styles.secondaryBtn}
            onClick={() => onReprint(order.id)}
          >
            🖨 Reimprimir
          </button>
        )}

        {(order.status === "ORDERED" || order.status === "DELIVERY") && onReprint && (
          <button
            className={styles.secondaryBtn}
            onClick={() => onReprint(order.id)}
          >
            🖨 Reimprimir
          </button>
        )}

        {order.status !== "COMPLETED" && onCancel && (
          <button
            className={styles.deleteBtn}
            onClick={() => onCancel(order.id)}
          >
            Cancelar
          </button>
        )}

      </div>
    </div>
  );
}