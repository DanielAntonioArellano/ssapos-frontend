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

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const caja = await apiRequest("/caja/actual");
      const desde = caja?.fechaApertura ?? new Date().toISOString();
      const hasta = new Date().toISOString();
      const activas = await apiRequest(`/orders?from=${desde}&to=${hasta}`);
      setOrders(activas);
    } catch (err: any) {
      setError(err.message || "Error cargando órdenes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 20000);
    return () => clearInterval(interval);
  }, []);

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

  // ── Filtro por nombre de cliente o # de orden ─────────
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
          />
          <OrderColumn
            title="Preparation"
            orders={preparation}
            can={can}
            navigate={navigate}
            onSendDelivery={(id: number) => changeStatus(id, "DELIVERY")}
            onBackOrdered={(id: number) => changeStatus(id, "ORDERED")}
          />
          <OrderColumn
            title="Delivery"
            orders={delivery}
            can={can}
            navigate={navigate}
            onCheckout={openCheckout}
          />
          <OrderColumn
            title="Completed"
            orders={completed}
            can={can}
            navigate={navigate}
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

      </div>
    </div>
  );
}