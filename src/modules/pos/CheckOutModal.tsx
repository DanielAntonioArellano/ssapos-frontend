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

// ─────────────────────────────────────────────────────
// Tipos para división de cuenta
// ─────────────────────────────────────────────────────
interface CuentaItem {
  cartIndex: number;
  quantity: number; // cuántas unidades de ese item van a esta cuenta
}

interface Cuenta {
  id: number;
  items: CuentaItem[];
  payment: "EFECTIVO" | "TARJETA";
  received: string;
  descuento: string;
  tipPercent: number;
  customTip: string;
}

function makeCuenta(id: number): Cuenta {
  return { id, items: [], payment: "EFECTIVO", received: "", descuento: "", tipPercent: 0, customTip: "" };
}

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────
function getItemName(item: CartItem) {
  return item.customName || item.name || "Producto";
}

function cuentaSubtotal(cuenta: Cuenta, cart: CartItem[]) {
  return cuenta.items.reduce((s, ci) => {
    const item = cart[ci.cartIndex];
    return s + (item ? item.priceSell * ci.quantity : 0);
  }, 0);
}

function cuentaTotal(cuenta: Cuenta, cart: CartItem[]) {
  const sub = cuentaSubtotal(cuenta, cart);
  const desc = parseFloat(cuenta.descuento) || 0;
  const tip = cuenta.payment === "TARJETA"
    ? (cuenta.customTip !== "" ? parseFloat(cuenta.customTip) || 0 : (sub * cuenta.tipPercent) / 100)
    : 0;
  return Math.max(0, sub - desc) + tip;
}

// ─────────────────────────────────────────────────────
// Modal principal
// ─────────────────────────────────────────────────────
export default function CheckoutModal({ orderId, cart, total, onClose, onSuccess }: Props) {
  const { refreshCaja } = useCaja();
  const { toast } = useToast();

  // Modo normal
  const [paymentType, setPaymentType] = useState<"EFECTIVO" | "TARJETA">("EFECTIVO");
  const [received, setReceived] = useState<string>("");
  const [tipPercent, setTipPercent] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>("");
  const [descuento, setDescuento] = useState<string>("");
  const [showDescuento, setShowDescuento] = useState(false);
  const [loading, setLoading] = useState(false);

  // Modo división
  const [splitMode, setSplitMode] = useState(false);
  const [cuentas, setCuentas] = useState<Cuenta[]>([makeCuenta(1), makeCuenta(2)]);
  const [printingCuenta, setPrintingCuenta] = useState<number | null>(null);

  // ── Cálculos modo normal ──
  const descuentoNum = parseFloat(descuento) || 0;
  const totalConDescuento = Math.max(0, total - descuentoNum);
  const tipAmount = customTip !== ""
    ? parseFloat(customTip) || 0
    : (totalConDescuento * tipPercent) / 100;
  const grandTotal = paymentType === "TARJETA" ? totalConDescuento + tipAmount : totalConDescuento;
  const receivedNum = parseFloat(received) || 0;
  const change = paymentType === "EFECTIVO" && receivedNum > totalConDescuento ? receivedNum - totalConDescuento : 0;

  // ── Checkout normal ──
  async function handleConfirm() {
    if (paymentType === "EFECTIVO" && receivedNum < totalConDescuento) {
      toast("El monto recibido es insuficiente", "warning");
      return;
    }
    try {
      setLoading(true);
      const body: Record<string, any> = { paymentType };
      if (paymentType === "TARJETA" && tipAmount > 0) body.tip = parseFloat(tipAmount.toFixed(2));
      const sale = await apiRequest(`/orders/${orderId}/checkout`, { method: "POST", body: JSON.stringify(body) });
      await refreshCaja();
      try { await apiRequest(`/tickets/print/sale/${sale.id}`, { method: "POST" }); }
      catch { toast("Venta procesada, pero no se pudo imprimir", "warning"); }
      toast("Venta procesada exitosamente", "success");
      onSuccess();
    } catch (error: any) {
      toast(error.message ?? "Error procesando la venta", "error");
    } finally {
      setLoading(false);
    }
  }

  // ── División: asignar item a cuenta ──
  function assignItem(cartIndex: number, qty: number, cuentaId: number) {
    setCuentas(prev => prev.map(c => {
      if (c.id === cuentaId) {
        const existing = c.items.find(ci => ci.cartIndex === cartIndex);
        if (existing) {
          return { ...c, items: c.items.map(ci => ci.cartIndex === cartIndex ? { ...ci, quantity: qty } : ci).filter(ci => ci.quantity > 0) };
        }
        if (qty > 0) return { ...c, items: [...c.items, { cartIndex, quantity: qty }] };
      }
      return c;
    }));
  }

  function addCuenta() {
    const nextId = Math.max(...cuentas.map(c => c.id)) + 1;
    setCuentas(prev => [...prev, makeCuenta(nextId)]);
  }

  function removeCuenta(id: number) {
    if (cuentas.length <= 2) return;
    setCuentas(prev => prev.filter(c => c.id !== id));
  }

  function updateCuenta(id: number, patch: Partial<Cuenta>) {
    setCuentas(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }

  // Cuántas unidades de un item ya están asignadas (excluyendo una cuenta)
  function assignedQty(cartIndex: number, excludeId?: number) {
    return cuentas.filter(c => c.id !== excludeId).reduce((s, c) => {
      const ci = c.items.find(x => x.cartIndex === cartIndex);
      return s + (ci?.quantity ?? 0);
    }, 0);
  }

  // ── Imprimir cuenta parcial ──
  async function printCuenta(cuenta: Cuenta) {
    setPrintingCuenta(cuenta.id);
    try {
      const sub = cuentaSubtotal(cuenta, cart);
      const desc = parseFloat(cuenta.descuento) || 0;
      const tip = cuenta.payment === "TARJETA"
        ? (cuenta.customTip !== "" ? parseFloat(cuenta.customTip) || 0 : (sub * cuenta.tipPercent) / 100)
        : 0;
      const tot = Math.max(0, sub - desc) + tip;

      await apiRequest("/tickets/print/cuenta-parcial", {
        method: "POST",
        body: JSON.stringify({
          numeroCuenta: cuenta.id,
          items: cuenta.items.map(ci => ({
            name: getItemName(cart[ci.cartIndex]),
            quantity: ci.quantity,
            subtotal: cart[ci.cartIndex].priceSell * ci.quantity,
          })),
          subtotal: sub,
          descuento: desc > 0 ? desc : undefined,
          total: tot,
          payment: cuenta.payment,
        }),
      });
      toast(`Cuenta ${cuenta.id} enviada a impresora`, "success");
    } catch (err: any) {
      toast(err.message ?? "Error al imprimir", "error");
    } finally {
      setPrintingCuenta(null);
    }
  }

  // ── Checkout dividido: una sola venta ──
  async function handleSplitConfirm() {
    // Validar que todos los items estén asignados
    for (let i = 0; i < cart.length; i++) {
      const total_asignado = cuentas.reduce((s, c) => {
        const ci = c.items.find(x => x.cartIndex === i);
        return s + (ci?.quantity ?? 0);
      }, 0);
      if (total_asignado !== cart[i].quantity) {
        toast(`"${getItemName(cart[i])}" no está completamente asignado`, "warning");
        return;
      }
    }
    // Validar efectivos
    for (const cuenta of cuentas) {
      if (cuenta.payment === "EFECTIVO") {
        const tot = cuentaTotal(cuenta, cart);
        const rec = parseFloat(cuenta.received) || 0;
        if (rec < tot) {
          toast(`Monto insuficiente en Cuenta ${cuenta.id}`, "warning");
          return;
        }
      }
    }
    try {
      setLoading(true);
      // Usar el método de pago de la primera cuenta para el registro
      const primaryPayment = cuentas[0].payment;
      const sale = await apiRequest(`/orders/${orderId}/checkout`, {
        method: "POST",
        body: JSON.stringify({ paymentType: primaryPayment }),
      });
      await refreshCaja();
      try { await apiRequest(`/tickets/print/sale/${sale.id}`, { method: "POST" }); }
      catch { toast("Venta procesada, pero no se pudo imprimir el resumen", "warning"); }
      toast("Venta procesada exitosamente", "success");
      onSuccess();
    } catch (error: any) {
      toast(error.message ?? "Error procesando la venta", "error");
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────
  // RENDER MODO DIVISIÓN
  // ─────────────────────────────────────────────────────
  if (splitMode) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modal} style={{ maxWidth: 700, width: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>División de cuenta</h2>
            <button className={styles.secondaryBtn} onClick={() => setSplitMode(false)}>← Volver</button>
          </div>

          {/* Items disponibles */}
          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b", margin: "0 0 8px", textTransform: "uppercase" }}>
              Asignar productos a cada cuenta
            </p>
            {cart.map((item, i) => {
              const maxQty = item.quantity;
              return (
                <div key={i} style={{ marginBottom: 10 }}>
                  <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 14 }}>
                    {getItemName(item)} <span style={{ color: "#94a3b8", fontWeight: 400 }}>x{item.quantity} · ${(item.priceSell * item.quantity).toFixed(2)}</span>
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {cuentas.map(cuenta => {
                      const ci = cuenta.items.find(x => x.cartIndex === i);
                      const val = ci?.quantity ?? 0;
                      const available = maxQty - assignedQty(i, cuenta.id);
                      return (
                        <div key={cuenta.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 12, color: "#64748b" }}>C{cuenta.id}:</span>
                          <input
                            type="number" min={0} max={available + val}
                            value={val}
                            onChange={e => assignItem(i, Math.min(Number(e.target.value), available + val), cuenta.id)}
                            style={{ width: 52, padding: "3px 6px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13 }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cuentas */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cuentas.map(cuenta => {
              const sub = cuentaSubtotal(cuenta, cart);
              const desc = parseFloat(cuenta.descuento) || 0;
              const tip = cuenta.payment === "TARJETA"
                ? (cuenta.customTip !== "" ? parseFloat(cuenta.customTip) || 0 : (sub * cuenta.tipPercent) / 100)
                : 0;
              const tot = Math.max(0, sub - desc) + tip;
              const rec = parseFloat(cuenta.received) || 0;
              const cambio = cuenta.payment === "EFECTIVO" && rec > tot ? rec - tot : 0;

              return (
                <div key={cuenta.id} style={{ border: "1.5px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <strong style={{ fontSize: 15 }}>Cuenta {cuenta.id}</strong>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className={styles.secondaryBtn}
                        style={{ fontSize: 12, padding: "4px 10px" }}
                        onClick={() => printCuenta(cuenta)}
                        disabled={printingCuenta === cuenta.id || cuenta.items.length === 0}
                      >
                        {printingCuenta === cuenta.id ? "Imprimiendo..." : "🖨 Imprimir"}
                      </button>
                      {cuentas.length > 2 && (
                        <button
                          className={styles.deleteBtn}
                          style={{ fontSize: 12, padding: "4px 10px" }}
                          onClick={() => removeCuenta(cuenta.id)}
                        >✕</button>
                      )}
                    </div>
                  </div>

                  {/* Items asignados */}
                  {cuenta.items.length === 0
                    ? <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 8px" }}>Sin productos asignados</p>
                    : cuenta.items.map(ci => {
                        const item = cart[ci.cartIndex];
                        return (
                          <div key={ci.cartIndex} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569", marginBottom: 2 }}>
                            <span>{ci.quantity}x {getItemName(item)}</span>
                            <span>${(item.priceSell * ci.quantity).toFixed(2)}</span>
                          </div>
                        );
                      })
                  }

                  <hr style={{ margin: "8px 0", borderColor: "#f1f5f9" }} />

                  {/* Descuento */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#64748b", minWidth: 80 }}>Descuento:</span>
                    <input
                      type="number" min={0} placeholder="$0.00"
                      value={cuenta.descuento}
                      onChange={e => updateCuenta(cuenta.id, { descuento: e.target.value })}
                      style={{ width: 80, padding: "3px 6px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13 }}
                    />
                  </div>

                  {/* Método de pago */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
                    {(["EFECTIVO", "TARJETA"] as const).map(p => (
                      <label key={p} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                        <input type="radio" checked={cuenta.payment === p} onChange={() => updateCuenta(cuenta.id, { payment: p, received: "", customTip: "", tipPercent: 0 })} />
                        {p === "EFECTIVO" ? "Efectivo" : "Tarjeta"}
                      </label>
                    ))}
                  </div>

                  {/* Propina (tarjeta) */}
                  {cuenta.payment === "TARJETA" && (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                        {TIP_OPTIONS.map(pct => (
                          <button key={pct} type="button"
                            style={{ padding: "3px 8px", fontSize: 12, borderRadius: 6, border: "1.5px solid #e2e8f0", background: cuenta.tipPercent === pct && cuenta.customTip === "" ? "#0f172a" : "#fff", color: cuenta.tipPercent === pct && cuenta.customTip === "" ? "#fff" : "#374151", cursor: "pointer" }}
                            onClick={() => updateCuenta(cuenta.id, { tipPercent: pct, customTip: "" })}
                          >
                            {pct === 0 ? "Sin propina" : `${pct}%`}
                          </button>
                        ))}
                      </div>
                      <input type="number" min={0} placeholder="Propina personalizada"
                        value={cuenta.customTip}
                        onChange={e => updateCuenta(cuenta.id, { customTip: e.target.value, tipPercent: -1 })}
                        style={{ width: "100%", padding: "4px 8px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                  )}

                  {/* Monto recibido (efectivo) */}
                  {cuenta.payment === "EFECTIVO" && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "#64748b", minWidth: 80 }}>Recibido:</span>
                      <input type="number" min={0} placeholder={`$${tot.toFixed(2)}`}
                        value={cuenta.received}
                        onChange={e => updateCuenta(cuenta.id, { received: e.target.value })}
                        style={{ width: 100, padding: "3px 6px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13 }}
                      />
                      {cambio > 0 && <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>Cambio: ${cambio.toFixed(2)}</span>}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                    <strong style={{ fontSize: 15 }}>Total: ${tot.toFixed(2)}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className={styles.secondaryBtn}
            style={{ width: "100%", marginTop: 10 }}
            onClick={addCuenta}
          >
            + Agregar cuenta
          </button>

          <div className={styles.modalActions} style={{ marginTop: 16 }}>
            <button className={styles.secondaryBtn} onClick={onClose} disabled={loading}>Cancelar</button>
            <button className={styles.primaryBtn} onClick={handleSplitConfirm} disabled={loading}>
              {loading ? "Procesando..." : "Confirmar cobro dividido"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────
  // RENDER MODO NORMAL
  // ─────────────────────────────────────────────────────
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Resumen de Venta</h2>
          <button
            className={styles.secondaryBtn}
            style={{ fontSize: 12, padding: "4px 10px" }}
            onClick={() => setSplitMode(true)}
          >
            ✂ Dividir cuenta
          </button>
        </div>

        <div className={styles.checkoutItems}>
          {cart.map((item, index) => (
            <div key={index} className={styles.checkoutRow}>
              <span>{item.customName || item.name} x {item.quantity}</span>
              <span>${(item.priceSell * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <hr />

        {/* Descuento */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <button
            style={{ background: "none", border: "none", color: "#0f4c4c", fontSize: 13, cursor: "pointer", textDecoration: "underline", padding: 0 }}
            onClick={() => setShowDescuento(!showDescuento)}
          >
            {showDescuento ? "— Cancelar descuento" : "+ Agregar descuento"}
          </button>
          {descuentoNum > 0 && <span style={{ color: "#dc2626", fontWeight: 600, fontSize: 14 }}>-${descuentoNum.toFixed(2)}</span>}
        </div>
        {showDescuento && (
          <input
            type="number" min={0} placeholder="Monto de descuento"
            value={descuento}
            onChange={e => setDescuento(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, boxSizing: "border-box", marginBottom: 8 }}
          />
        )}

        <div className={styles.checkoutTotal}>
          <strong>Total:</strong>
          <strong>${totalConDescuento.toFixed(2)}</strong>
        </div>

        <div className={styles.paymentSection}>
          <label>
            <input type="radio" value="EFECTIVO" checked={paymentType === "EFECTIVO"}
              onChange={() => { setPaymentType("EFECTIVO"); setReceived(""); setTipPercent(0); setCustomTip(""); }} />
            Efectivo
          </label>
          <label>
            <input type="radio" value="TARJETA" checked={paymentType === "TARJETA"}
              onChange={() => { setPaymentType("TARJETA"); setReceived(""); }} />
            Tarjeta
          </label>
        </div>

        {paymentType === "TARJETA" && (
          <div className={styles.tipSection}>
            <label className={styles.tipLabel}>Propina</label>
            <div className={styles.tipButtons}>
              {TIP_OPTIONS.map((pct) => (
                <button key={pct} type="button"
                  className={`${styles.tipBtn} ${tipPercent === pct && customTip === "" ? styles.tipBtnActive : ""}`}
                  onClick={() => { setTipPercent(pct); setCustomTip(""); }}
                >
                  {pct === 0 ? "Sin propina" : `${pct}%`}
                </button>
              ))}
            </div>
            <div className={styles.tipCustomRow}>
              <span>Monto personalizado:</span>
              <input type="number" min="0" placeholder="$0.00" value={customTip}
                onChange={(e) => { setCustomTip(e.target.value); setTipPercent(-1); }}
                className={styles.tipCustomInput} />
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

        {paymentType === "EFECTIVO" && (
          <div className={styles.cashSection}>
            <label>Monto recibido</label>
            <input type="number" placeholder={`$${totalConDescuento.toFixed(2)}`}
              value={received} onChange={(e) => setReceived(e.target.value)} />
            <div className={styles.changeRow}>
              <span>Cambio:</span>
              <strong>${change.toFixed(2)}</strong>
            </div>
          </div>
        )}

        <div className={styles.modalActions}>
          <button className={styles.secondaryBtn} onClick={onClose} disabled={loading}>Cancelar</button>
          <button className={styles.primaryBtn} onClick={handleConfirm} disabled={loading}>
            {loading ? "Procesando..." : "Confirmar Pago"}
          </button>
        </div>
      </div>
    </div>
  );
}