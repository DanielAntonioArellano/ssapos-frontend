import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import styles from "./tables.module.css";
import CheckoutModal from "../pos/CheckOutModal";

type Order = {
  id: number;
  tableNumber: number;
  total: number;
  status: string;
  type: string;
  items?: {
    id: number;
    name: string;
    quantity: number;
    priceSell: number;
  }[];
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
          <button className={styles.secondaryBtn} onClick={onClose} disabled={loading}>
            Cerrar
          </button>
          <button className={styles.deleteBtn} onClick={handleCancel} disabled={loading}>
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
export default function TablesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);

  const fetchOrders = async () => {
    const caja = await apiRequest("/caja/actual");
    const desde = caja?.fechaApertura ?? new Date().toISOString();
    const hasta = new Date().toISOString();
    const data = await apiRequest(`/orders?from=${desde}&to=${hasta}`);
    setOrders(data);
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

  const dineInOrders = orders.filter(
    o => o.type === "DINE_IN" && o.status !== "COMPLETED" && o.status !== "CANCELLED"
  );

  const finishedOrders = orders.filter(
    o => o.type === "DINE_IN" && (o.status === "COMPLETED" || o.status === "CANCELLED")
  );

  const grouped = dineInOrders.reduce((acc: any, order) => {
    if (!acc[order.tableNumber]) acc[order.tableNumber] = [];
    acc[order.tableNumber].push(order);
    return acc;
  }, {});

  const groupedFinished = finishedOrders.reduce((acc: any, order) => {
    if (!acc[order.tableNumber]) acc[order.tableNumber] = [];
    acc[order.tableNumber].push(order);
    return acc;
  }, {});

  const openCheckout = (order: Order) => setCheckoutOrder(order);
  const editOrder = (id: number) => navigate(`/dashboard?orderId=${id}`);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Mesas Activas</h2>

      <div className={styles.grid}>
        {Object.keys(grouped).map((table) => {
          const tableOrders = grouped[table];
          const totalTable = tableOrders.reduce((acc: number, o: Order) => acc + o.total, 0);

          return (
            <div key={table} className={styles.tableCard}>
              <div className={styles.tableHeader}>
                <div className={styles.tableIndicator}></div>
                <h3>Mesa {table}</h3>
                <span className={styles.tableTotal}>${totalTable.toFixed(2)}</span>
              </div>

              <div className={styles.ordersList}>
                {tableOrders.map((order: Order) => (
                  <div key={order.id} className={styles.orderCard}>
                    <div className={styles.orderTop}>
                      <span className={styles.orderId}>Orden #{order.id}</span>
                      <span className={styles.statusBadge}>{order.status}</span>
                    </div>
                    <div className={styles.orderBottom}>
                      <span className={styles.orderTotal}>${order.total.toFixed(2)}</span>
                      <div className={styles.actions}>
                        {(user?.role === "ADMIN" || user?.role === "CAJERO") && order.status === "ORDERED" && (
                          <button className={styles.secondaryBtn} onClick={() => editOrder(order.id)}>
                            Editar
                          </button>
                        )}
                        <button className={styles.secondaryBtn} onClick={() => handleReprint(order.id)}>
                          🖨 Reimprimir
                        </button>
                        {user?.role === "CAJERO" && order.status === "ORDERED" && (
                          <button className={styles.primaryBtn} onClick={() => openCheckout(order)}>
                            Cobrar
                          </button>
                        )}
                        {order.status !== "COMPLETED" && (
                          <button
                            className={styles.deleteBtn}
                            onClick={() => setCancelOrderId(order.id)}
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {Object.keys(groupedFinished).length > 0 && (
        <div className={styles.finishedSection}>
          <h2 className={styles.title}>Órdenes Finalizadas</h2>
          <div className={styles.grid}>
            {Object.keys(groupedFinished).map((table) => {
              const tableOrders = groupedFinished[table];
              const totalTable = tableOrders.reduce((acc: number, o: Order) => acc + o.total, 0);

              return (
                <div key={table} className={`${styles.tableCard} ${styles.tableCardFinished}`}>
                  <div className={styles.tableHeader}>
                    <div className={styles.tableIndicator}></div>
                    <h3>Mesa {table}</h3>
                    <span className={styles.tableTotal}>${totalTable.toFixed(2)}</span>
                  </div>
                  <div className={styles.ordersList}>
                    {tableOrders.map((order: Order) => (
                      <div key={order.id} className={styles.orderCard}>
                        <div className={styles.orderTop}>
                          <span className={styles.orderId}>Orden #{order.id}</span>
                          <span className={`${styles.statusBadge} ${order.status === "COMPLETED" ? styles.badgeCompleted : styles.badgeCancelled}`}>
                            {order.status}
                          </span>
                        </div>
                        <div className={styles.orderBottom}>
                          <span className={styles.orderTotal}>${order.total.toFixed(2)}</span>
                          <div className={styles.actions}>
                            <button className={styles.secondaryBtn} onClick={() => handleReprint(order.id)}>
                              🖨 Reimprimir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {checkoutOrder && (
        <CheckoutModal
          orderId={checkoutOrder.id}
          cart={checkoutOrder.items ?? []}
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