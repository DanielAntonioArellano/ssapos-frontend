import { useState } from "react";
import { apiRequest } from "../../services/api";
import { useCaja } from "../../context/CajaContext";
import { useToast } from "../../context/ToastContext";
import styles from "./checkout.module.css";

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
  quantity: number;
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

  const [paymentType, setPaymentType] = useState<"EFECTIVO" | "TARJETA">("EFECTIVO");
  const [received, setReceived] = useState<string>("");
  const [tipPercent, setTipPercent] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>("");
  const [descuento, setDescuento] = useState<string>("");
  const [showDescuento, setShowDescuento] = useState(false);
  const [loading, setLoading] = useState(false);

  const [splitMode, setSplitMode] = useState(false);
  const [cuentas, setCuentas] = useState<Cuenta[]>([makeCuenta(1), makeCuenta(2)]);
  const [printingCuenta, setPrintingCuenta] = useState<number | null>(null);

  const descuentoNum = parseFloat(descuento) || 0;
  const totalConDescuento = Math.max(0, total - descuentoNum);
  const tipAmount = customTip !== ""
    ? parseFloat(customTip) || 0
    : (totalConDescuento * tipPercent) / 100;
  const grandTotal = paymentType === "TARJETA" ? totalConDescuento + tipAmount : totalConDescuento;
  const receivedNum = parseFloat(received) || 0;
  const change = paymentType === "EFECTIVO" && receivedNum > totalConDescuento ? receivedNum - totalConDescuento : 0;

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

  function assignedQty(cartIndex: number, excludeId?: number) {
    return cuentas.filter(c => c.id !== excludeId).reduce((s, c) => {
      const ci = c.items.find(x => x.cartIndex === cartIndex);
      return s + (ci?.quantity ?? 0);
    }, 0);
  }

  const totalAsignado = cart.reduce((s, item, i) => {
    const asignado = cuentas.reduce((ss, c) => {
      const ci = c.items.find(x => x.cartIndex === i);
      return ss + (ci?.quantity ?? 0);
    }, 0);
    return s + Math.min(asignado, item.quantity);
  }, 0);
  const totalItems = cart.reduce((s, item) => s + item.quantity, 0);
  const progreso = totalItems > 0 ? (totalAsignado / totalItems) * 100 : 0;

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
          items: cuenta.items.map(ci => ({ name: getItemName(cart[ci.cartIndex]), quantity: ci.quantity, subtotal: cart[ci.cartIndex].priceSell * ci.quantity })),
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

  async function handleSplitConfirm() {
    for (let i = 0; i < cart.length; i++) {
      const totalAsig = cuentas.reduce((s, c) => { const ci = c.items.find(x => x.cartIndex === i); return s + (ci?.quantity ?? 0); }, 0);
      if (totalAsig !== cart[i].quantity) { toast(`"${getItemName(cart[i])}" no está completamente asignado`, "warning"); return; }
    }
    for (const cuenta of cuentas) {
      if (cuenta.payment === "EFECTIVO") {
        const tot = cuentaTotal(cuenta, cart);
        const rec = parseFloat(cuenta.received) || 0;
        if (rec < tot) { toast(`Monto insuficiente en Cuenta ${cuenta.id}`, "warning"); return; }
      }
    }
    try {
      setLoading(true);
      let totalEfectivo = 0, totalTarjeta = 0, totalPropinas = 0;
      for (const cuenta of cuentas) {
        const sub = cuentaSubtotal(cuenta, cart);
        const desc = parseFloat(cuenta.descuento) || 0;
        const tip = cuenta.payment === "TARJETA" ? (cuenta.customTip !== "" ? parseFloat(cuenta.customTip) || 0 : (sub * cuenta.tipPercent) / 100) : 0;
        const tot = Math.max(0, sub - desc);
        if (cuenta.payment === "EFECTIVO") totalEfectivo += tot;
        else { totalTarjeta += tot; totalPropinas += tip; }
      }
      const hayEfectivo = totalEfectivo > 0;
      const hayTarjeta = totalTarjeta > 0;
      let lastSaleId: number | null = null;
      if (hayEfectivo && hayTarjeta) {
        const se = await apiRequest(`/orders/${orderId}/checkout`, { method: "POST", body: JSON.stringify({ paymentType: "EFECTIVO", splitAmount: parseFloat(totalEfectivo.toFixed(2)) }) });
        lastSaleId = se.id;
        const st = await apiRequest(`/orders/${orderId}/checkout`, { method: "POST", body: JSON.stringify({ paymentType: "TARJETA", splitAmount: parseFloat(totalTarjeta.toFixed(2)), tip: totalPropinas > 0 ? parseFloat(totalPropinas.toFixed(2)) : undefined }) });
        lastSaleId = st.id;
      } else {
        const payment = hayEfectivo ? "EFECTIVO" : "TARJETA";
        const sale = await apiRequest(`/orders/${orderId}/checkout`, { method: "POST", body: JSON.stringify({ paymentType: payment, tip: hayTarjeta && totalPropinas > 0 ? parseFloat(totalPropinas.toFixed(2)) : undefined }) });
        lastSaleId = sale.id;
      }
      await refreshCaja();
      if (lastSaleId) {
        try { await apiRequest(`/tickets/print/sale/${lastSaleId}`, { method: "POST" }); }
        catch { toast("Venta procesada, pero no se pudo imprimir", "warning"); }
      }
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
      <div className={styles.overlay}>
        <div className={styles.splitModal}>
          <div className={styles.header}>
            <span className={styles.title}>División de cuenta</span>
            <button className={styles.backBtn} onClick={() => setSplitMode(false)}>← Volver</button>
          </div>

          {/* Asignar productos */}
          <div className={styles.assignSection}>
            <p className={styles.sectionLabel}>Asignar productos</p>
            {cart.map((item, i) => {
              const maxQty = item.quantity;
              return (
                <div key={i} className={styles.assignRow}>
                  <div className={styles.assignInfo}>
                    <span className={styles.assignName}>{getItemName(item)}</span>
                    <span className={styles.assignSub}>x{item.quantity} · ${(item.priceSell * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className={styles.assignInputs}>
                    {cuentas.map(cuenta => {
                      const ci = cuenta.items.find(x => x.cartIndex === i);
                      const val = ci?.quantity ?? 0;
                      const available = maxQty - assignedQty(i, cuenta.id);
                      return (
                        <div key={cuenta.id} className={styles.assignInputGroup}>
                          <span className={styles.assignLabel}>C{cuenta.id}</span>
                          <input
                            type="number" min={0} max={available + val}
                            value={val}
                            onChange={e => assignItem(i, Math.min(Number(e.target.value), available + val), cuenta.id)}
                            className={styles.assignInput}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className={styles.progressRow}>
              <span className={styles.progressLabel}>Productos asignados</span>
              <span className={styles.progressCount} style={{ color: progreso === 100 ? "#16a34a" : "#94a3b8" }}>{totalAsignado} / {totalItems}</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progreso}%`, background: progreso === 100 ? "#16a34a" : "#3b82f6" }} />
            </div>
          </div>

          {/* Cuentas */}
          <div className={styles.cuentasSection}>
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
                <div key={cuenta.id} className={styles.cuentaCard}>
                  <div className={styles.cuentaHeader}>
                    <span className={styles.cuentaTitle}>Cuenta {cuenta.id}</span>
                    <div className={styles.cuentaActions}>
                      <button className={styles.printBtn} onClick={() => printCuenta(cuenta)} disabled={printingCuenta === cuenta.id || cuenta.items.length === 0}>
                        {printingCuenta === cuenta.id ? "..." : "🖨 Imprimir"}
                      </button>
                      {cuentas.length > 2 && (
                        <button className={styles.removeBtn} onClick={() => removeCuenta(cuenta.id)}>✕</button>
                      )}
                    </div>
                  </div>
                  <div className={styles.cuentaBody}>
                    {cuenta.items.length === 0
                      ? <p className={styles.emptyItems}>Sin productos asignados</p>
                      : cuenta.items.map(ci => {
                          const item = cart[ci.cartIndex];
                          return (
                            <div key={ci.cartIndex} className={styles.cuentaItem}>
                              <span>{ci.quantity}× {getItemName(item)}</span>
                              <span>${(item.priceSell * ci.quantity).toFixed(2)}</span>
                            </div>
                          );
                        })
                    }
                    <div className={styles.payToggle}>
                      {(["EFECTIVO", "TARJETA"] as const).map(p => (
                        <button
                          key={p}
                          className={`${styles.payPill} ${cuenta.payment === p ? styles.payPillActive : ""}`}
                          onClick={() => updateCuenta(cuenta.id, { payment: p, received: "", customTip: "", tipPercent: 0 })}
                        >
                          {p === "EFECTIVO" ? "Efectivo" : "Tarjeta"}
                        </button>
                      ))}
                    </div>

                    {cuenta.payment === "TARJETA" && (
                      <div className={styles.tipRow}>
                        {TIP_OPTIONS.map(pct => (
                          <button key={pct} type="button"
                            className={`${styles.tipPill} ${cuenta.tipPercent === pct && cuenta.customTip === "" ? styles.tipPillActive : ""}`}
                            onClick={() => updateCuenta(cuenta.id, { tipPercent: pct, customTip: "" })}
                          >
                            {pct === 0 ? "Sin propina" : `${pct}%`}
                          </button>
                        ))}
                      </div>
                    )}

                    {cuenta.payment === "EFECTIVO" && (
                      <div className={styles.receivedRow}>
                        <span className={styles.receivedLabel}>Recibido</span>
                        <input
                          type="number" min={0} placeholder={`$${tot.toFixed(2)}`}
                          value={cuenta.received}
                          onChange={e => updateCuenta(cuenta.id, { received: e.target.value })}
                          className={styles.receivedInput}
                        />
                        {cambio > 0 && <span className={styles.cambio}>Cambio: ${cambio.toFixed(2)}</span>}
                      </div>
                    )}

                    <div className={styles.cuentaTotal}>
                      <span>Total</span>
                      <strong>${tot.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
            <button className={styles.addCuentaBtn} onClick={addCuenta}>+ Agregar cuenta</button>
          </div>

          <div className={styles.footer}>
            <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>Cancelar</button>
            <button className={styles.confirmBtn} onClick={handleSplitConfirm} disabled={loading}>
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
    <div className={styles.overlay}>
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.title}>Resumen de venta</span>
          <button className={styles.splitTrigger} onClick={() => setSplitMode(true)}>
            ✂ Dividir cuenta
          </button>
        </div>

        {/* Items */}
        <div className={styles.itemsSection}>
          {cart.map((item, index) => (
            <div key={index} className={styles.itemRow}>
              <span className={styles.itemName}>{getItemName(item)} <span className={styles.itemQty}>×{item.quantity}</span></span>
              <span className={styles.itemPrice}>${(item.priceSell * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className={styles.totalsSection}>
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Subtotal</span>
            <span className={styles.totalValue}>${total.toFixed(2)}</span>
          </div>
          <div className={styles.totalRow}>
            <button className={styles.discountLink} onClick={() => setShowDescuento(!showDescuento)}>
              {showDescuento ? "— Cancelar descuento" : "+ Agregar descuento"}
            </button>
            {descuentoNum > 0 && <span className={styles.discountAmount}>−${descuentoNum.toFixed(2)}</span>}
          </div>
          {showDescuento && (
            <input
              type="number" min={0} placeholder="Monto de descuento"
              value={descuento}
              onChange={e => setDescuento(e.target.value)}
              className={styles.discountInput}
            />
          )}
          <div className={`${styles.totalRow} ${styles.grandTotalRow}`}>
            <span className={styles.grandTotal}>Total</span>
            <span className={styles.grandTotal}>${totalConDescuento.toFixed(2)}</span>
          </div>
        </div>

        {/* Método de pago */}
        <div className={styles.paymentSection}>
          <p className={styles.sectionLabel}>Método de pago</p>
          <div className={styles.paymentOptions}>
            <button
              className={`${styles.payOption} ${paymentType === "EFECTIVO" ? styles.payOptionActive : ""}`}
              onClick={() => { setPaymentType("EFECTIVO"); setReceived(""); setTipPercent(0); setCustomTip(""); }}
            >
              💵 Efectivo
            </button>
            <button
              className={`${styles.payOption} ${paymentType === "TARJETA" ? styles.payOptionActive : ""}`}
              onClick={() => { setPaymentType("TARJETA"); setReceived(""); }}
            >
              💳 Tarjeta
            </button>
          </div>
        </div>

        {/* Efectivo */}
        {paymentType === "EFECTIVO" && (
          <div className={styles.cashSection}>
            <label className={styles.fieldLabel}>Monto recibido</label>
            <input
              type="number"
              placeholder={`$${totalConDescuento.toFixed(2)}`}
              value={received}
              onChange={e => setReceived(e.target.value)}
              className={styles.fieldInput}
            />
            <div className={styles.changeRow}>
              <span className={styles.changeLabel}>Cambio</span>
              <span className={styles.changeValue}>${change.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Tarjeta + propina */}
        {paymentType === "TARJETA" && (
          <div className={styles.tipSection}>
            <p className={styles.sectionLabel}>Propina</p>
            <div className={styles.tipOptions}>
              {TIP_OPTIONS.map(pct => (
                <button key={pct} type="button"
                  className={`${styles.tipBtn} ${tipPercent === pct && customTip === "" ? styles.tipBtnActive : ""}`}
                  onClick={() => { setTipPercent(pct); setCustomTip(""); }}
                >
                  {pct === 0 ? "Sin propina" : `${pct}%`}
                </button>
              ))}
            </div>
            <input
              type="number" min={0} placeholder="Monto personalizado"
              value={customTip}
              onChange={e => { setCustomTip(e.target.value); setTipPercent(-1); }}
              className={styles.fieldInput}
              style={{ marginTop: 6 }}
            />
            {tipAmount > 0 && (
              <div className={styles.tipAmount}>
                <span>Propina</span>
                <span>+${tipAmount.toFixed(2)}</span>
              </div>
            )}
            <div className={`${styles.totalRow} ${styles.grandTotalRow}`} style={{ marginTop: 8 }}>
              <span className={styles.grandTotal}>Total con propina</span>
              <span className={styles.grandTotal}>${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>Cancelar</button>
          <button className={styles.confirmBtn} onClick={handleConfirm} disabled={loading}>
            {loading ? "Procesando..." : "Confirmar pago"}
          </button>
        </div>
      </div>
    </div>
  );
}