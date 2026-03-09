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

const TIP_OPTIONS = [0, 10, 15, 20];

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
  const [received, setReceived] = useState<string>("");
  const [tipPercent, setTipPercent] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const tipAmount =
    customTip !== ""
      ? parseFloat(customTip) || 0
      : (total * tipPercent) / 100;

  const grandTotal = paymentType === "TARJETA" ? total + tipAmount : total;

  const receivedNum = parseFloat(received) || 0;
  const change =
    paymentType === "EFECTIVO" && receivedNum > total
      ? receivedNum - total
      : 0;

  function handleTipPercent(pct: number) {
    setTipPercent(pct);
    setCustomTip("");
  }

  function handleCustomTip(val: string) {
    setCustomTip(val);
    setTipPercent(-1); // ninguno seleccionado
  }

  async function handleConfirm() {
    if (paymentType === "EFECTIVO" && receivedNum < total) {
      toast("El monto recibido es insuficiente", "warning");
      return;
    }

    try {
      setLoading(true);

      const body: Record<string, any> = { paymentType };
      if (paymentType === "TARJETA" && tipAmount > 0) {
        body.tip = parseFloat(tipAmount.toFixed(2));
      }

      const sale = await apiRequest(`/orders/${orderId}/checkout`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      await refreshCaja();

      try {
        await apiRequest(`/tickets/print/sale/${sale.id}`, { method: "POST" });
      } catch {
        toast("Venta procesada, pero no se pudo imprimir", "warning");
      }

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
              onChange={() => {
                setPaymentType("EFECTIVO");
                setReceived("");
                setTipPercent(0);
                setCustomTip("");
              }}
            />
            Efectivo
          </label>
          <label>
            <input
              type="radio"
              value="TARJETA"
              checked={paymentType === "TARJETA"}
              onChange={() => {
                setPaymentType("TARJETA");
                setReceived("");
              }}
            />
            Tarjeta
          </label>
        </div>

        {/* ── PROPINA (solo tarjeta) ── */}
        {paymentType === "TARJETA" && (
          <div className={styles.tipSection}>
            <label className={styles.tipLabel}>Propina</label>
            <div className={styles.tipButtons}>
              {TIP_OPTIONS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  className={`${styles.tipBtn} ${tipPercent === pct && customTip === "" ? styles.tipBtnActive : ""}`}
                  onClick={() => handleTipPercent(pct)}
                >
                  {pct === 0 ? "Sin propina" : `${pct}%`}
                </button>
              ))}
            </div>
            <div className={styles.tipCustomRow}>
              <span>Monto personalizado:</span>
              <input
                type="number"
                min="0"
                placeholder="$0.00"
                value={customTip}
                onChange={(e) => handleCustomTip(e.target.value)}
                className={styles.tipCustomInput}
              />
            </div>
            {tipAmount > 0 && (
              <div className={styles.changeRow}>
                <span>Propina:</span>
                <strong>+${tipAmount.toFixed(2)}</strong>
              </div>
            )}
            <div className={styles.checkoutTotal} style={{ marginTop: 8 }}>
              <strong>Total con propina:</strong>
              <strong>${grandTotal.toFixed(2)}</strong>
            </div>
          </div>
        )}

        {/* ── EFECTIVO ── */}
        {paymentType === "EFECTIVO" && (
          <div className={styles.cashSection}>
            <label>Monto recibido</label>
            <input
              type="number"
              placeholder={`$${total.toFixed(2)}`}
              value={received}
              onChange={(e) => setReceived(e.target.value)}
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