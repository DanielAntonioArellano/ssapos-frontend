import { useState } from "react";
import styles from "./pos.module.css";
import { apiRequest } from "../../services/api";
import { useCaja } from "../../context/CajaContext";
import { useToast } from "../../context/ToastContext";

interface CartItem {
  id?: number;
  name?: string;
  customName?: string;
  quantity: number;
  priceSell: number;
}

interface Props {
  orderId: number;
  cart: CartItem[];
  total: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckoutModal({
  orderId,
  cart,
  total,
  onClose,
  onSuccess,
}: Props) {
  const { refreshCaja } = useCaja();
  const { toast } = useToast();

  const [paymentType, setPaymentType] = useState<"EFECTIVO" | "TARJETA">("EFECTIVO");
  const [received, setReceived] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const change = paymentType === "EFECTIVO" && received > total
    ? received - total
    : 0;

  async function handleConfirm() {
    if (paymentType === "EFECTIVO" && received < total) {
      toast("El monto recibido es insuficiente", "warning");
      return;
    }

    try {
      setLoading(true);

      // ── Checkout: devuelve la sale creada ─────────────
      const sale = await apiRequest(`/orders/${orderId}/checkout`, {
        method: "POST",
        body: JSON.stringify({ paymentType }),
      });

      await refreshCaja();

      // ── Impresión automática ──────────────────────────
      try {
        await apiRequest(`/tickets/print/sale/${sale.id}`, { method: "POST" });
      } catch {
        toast("Venta procesada, pero no se pudo imprimir", "warning");
      }
      // ─────────────────────────────────────────────────

      toast("Venta procesada exitosamente", "success");
      onSuccess();
    } catch (error: any) {
      toast(error.message ?? "Error procesando la venta", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2>Resumen de Venta</h2>

        <div className={styles.checkoutItems}>
          {cart.map((item, index) => (
            <div key={index} className={styles.checkoutRow}>
              <span>{item.customName || item.name} x {item.quantity}</span>
              <span>${(item.priceSell * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <hr />

        <div className={styles.checkoutTotal}>
          <strong>Total:</strong>
          <strong>${total.toFixed(2)}</strong>
        </div>

        <div className={styles.paymentSection}>
          <label>
            <input
              type="radio"
              value="EFECTIVO"
              checked={paymentType === "EFECTIVO"}
              onChange={() => setPaymentType("EFECTIVO")}
            />
            Efectivo
          </label>
          <label>
            <input
              type="radio"
              value="TARJETA"
              checked={paymentType === "TARJETA"}
              onChange={() => setPaymentType("TARJETA")}
            />
            Tarjeta
          </label>
        </div>

        {paymentType === "EFECTIVO" && (
          <div className={styles.cashSection}>
            <label>Monto recibido</label>
            <input
              type="number"
              value={received}
              onChange={(e) => setReceived(Number(e.target.value))}
            />
            <div className={styles.changeRow}>
              <span>Cambio:</span>
              <strong>${change.toFixed(2)}</strong>
            </div>
          </div>
        )}

        <div className={styles.modalActions}>
          <button className={styles.secondaryBtn} onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className={styles.primaryBtn} onClick={handleConfirm} disabled={loading}>
            {loading ? "Procesando..." : "Confirmar Pago"}
          </button>
        </div>
      </div>
    </div>
  );
}