import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import styles from "./sales.module.css"
import { Printer } from "lucide-react";

// ---------------------------------------------------
// Types
// ---------------------------------------------------
type SaleItem = {
  id: number;
  productId: number | null;
  customName: string | null;
  quantity: number;
  priceUnit: number;
  subtotal: number;
  product?: { name: string };
};

type Sale = {
  id: number;
  total: number;
  payment: string;
  createdAt: string;
  items: SaleItem[];
  clientName?: string | null;
  clientPhone?: string | null;
  type?: string | null;
};

type OrderItem = {
  id: number;
  productId: number | null;
  customName: string | null;
  quantity: number;
  priceUnit: number;
  subtotal: number;
  product?: { name: string };
};

type CancelledOrder = {
  id: number;
  total: number;
  createdAt: string;
  clientName: string | null;
  type: string;
  cancelConcepto: string | null;
  items: OrderItem[];
};

type Movimiento = {
  id: number;
  tipo: "ENTRADA" | "SALIDA";
  monto: number;
  motivo: string | null;
  descripcion: string | null;
};

type Gasto = {
  id: number;
  concepto: string;
  monto: number;
};

type Caja = {
  id: number;
  montoInicial: number;
  fechaApertura: string;
  fechaCierre: string | null;
  totalEfectivo: number | null;
  totalTarjeta: number | null;
  totalGeneral: number | null;
  ventas: Sale[];
  gastos: Gasto[];
  movimientos: Movimiento[];
  user?: { name: string };
};

// ---------------------------------------------------
// Helpers
// ---------------------------------------------------
function formatCurrency(n: number) {
  return `$${n.toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDateTime(iso: string) {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

// ---------------------------------------------------
// Calcular resumen de una caja
// ---------------------------------------------------
function calcResumen(caja: Caja) {
  const efectivo = caja.ventas.filter((v) => v.payment?.toLowerCase() === "efectivo").reduce((s, v) => s + v.total, 0);
  const tarjeta  = caja.ventas.filter((v) => v.payment?.toLowerCase() === "tarjeta").reduce((s, v) => s + v.total, 0);
  const gastos   = caja.gastos.reduce((s, g) => s + g.monto, 0);
  const entradas = caja.movimientos.filter((m) => m.tipo === "ENTRADA").reduce((s, m) => s + m.monto, 0);
  const salidas  = caja.movimientos.filter((m) => m.tipo === "SALIDA").reduce((s, m) => s + m.monto, 0);
  const totalVentas  = efectivo + tarjeta;
  const totalGeneral = caja.totalGeneral ?? caja.montoInicial + efectivo + entradas - gastos - salidas;

  const itemMap: Record<string, { name: string; qty: number; total: number }> = {};
  for (const venta of caja.ventas) {
    for (const item of venta.items ?? []) {
      const name = item.product?.name ?? item.customName ?? `Item #${item.id}`;
      if (!itemMap[name]) itemMap[name] = { name, qty: 0, total: 0 };
      itemMap[name].qty += item.quantity;
      itemMap[name].total += item.subtotal;
    }
  }
  const topItems = Object.values(itemMap).sort((a, b) => b.total - a.total).slice(0, 5);

  return { efectivo, tarjeta, gastos, entradas, salidas, totalVentas, totalGeneral, topItems, ordenes: caja.ventas.length, avgTicket: caja.ventas.length ? totalVentas / caja.ventas.length : 0 };
}

// ---------------------------------------------------
// Stat Card
// ---------------------------------------------------
function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className={styles.statCard} style={{ "--accent": accent } as any}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  );
}

// ---------------------------------------------------
// Ventas con detalle expandible
// ---------------------------------------------------
function VentasDetalle({ ventas }: { ventas: Sale[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  if (ventas.length === 0) return null;
  return (
    <div style={{ background: "#fff", borderRadius: "14px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginTop: "1.5rem" }}>
      <h3 className={styles.sectionTitle}>Detalle de ventas ({ventas.length})</h3>
      <div className={styles.saleList}>
        {[...ventas].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((sale) => (
          <div key={sale.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
            <div className={styles.saleRow} style={{ borderBottom: "none", cursor: "pointer" }} onClick={() => setExpanded(expanded === sale.id ? null : sale.id)}>
              <div className={styles.saleLeft}>
                <span className={styles.saleId}>Venta #{sale.id}</span>
                <span className={styles.saleTime}>{formatTime(sale.createdAt)}</span>
                {sale.clientName && <span className={styles.saleTime}>{sale.clientName}</span>}
                {sale.clientPhone && <span className={styles.saleTime}>📞 {sale.clientPhone}</span>}
              </div>
              <div className={styles.saleRight}>
                <span className={`${styles.payBadge} ${sale.payment?.toLowerCase() === "efectivo" ? styles.payEfectivo : styles.payTarjeta}`}>{sale.payment}</span>
                <span className={styles.saleTotal}>{formatCurrency(sale.total)}</span>
                <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{expanded === sale.id ? "▲" : "▼"}</span>
              </div>
            </div>
            {expanded === sale.id && (
              <div style={{ padding: "0.5rem 0 0.75rem 0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {(sale.items ?? []).map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#475569" }}>
                    <span>{item.quantity}x {item.product?.name ?? item.customName ?? `Item #${item.id}`}</span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------
// Movimientos detallados
// ---------------------------------------------------
function MovimientosDetalle({ movimientos, gastos }: { movimientos: Movimiento[]; gastos: Gasto[] }) {
  const entradas = movimientos.filter((m) => m.tipo === "ENTRADA");
  const salidas  = movimientos.filter((m) => m.tipo === "SALIDA");
  if (movimientos.length === 0 && gastos.length === 0) return null;
  return (
    <div style={{ background: "#fff", borderRadius: "14px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginTop: "1.5rem" }}>
      <h3 className={styles.sectionTitle}>Movimientos y Gastos</h3>
      {entradas.length > 0 && (<><p className={styles.saleTime} style={{ marginBottom: "0.4rem" }}>Entradas</p><div className={styles.saleList}>{entradas.map((m) => (<div key={m.id} className={styles.saleRow}><span>{m.motivo ?? m.descripcion ?? "Sin concepto"}</span><span className={styles.positivo}>+{formatCurrency(m.monto)}</span></div>))}</div></>)}
      {salidas.length > 0 && (<><p className={styles.saleTime} style={{ marginTop: "0.75rem", marginBottom: "0.4rem" }}>Salidas</p><div className={styles.saleList}>{salidas.map((m) => (<div key={m.id} className={styles.saleRow}><span>{m.motivo ?? m.descripcion ?? "Sin concepto"}</span><span className={styles.negativo}>-{formatCurrency(m.monto)}</span></div>))}</div></>)}
      {gastos.length > 0 && (<><p className={styles.saleTime} style={{ marginTop: "0.75rem", marginBottom: "0.4rem" }}>Gastos</p><div className={styles.saleList}>{gastos.map((g) => (<div key={g.id} className={styles.saleRow}><span>{g.concepto}</span><span className={styles.negativo}>-{formatCurrency(g.monto)}</span></div>))}</div></>)}
    </div>
  );
}

// ---------------------------------------------------
// Órdenes Canceladas
// ---------------------------------------------------
function CancelledOrdersSection({ orders }: { orders: CancelledOrder[] }) {
  if (orders.length === 0) return null;
  return (
    <div style={{ background: "#fff", borderRadius: "14px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginTop: "1.5rem", border: "1px solid #fee2e2" }}>
      <h3 className={styles.sectionTitle} style={{ color: "#ef4444" }}>Órdenes canceladas ({orders.length})</h3>
      <div className={styles.saleList}>
        {[...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((order) => (
          <div key={order.id} className={styles.saleRow} style={{ alignItems: "flex-start", gap: "0.5rem" }}>
            <div className={styles.saleLeft}>
              <span className={styles.saleId}>Orden #{order.id}</span>
              <span className={styles.saleTime}>{formatTime(order.createdAt)}</span>
              {order.clientName && <span className={styles.saleTime}>{order.clientName}</span>}
              {order.cancelConcepto && <span className={styles.saleTime} style={{ fontSize: "0.75rem", color: "#ef4444", fontStyle: "italic" }}>Motivo: {order.cancelConcepto}</span>}
              <div style={{ marginTop: "0.2rem" }}>{order.items.map((item) => (<span key={item.id} className={styles.saleTime} style={{ display: "block", fontSize: "0.72rem" }}>{item.quantity}x {item.product?.name ?? item.customName ?? `Item #${item.id}`}</span>))}</div>
            </div>
            <div className={styles.saleRight}>
              <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: "#fee2e2", color: "#ef4444", whiteSpace: "nowrap" }}>CANCELADA</span>
              <span className={styles.saleTotal} style={{ color: "#ef4444" }}>{formatCurrency(order.total)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------
// RESUMEN PERIÓDICO (Semanal / Mensual)
// ---------------------------------------------------

function getWeekRange(offset: number): { start: Date; end: Date; label: string } {
  const now = new Date();
  const day = now.getDay(); // 0=dom
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  const label = offset === 0
    ? "Semana actual"
    : offset === -1
    ? "Semana pasada"
    : `${formatDate(monday.toISOString())} – ${formatDate(sunday.toISOString())}`;
  return { start: monday, end: sunday, label };
}

function getMonthRange(offset: number): { start: Date; end: Date; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end   = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const label = start.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  return { start, end, label: label.charAt(0).toUpperCase() + label.slice(1) };
}

function calcPeriodStats(cajas: Caja[], start: Date, end: Date) {
  const cajasDelPeriodo = cajas.filter((c) => {
    const apertura = new Date(c.fechaApertura);
    return apertura >= start && apertura <= end;
  });

  let efectivo = 0, tarjeta = 0, ordenes = 0, gastos = 0;

  for (const caja of cajasDelPeriodo) {
    for (const v of caja.ventas) {
      if (v.payment?.toLowerCase() === "efectivo") efectivo += v.total;
      else tarjeta += v.total;
      ordenes++;
    }
    gastos += caja.gastos.reduce((s, g) => s + g.monto, 0);
  }

  const totalVentas = efectivo + tarjeta;
  const avgTicket = ordenes > 0 ? totalVentas / ordenes : 0;

  // Top productos del período
  const itemMap: Record<string, { name: string; qty: number; total: number }> = {};
  for (const caja of cajasDelPeriodo) {
    for (const venta of caja.ventas) {
      for (const item of venta.items ?? []) {
        const name = item.product?.name ?? item.customName ?? `Item #${item.id}`;
        if (!itemMap[name]) itemMap[name] = { name, qty: 0, total: 0 };
        itemMap[name].qty += item.quantity;
        itemMap[name].total += item.subtotal;
      }
    }
  }
  const topItems = Object.values(itemMap).sort((a, b) => b.total - a.total).slice(0, 5);

  return { efectivo, tarjeta, totalVentas, ordenes, avgTicket, gastos, topItems, cajas: cajasDelPeriodo.length };
}

function ResumenPeriodo({ cajas }: { cajas: Caja[] }) {
  const [modo, setModo] = useState<"semanal" | "mensual">("semanal");
  const [offset, setOffset] = useState(0);

  const range = modo === "semanal" ? getWeekRange(offset) : getMonthRange(offset);
  const stats = calcPeriodStats(cajas, range.start, range.end);

  return (
    <div>
      {/* Sub-tabs Semanal / Mensual */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
        {(["semanal", "mensual"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setModo(m); setOffset(0); }}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: 8,
              border: "none",
              background: modo === m ? "#0f172a" : "#e2e8f0",
              color: modo === m ? "#fff" : "#64748b",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            {m === "semanal" ? "Semanal" : "Mensual"}
          </button>
        ))}
      </div>

      {/* Navegación de período */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", background: "#fff", borderRadius: 12, padding: "0.75rem 1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <button
          onClick={() => setOffset(o => o - 1)}
          style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "0.4rem 0.9rem", cursor: "pointer", fontWeight: 700, fontSize: "1rem" }}
        >
          ←
        </button>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontWeight: 700, color: "#0f172a", fontSize: "1rem" }}>{range.label}</p>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>
            {formatDate(range.start.toISOString())} → {formatDate(range.end.toISOString())}
          </p>
        </div>
        <button
          onClick={() => setOffset(o => o + 1)}
          disabled={offset >= 0}
          style={{ background: offset >= 0 ? "#f8fafc" : "#f1f5f9", border: "none", borderRadius: 8, padding: "0.4rem 0.9rem", cursor: offset >= 0 ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "1rem", color: offset >= 0 ? "#cbd5e1" : "#0f172a" }}
        >
          →
        </button>
      </div>

      {/* Stats del período */}
      <div className={styles.statsGrid}>
        <StatCard label="Ventas totales" value={formatCurrency(stats.totalVentas)} sub={`${stats.ordenes} órdenes · ${stats.cajas} cajas`} accent="#22c55e" />
        <StatCard label="Efectivo" value={formatCurrency(stats.efectivo)} accent="#f59e0b" />
        <StatCard label="Tarjeta" value={formatCurrency(stats.tarjeta)} accent="#8b5cf6" />
        <StatCard label="Ticket promedio" value={formatCurrency(stats.avgTicket)} accent="#3b82f6" />
        <StatCard label="Gastos" value={formatCurrency(stats.gastos)} accent="#ef4444" />
      </div>

      {/* Top productos del período */}
      {stats.topItems.length > 0 ? (
        <div className={styles.topItems} style={{ marginTop: "1.5rem" }}>
          <h3 className={styles.sectionTitle}>Top productos del período</h3>
          <table className={styles.table}>
            <thead>
              <tr><th>Producto</th><th>Cant.</th><th>Total</th><th>%</th></tr>
            </thead>
            <tbody>
              {stats.topItems.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{item.qty}</td>
                  <td>{formatCurrency(item.total)}</td>
                  <td><span className={styles.shareBadge}>{stats.totalVentas > 0 ? ((item.total / stats.totalVentas) * 100).toFixed(1) : "0"}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 14, padding: "2rem", textAlign: "center", marginTop: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <p style={{ color: "#94a3b8", margin: 0 }}>Sin ventas en este período</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------
// Today Panel
// ---------------------------------------------------
function TodayPanel({ caja, cancelledOrders }: { caja: Caja; cancelledOrders: CancelledOrder[] }) {
  const r = calcResumen(caja);
  return (
    <div className={styles.todayPanel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>Resumen del día</h2>
          <p className={styles.panelSub}>Caja abierta {formatDateTime(caja.fechaApertura)}{caja.user ? ` · ${caja.user.name}` : ""}</p>
        </div>
        <span className={styles.liveBadge}>● EN VIVO</span>
      </div>
      <div className={styles.statsGrid}>
        <StatCard label="Ventas brutas" value={formatCurrency(r.totalVentas)} sub={`${r.ordenes} órdenes`} accent="#22c55e" />
        <StatCard label="Ticket promedio" value={formatCurrency(r.avgTicket)} accent="#3b82f6" />
        <StatCard label="Efectivo" value={formatCurrency(r.efectivo)} accent="#f59e0b" />
        <StatCard label="Tarjeta" value={formatCurrency(r.tarjeta)} accent="#8b5cf6" />
        <StatCard label="Gastos" value={formatCurrency(r.gastos)} accent="#ef4444" />
        <StatCard label="Total en caja" value={formatCurrency(r.totalGeneral)} sub={`Inicial: ${formatCurrency(caja.montoInicial)}`} accent="#14b8a6" />
      </div>
      <div className={styles.bottomGrid}>
        <div className={styles.topItems}>
          <h3 className={styles.sectionTitle}>Top productos</h3>
          {r.topItems.length === 0 ? <p className={styles.empty}>Sin ventas aún</p> : (
            <table className={styles.table}>
              <thead><tr><th>Producto</th><th>Cant.</th><th>Total</th><th>%</th></tr></thead>
              <tbody>{r.topItems.map((item) => (<tr key={item.name}><td>{item.name}</td><td>{item.qty}</td><td>{formatCurrency(item.total)}</td><td><span className={styles.shareBadge}>{r.totalVentas > 0 ? ((item.total / r.totalVentas) * 100).toFixed(1) : "0"}%</span></td></tr>))}</tbody>
            </table>
          )}
        </div>
        <div className={styles.recentSales}>
          <h3 className={styles.sectionTitle}>Ventas recientes</h3>
          {caja.ventas.length === 0 ? <p className={styles.empty}>Sin ventas aún</p> : (
            <div className={styles.saleList}>
              {[...caja.ventas].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8).map((sale) => (
                <div key={sale.id} className={styles.saleRow}>
                  <div className={styles.saleLeft}>
                    <span className={styles.saleId}>Venta #{sale.id}</span>
                    <span className={styles.saleTime}>{formatTime(sale.createdAt)}</span>
                  </div>
                  <div className={styles.saleRight}>
                    <span className={`${styles.payBadge} ${sale.payment?.toLowerCase() === "efectivo" ? styles.payEfectivo : styles.payTarjeta}`}>{sale.payment}</span>
                    <span className={styles.saleTotal}>{formatCurrency(sale.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <VentasDetalle ventas={caja.ventas} />
      <CancelledOrdersSection orders={cancelledOrders} />
      <MovimientosDetalle movimientos={caja.movimientos} gastos={caja.gastos} />
    </div>
  );
}

// ---------------------------------------------------
// History Panel
// ---------------------------------------------------
function HistoryPanel({ cajas, cancelledByCaja }: { cajas: Caja[]; cancelledByCaja: Record<number, CancelledOrder[]> }) {
  const [selected, setSelected] = useState<Caja | null>(null);
  const closed = cajas.filter((c) => c.fechaCierre !== null);
  return (
    <div className={styles.historyPanel}>
      <h2 className={styles.panelTitle}>Historial de cajas</h2>
      <p className={styles.panelSub}>{closed.length} cierres registrados</p>
      <div className={styles.historyGrid}>
        <div className={styles.historyList}>
          {closed.length === 0 && <p className={styles.empty}>Sin historial</p>}
          {closed.map((caja) => {
            const r = calcResumen(caja);
            return (
              <div key={caja.id} className={`${styles.historyCard} ${selected?.id === caja.id ? styles.historyCardActive : ""}`} onClick={() => setSelected(selected?.id === caja.id ? null : caja)}>
                <div className={styles.historyCardTop}>
                  <span className={styles.historyDate}>{formatDate(caja.fechaApertura)}</span>
                  <span className={styles.historyTotal}>{formatCurrency(r.totalVentas)}</span>
                </div>
                <div className={styles.historyCardSub}>
                  <span>{r.ordenes} órdenes</span>
                  <span>{formatTime(caja.fechaApertura)} → {caja.fechaCierre ? formatTime(caja.fechaCierre) : "—"}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className={styles.historyDetail}>
          {!selected ? (
            <div className={styles.emptyDetail}><span>←</span><p>Selecciona una caja para ver el detalle</p></div>
          ) : (
            <CajaDetail caja={selected} cancelledOrders={cancelledByCaja[selected.id] ?? []} />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------
// Caja Detail
// ---------------------------------------------------
function CajaDetail({ caja, cancelledOrders }: { caja: Caja; cancelledOrders: CancelledOrder[] }) {
  const r = calcResumen(caja);
  const [printing, setPrinting] = useState(false);
  const [printMsg, setPrintMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handlePrint() {
    setPrinting(true); setPrintMsg(null);
    try {
      await apiRequest(`/tickets/print/corte/${caja.id}`, { method: "POST" });
      setPrintMsg({ text: "Corte enviado a impresora", ok: true });
    } catch { setPrintMsg({ text: "No se pudo imprimir el corte", ok: false }); }
    finally { setPrinting(false); setTimeout(() => setPrintMsg(null), 3000); }
  }

  return (
    <div className={styles.cajaDetail}>
      <div className={styles.detailHeader} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <h3>Caja #{caja.id} · {formatDate(caja.fechaApertura)}</h3>
          <p className={styles.panelSub}>{formatTime(caja.fechaApertura)} → {caja.fechaCierre ? formatTime(caja.fechaCierre) : "Abierta"}{caja.user ? ` · ${caja.user.name}` : ""}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
          <button onClick={handlePrint} disabled={printing} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", background: printing ? "#e2e8f0" : "#0f172a", color: printing ? "#94a3b8" : "#fff", border: "none", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 600, cursor: printing ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
            <Printer size={15} />{printing ? "Imprimiendo..." : "Reimprimir corte"}
          </button>
          {printMsg && <span style={{ fontSize: "0.75rem", color: printMsg.ok ? "#16a34a" : "#ef4444", fontWeight: 500 }}>{printMsg.ok ? "✓" : "✗"} {printMsg.text}</span>}
        </div>
      </div>
      <div className={styles.detailStats}>
        <StatCard label="Ventas" value={formatCurrency(r.totalVentas)} accent="#22c55e" />
        <StatCard label="Efectivo" value={formatCurrency(r.efectivo)} accent="#f59e0b" />
        <StatCard label="Tarjeta" value={formatCurrency(r.tarjeta)} accent="#8b5cf6" />
        <StatCard label="Gastos" value={formatCurrency(r.gastos)} accent="#ef4444" />
        <StatCard label="Entradas" value={formatCurrency(r.entradas)} accent="#10b981" />
        <StatCard label="Salidas" value={formatCurrency(r.salidas)} accent="#f97316" />
        <StatCard label="Total final" value={formatCurrency(r.totalGeneral)} accent="#14b8a6" />
        <StatCard label="Ticket prom." value={formatCurrency(r.avgTicket)} accent="#3b82f6" />
      </div>
      {r.topItems.length > 0 && (
        <>
          <h4 className={styles.sectionTitle} style={{ marginTop: "1.5rem" }}>Top productos</h4>
          <table className={styles.table}>
            <thead><tr><th>Producto</th><th>Cant.</th><th>Total</th><th>%</th></tr></thead>
            <tbody>{r.topItems.map((item) => (<tr key={item.name}><td>{item.name}</td><td>{item.qty}</td><td>{formatCurrency(item.total)}</td><td><span className={styles.shareBadge}>{r.totalVentas > 0 ? ((item.total / r.totalVentas) * 100).toFixed(1) : "0"}%</span></td></tr>))}</tbody>
          </table>
        </>
      )}
      <VentasDetalle ventas={caja.ventas} />
      <CancelledOrdersSection orders={cancelledOrders} />
      <MovimientosDetalle movimientos={caja.movimientos} gastos={caja.gastos} />
    </div>
  );
}

// ---------------------------------------------------
// Main Page
// ---------------------------------------------------
export default function SalesReportPage() {
  const [cajaActual, setCajaActual] = useState<Caja | null>(null);
  const [historico, setHistorico] = useState<Caja[]>([]);
  const [cancelledToday, setCancelledToday] = useState<CancelledOrder[]>([]);
  const [cancelledByCaja, setCancelledByCaja] = useState<Record<number, CancelledOrder[]>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"today" | "history" | "resumen">("today");

  const fetchData = async () => {
    try {
      const [actual, all] = await Promise.all([
        apiRequest("/caja/actual").catch(() => null),
        apiRequest("/caja").catch(() => []),
      ]);
      setCajaActual(actual);
      setHistorico(all);

      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const cancelled: CancelledOrder[] = await apiRequest(`/orders?status=CANCELLED&from=${todayStart.toISOString()}&to=${new Date().toISOString()}`).catch(() => []);
      setCancelledToday(cancelled);

      const closedCajas: Caja[] = (all as Caja[]).filter((c) => c.fechaCierre !== null);
      const cancelledPerCaja: Record<number, CancelledOrder[]> = {};
      await Promise.all(closedCajas.map(async (caja) => {
        const orders: CancelledOrder[] = await apiRequest(`/orders?status=CANCELLED&from=${new Date(caja.fechaApertura).toISOString()}&to=${new Date(caja.fechaCierre!).toISOString()}`).catch(() => []);
        cancelledPerCaja[caja.id] = orders;
      }));
      setCancelledByCaja(cancelledPerCaja);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className={styles.container}><div className={styles.loading}>Cargando reportes...</div></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reportes de Ventas</h1>
          <p className={styles.subtitle}>Rendimiento de ventas, gastos y movimientos de caja</p>
        </div>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === "today" ? styles.tabActive : ""}`} onClick={() => setTab("today")}>Hoy</button>
          <button className={`${styles.tab} ${tab === "history" ? styles.tabActive : ""}`} onClick={() => setTab("history")}>Historial</button>
          <button className={`${styles.tab} ${tab === "resumen" ? styles.tabActive : ""}`} onClick={() => setTab("resumen")}>Resumen</button>
        </div>
      </div>

      {tab === "today" ? (
        cajaActual ? <TodayPanel caja={cajaActual} cancelledOrders={cancelledToday} /> : <div className={styles.noCaja}><p>No hay caja abierta en este momento.</p></div>
      ) : tab === "history" ? (
        <HistoryPanel cajas={historico} cancelledByCaja={cancelledByCaja} />
      ) : (
        <ResumenPeriodo cajas={historico} />
      )}
    </div>
  );
}