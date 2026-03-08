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

export default function TablesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    const caja = await apiRequest("/caja/actual");
    const desde = caja?.fechaApertura ?? new Date().toISOString();
    const hasta = new Date().toISOString();
    const data = await apiRequest(`/orders?from=${desde}&to=${hasta}`);
    setOrders(data);
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

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
    </div>
  );
}