import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import styles from "./sales.module.css";
import { Printer } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

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
  order?: {
    clientName: string | null;
    clientPhone: string | null;
    clientNotes: string | null;
    type: string;
  } | null;
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
  const efectivo = caja.ventas
    .filter((v) => v.payment?.toLowerCase() === "efectivo")
    .reduce((s, v) => s + v.total, 0);
  const tarjeta = caja.ventas
    .filter((v) => v.payment?.toLowerCase() === "tarjeta")
    .reduce((s, v) => s + v.total, 0);
  const gastos   = caja.gastos.reduce((s, g) => s + g.monto, 0);
  const entradas = caja.movimientos.filter((m) => m.tipo === "ENTRADA").reduce((s, m) => s + m.monto, 0);
  const salidas  = caja.movimientos.filter((m) => m.tipo === "SALIDA").reduce((s, m) => s + m.monto, 0);
  const totalVentas = efectivo + tarjeta;
  const totalGeneral =
    caja.totalGeneral ??
    caja.montoInicial + efectivo + entradas - gastos - salidas;

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

  return {
    efectivo, tarjeta, gastos, entradas, salidas,
    totalVentas, totalGeneral, topItems,
    ordenes: caja.ventas.length,
    avgTicket: caja.ventas.length ? totalVentas / caja.ventas.length : 0,
  };
}

// ---------------------------------------------------
// Stat Card
// ---------------------------------------------------
function StatCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className={styles.statCard} style={{ "--accent": accent } as any}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  );
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  DELIVERY: "🛵 Delivery",
  TAKEAWAY: "🥡 Para llevar",
  DINE_IN: "🍽️ Mesa",
};

// ---------------------------------------------------
// Fila de venta expandible
// ---------------------------------------------------
function SaleRow({ sale }: { sale: Sale }) {
  const [expanded, setExpanded] = useState(false);
  const clientName  = sale.order?.clientName;
  const clientPhone = sale.order?.clientPhone;
  const clientNotes = sale.order?.clientNotes;
  const orderType   = sale.order?.type;
  const isDineIn    = orderType === "DINE_IN";
  const hasClient   = !isDineIn && (clientName || clientPhone || clientNotes);

  return (
    <div
      className={styles.saleRow}
      style={{ alignItems: "flex-start", flexDirection: "column", cursor: hasClient ? "pointer" : "default" }}
      onClick={() => hasClient && setExpanded((e) => !e)}
    >
      <div style={{ display: "flex", width: "100%", alignItems: "flex-start" }}>
        <div className={styles.saleLeft} style={{ flex: 1 }}>
          <span className={styles.saleId}>Venta #{sale.id}</span>
          <span className={styles.saleTime}>{formatTime(sale.createdAt)}</span>
          {orderType && (
            <span className={styles.saleTime} style={{ fontSize: "0.72rem", marginTop: "0.1rem" }}>
              {ORDER_TYPE_LABEL[orderType] ?? orderType}
            </span>
          )}
          {!isDineIn && clientName && (
            <span className={styles.saleTime} style={{ fontSize: "0.75rem" }}>👤 {clientName}</span>
          )}
        </div>
        <div className={styles.saleRight}>
          <span className={`${styles.payBadge} ${sale.payment?.toLowerCase() === "efectivo" ? styles.payEfectivo : styles.payTarjeta}`}>
            {sale.payment}
          </span>
          <span className={styles.saleTotal}>{formatCurrency(sale.total)}</span>
          {hasClient && (
            <span style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: "0.25rem" }}>
              {expanded ? "▲ ocultar" : "▼ ver más"}
            </span>
          )}
        </div>
      </div>

      {expanded && hasClient && (
        <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed #e2e8f0", width: "100%", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          {clientPhone && <span style={{ fontSize: "0.78rem", color: "#475569" }}>📞 {clientPhone}</span>}
          {clientNotes && <span style={{ fontSize: "0.78rem", color: "#475569", fontStyle: "italic" }}>📝 {clientNotes}</span>}
          <div style={{ marginTop: "0.35rem" }}>
            {sale.items.map((item) => (
              <span key={item.id} style={{ display: "block", fontSize: "0.72rem", color: "#64748b" }}>
                {item.quantity}x {item.product?.name ?? item.customName ?? `Item #${item.id}`} — {formatCurrency(item.subtotal)}
              </span>
            ))}
          </div>
        </div>
      )}
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
      {entradas.length > 0 && (
        <>
          <p className={styles.saleTime} style={{ marginBottom: "0.4rem" }}>Entradas</p>
          <div className={styles.saleList}>
            {entradas.map((m) => (
              <div key={m.id} className={styles.saleRow}>
                <span>{m.motivo ?? m.descripcion ?? "Sin concepto"}</span>
                <span className={styles.positivo}>+{formatCurrency(m.monto)}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {salidas.length > 0 && (
        <>
          <p className={styles.saleTime} style={{ marginTop: "0.75rem", marginBottom: "0.4rem" }}>Salidas</p>
          <div className={styles.saleList}>
            {salidas.map((m) => (
              <div key={m.id} className={styles.saleRow}>
                <span>{m.motivo ?? m.descripcion ?? "Sin concepto"}</span>
                <span className={styles.negativo}>-{formatCurrency(m.monto)}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {gastos.length > 0 && (
        <>
          <p className={styles.saleTime} style={{ marginTop: "0.75rem", marginBottom: "0.4rem" }}>Gastos</p>
          <div className={styles.saleList}>
            {gastos.map((g) => (
              <div key={g.id} className={styles.saleRow}>
                <span>{g.concepto}</span>
                <span className={styles.negativo}>-{formatCurrency(g.monto)}</span>
              </div>
            ))}
          </div>
        </>
      )}
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
        {[...orders]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((order) => (
            <div key={order.id} className={styles.saleRow} style={{ alignItems: "flex-start", gap: "0.5rem" }}>
              <div className={styles.saleLeft}>
                <span className={styles.saleId}>Orden #{order.id}</span>
                <span className={styles.saleTime}>{formatTime(order.createdAt)}</span>
                {order.clientName && <span className={styles.saleTime}>{order.clientName}</span>}
                {order.cancelConcepto && (
                  <span className={styles.saleTime} style={{ fontSize: "0.75rem", color: "#ef4444", fontStyle: "italic", marginTop: "0.15rem" }}>
                    Motivo: {order.cancelConcepto}
                  </span>
                )}
                <div style={{ marginTop: "0.2rem" }}>
                  {order.items.map((item) => (
                    <span key={item.id} className={styles.saleTime} style={{ display: "block", fontSize: "0.72rem" }}>
                      {item.quantity}x {item.product?.name ?? item.customName ?? `Item #${item.id}`}
                    </span>
                  ))}
                </div>
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
// Top Productos — barras horizontales custom (sin recharts)
// ---------------------------------------------------
const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#14b8a6"];

function TopProductsChart({ items, totalVentas }: {
  items: { name: string; qty: number; total: number }[];
  totalVentas: number;
}) {
  if (items.length === 0) return <p className={styles.empty}>Sin datos</p>;
  const max = Math.max(...items.map((i) => i.total));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      {items.map((item, idx) => {
        const pct   = max > 0 ? (item.total / max) * 100 : 0;
        const share = totalVentas > 0 ? ((item.total / totalVentas) * 100).toFixed(1) : "0";
        return (
          <div key={item.name}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0f172a", maxWidth: "55%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.name}
              </span>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                {item.qty} uds · {formatCurrency(item.total)} · <strong>{share}%</strong>
              </span>
            </div>
            <div style={{ height: "10px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${pct}%`,
                background: CHART_COLORS[idx % CHART_COLORS.length],
                borderRadius: "999px",
                transition: "width 0.6s ease",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------
// Gráfica de ventas por día de la semana (recharts)
// ---------------------------------------------------
const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAY_COLORS = ["#6366f1", "#6366f1", "#6366f1", "#6366f1", "#22c55e", "#f59e0b", "#ef4444"];

function buildDayOfWeekData(cajas: Caja[]) {
  const totals = Array(7).fill(0);
  for (const caja of cajas) {
    for (const venta of caja.ventas) {
      const d   = new Date(venta.createdAt);
      const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
      totals[dow] += venta.total;
    }
  }
  return DAY_NAMES.map((name, i) => ({ name, total: totals[i] }));
}

function DayOfWeekChart({ cajas }: { cajas: Caja[] }) {
  const data    = buildDayOfWeekData(cajas);
  const hasData = data.some((d) => d.total > 0);
  if (!hasData) return <p className={styles.empty}>Sin datos suficientes</p>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value: any) => [formatCurrency(Number(value)), "Ventas"]}
          contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.8rem" }}
        />
        <Bar dataKey="total" radius={[6, 6, 0, 0]}>
          {data.map((_, idx) => <Cell key={idx} fill={DAY_COLORS[idx]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------
// Reports Panel
// ---------------------------------------------------
type ReportPeriod = "weekly" | "monthly";

function buildPeriods(cajas: Caja[], mode: ReportPeriod) {
  const closed  = cajas.filter((c) => c.fechaCierre !== null);
  const buckets: Record<string, { label: string; cajas: Caja[] }> = {};

  for (const caja of closed) {
    const date = new Date(caja.fechaApertura);
    let key: string, label: string;

    if (mode === "monthly") {
      key   = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      label = date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    } else {
      const day = date.getDay() === 0 ? 6 : date.getDay() - 1;
      const mon = new Date(date); mon.setDate(date.getDate() - day);
      const sun = new Date(mon);  sun.setDate(mon.getDate() + 6);
      key   = mon.toISOString().slice(0, 10);
      label = `${formatDate(mon.toISOString())} – ${formatDate(sun.toISOString())}`;
    }

    if (!buckets[key]) buckets[key] = { label, cajas: [] };
    buckets[key].cajas.push(caja);
  }

  return Object.entries(buckets)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, val]) => ({ key, ...val }));
}

function calcPeriodStats(cajas: Caja[]) {
  let totalVentas = 0, efectivo = 0, tarjeta = 0, gastos = 0, ordenes = 0, entradas = 0, salidas = 0;
  const itemMap: Record<string, { name: string; qty: number; total: number }> = {};

  for (const caja of cajas) {
    const r = calcResumen(caja);
    totalVentas += r.totalVentas;
    efectivo    += r.efectivo;
    tarjeta     += r.tarjeta;
    gastos      += r.gastos;
    ordenes     += r.ordenes;
    entradas    += r.entradas;
    salidas     += r.salidas;

    for (const item of r.topItems) {
      if (!itemMap[item.name]) itemMap[item.name] = { name: item.name, qty: 0, total: 0 };
      itemMap[item.name].qty   += item.qty;
      itemMap[item.name].total += item.total;
    }
  }

  const topItems  = Object.values(itemMap).sort((a, b) => b.total - a.total).slice(0, 5);
  const avgTicket = ordenes ? totalVentas / ordenes : 0;
  return { totalVentas, efectivo, tarjeta, gastos, ordenes, avgTicket, topItems, entradas, salidas };
}

function ReportsPanel({ cajas }: { cajas: Caja[] }) {
  const [mode, setMode]             = useState<ReportPeriod>("weekly");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const periods        = buildPeriods(cajas, mode);
  const selectedPeriod = periods.find((p) => p.key === selectedKey) ?? null;
  const selectedStats  = selectedPeriod ? calcPeriodStats(selectedPeriod.cajas) : null;
  const currentIdx     = periods.findIndex((p) => p.key === selectedKey);
  const prevPeriod     = currentIdx >= 0 && currentIdx + 1 < periods.length ? periods[currentIdx + 1] : null;
  const prevStats      = prevPeriod ? calcPeriodStats(prevPeriod.cajas) : null;

  function DiffBadge({ curr, prev }: { curr: number; prev: number }) {
    if (!prev) return null;
    const pct = ((curr - prev) / prev) * 100;
    const up  = pct >= 0;
    return (
      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: up ? "#16a34a" : "#ef4444", background: up ? "#dcfce7" : "#fee2e2", borderRadius: "999px", padding: "2px 7px", marginLeft: "0.4rem" }}>
        {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
      </span>
    );
  }

  return (
    <div className={styles.historyPanel}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <h2 className={styles.panelTitle}>Reportes</h2>
          <p className={styles.panelSub}>{periods.length} períodos registrados</p>
        </div>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${mode === "weekly"  ? styles.tabActive : ""}`} onClick={() => { setMode("weekly");  setSelectedKey(null); }}>Semanal</button>
          <button className={`${styles.tab} ${mode === "monthly" ? styles.tabActive : ""}`} onClick={() => { setMode("monthly"); setSelectedKey(null); }}>Mensual</button>
        </div>
      </div>

      {/* Gráfica días de la semana — siempre visible */}
      <div style={{ background: "#fff", borderRadius: "14px", padding: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: "1.5rem" }}>
        <h3 className={styles.sectionTitle} style={{ marginBottom: "1rem" }}>Ventas por día de la semana</h3>
        <DayOfWeekChart cajas={cajas.filter((c) => c.fechaCierre !== null)} />
      </div>

      <div className={styles.historyGrid}>
        {/* Lista de períodos */}
        <div className={styles.historyList}>
          {periods.length === 0 && <p className={styles.empty}>Sin datos registrados</p>}
          {periods.map((period) => {
            const s = calcPeriodStats(period.cajas);
            return (
              <div
                key={period.key}
                className={`${styles.historyCard} ${selectedKey === period.key ? styles.historyCardActive : ""}`}
                onClick={() => setSelectedKey(selectedKey === period.key ? null : period.key)}
              >
                <div className={styles.historyCardTop}>
                  <span className={styles.historyDate} style={{ fontSize: "0.8rem" }}>{period.label}</span>
                  <span className={styles.historyTotal}>{formatCurrency(s.totalVentas)}</span>
                </div>
                <div className={styles.historyCardSub}>
                  <span>{s.ordenes} órdenes · {period.cajas.length} cajas</span>
                  <span>Prom. {formatCurrency(s.avgTicket)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detalle del período */}
        <div className={styles.historyDetail}>
          {!selectedPeriod || !selectedStats ? (
            <div className={styles.emptyDetail}>
              <span>←</span>
              <p>Selecciona un período para ver el reporte</p>
            </div>
          ) : (
            <div className={styles.cajaDetail}>
              <h3 style={{ marginBottom: "0.25rem" }}>{selectedPeriod.label}</h3>
              <p className={styles.panelSub} style={{ marginBottom: "1rem" }}>
                {selectedPeriod.cajas.length} cajas · {selectedStats.ordenes} órdenes
              </p>

              {/* Stats con entradas y salidas */}
              <div className={styles.detailStats}>
                <div className={styles.statCard} style={{ "--accent": "#22c55e" } as any}>
                  <span className={styles.statLabel}>Total ventas</span>
                  <span className={styles.statValue}>
                    {formatCurrency(selectedStats.totalVentas)}
                    {prevStats && <DiffBadge curr={selectedStats.totalVentas} prev={prevStats.totalVentas} />}
                  </span>
                  {prevStats && <span className={styles.statSub}>Período ant.: {formatCurrency(prevStats.totalVentas)}</span>}
                </div>
                <div className={styles.statCard} style={{ "--accent": "#f59e0b" } as any}>
                  <span className={styles.statLabel}>Efectivo</span>
                  <span className={styles.statValue}>
                    {formatCurrency(selectedStats.efectivo)}
                    {prevStats && <DiffBadge curr={selectedStats.efectivo} prev={prevStats.efectivo} />}
                  </span>
                </div>
                <div className={styles.statCard} style={{ "--accent": "#8b5cf6" } as any}>
                  <span className={styles.statLabel}>Tarjeta</span>
                  <span className={styles.statValue}>
                    {formatCurrency(selectedStats.tarjeta)}
                    {prevStats && <DiffBadge curr={selectedStats.tarjeta} prev={prevStats.tarjeta} />}
                  </span>
                </div>
                <div className={styles.statCard} style={{ "--accent": "#ef4444" } as any}>
                  <span className={styles.statLabel}>Gastos</span>
                  <span className={styles.statValue}>{formatCurrency(selectedStats.gastos)}</span>
                </div>
                <div className={styles.statCard} style={{ "--accent": "#16a34a" } as any}>
                  <span className={styles.statLabel}>Entradas</span>
                  <span className={styles.statValue}>
                    +{formatCurrency(selectedStats.entradas)}
                    {prevStats && <DiffBadge curr={selectedStats.entradas} prev={prevStats.entradas} />}
                  </span>
                </div>
                <div className={styles.statCard} style={{ "--accent": "#dc2626" } as any}>
                  <span className={styles.statLabel}>Salidas</span>
                  <span className={styles.statValue}>
                    -{formatCurrency(selectedStats.salidas)}
                    {prevStats && <DiffBadge curr={selectedStats.salidas} prev={prevStats.salidas} />}
                  </span>
                </div>
                <div className={styles.statCard} style={{ "--accent": "#3b82f6" } as any}>
                  <span className={styles.statLabel}>Ticket promedio</span>
                  <span className={styles.statValue}>
                    {formatCurrency(selectedStats.avgTicket)}
                    {prevStats && <DiffBadge curr={selectedStats.avgTicket} prev={prevStats.avgTicket} />}
                  </span>
                </div>
              </div>

              {/* Gráfica top productos — reemplaza tabla */}
              {selectedStats.topItems.length > 0 && (
                <div style={{ marginTop: "1.5rem" }}>
                  <h4 className={styles.sectionTitle} style={{ marginBottom: "1rem" }}>Top productos del período</h4>
                  <TopProductsChart items={selectedStats.topItems} totalVentas={selectedStats.totalVentas} />
                </div>
              )}

              {/* Desglose por caja */}
              <h4 className={styles.sectionTitle} style={{ marginTop: "1.5rem" }}>Cajas del período</h4>
              <div className={styles.saleList}>
                {[...selectedPeriod.cajas]
                  .sort((a, b) => new Date(b.fechaApertura).getTime() - new Date(a.fechaApertura).getTime())
                  .map((caja) => {
                    const r = calcResumen(caja);
                    return (
                      <div key={caja.id} className={styles.saleRow}>
                        <div className={styles.saleLeft}>
                          <span className={styles.saleId}>Caja #{caja.id}</span>
                          <span className={styles.saleTime}>
                            {formatDate(caja.fechaApertura)} · {formatTime(caja.fechaApertura)} → {caja.fechaCierre ? formatTime(caja.fechaCierre) : "—"}
                          </span>
                          {caja.user && <span className={styles.saleTime}>{caja.user.name}</span>}
                        </div>
                        <div className={styles.saleRight}>
                          <span className={styles.saleTotal}>{formatCurrency(r.totalVentas)}</span>
                          <span className={styles.saleTime}>{r.ordenes} órdenes</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
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
          <p className={styles.panelSub}>
            Caja abierta {formatDateTime(caja.fechaApertura)}
            {caja.user ? ` · ${caja.user.name}` : ""}
          </p>
        </div>
        <span className={styles.liveBadge}>● EN VIVO</span>
      </div>

      {/* Stats con entradas y salidas */}
      <div className={styles.statsGrid}>
        <StatCard label="Ventas brutas"   value={formatCurrency(r.totalVentas)} sub={`${r.ordenes} órdenes`} accent="#22c55e" />
        <StatCard label="Ticket promedio" value={formatCurrency(r.avgTicket)}   accent="#3b82f6" />
        <StatCard label="Efectivo"        value={formatCurrency(r.efectivo)}    accent="#f59e0b" />
        <StatCard label="Tarjeta"         value={formatCurrency(r.tarjeta)}     accent="#8b5cf6" />
        <StatCard label="Gastos"          value={formatCurrency(r.gastos)}      accent="#ef4444" />
        <StatCard label="Entradas"        value={`+${formatCurrency(r.entradas)}`} accent="#16a34a" />
        <StatCard label="Salidas"         value={`-${formatCurrency(r.salidas)}`}  accent="#dc2626" />
        <StatCard label="Total en caja"   value={formatCurrency(r.totalGeneral)} sub={`Inicial: ${formatCurrency(caja.montoInicial)}`} accent="#14b8a6" />
      </div>

      <div className={styles.bottomGrid}>
        {/* Top productos como gráfica */}
        <div className={styles.topItems}>
          <h3 className={styles.sectionTitle}>Top productos</h3>
          {r.topItems.length === 0 ? (
            <p className={styles.empty}>Sin ventas aún</p>
          ) : (
            <TopProductsChart items={r.topItems} totalVentas={r.totalVentas} />
          )}
        </div>

        <div className={styles.recentSales}>
          <h3 className={styles.sectionTitle}>Ventas recientes</h3>
          {caja.ventas.length === 0 ? (
            <p className={styles.empty}>Sin ventas aún</p>
          ) : (
            <div className={styles.saleList}>
              {[...caja.ventas]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 8)
                .map((sale) => <SaleRow key={sale.id} sale={sale} />)}
            </div>
          )}
        </div>
      </div>

      <CancelledOrdersSection orders={cancelledOrders} />
      <MovimientosDetalle movimientos={caja.movimientos} gastos={caja.gastos} />
    </div>
  );
}

// ---------------------------------------------------
// History Panel
// ---------------------------------------------------
function HistoryPanel({ cajas, cancelledByCaja }: {
  cajas: Caja[];
  cancelledByCaja: Record<number, CancelledOrder[]>;
}) {
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
              <div
                key={caja.id}
                className={`${styles.historyCard} ${selected?.id === caja.id ? styles.historyCardActive : ""}`}
                onClick={() => setSelected(selected?.id === caja.id ? null : caja)}
              >
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
            <div className={styles.emptyDetail}>
              <span>←</span>
              <p>Selecciona una caja para ver el detalle</p>
            </div>
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
    setPrinting(true);
    setPrintMsg(null);
    try {
      await apiRequest(`/tickets/print/corte/${caja.id}`, { method: "POST" });
      setPrintMsg({ text: "Corte enviado a impresora", ok: true });
    } catch {
      setPrintMsg({ text: "No se pudo imprimir el corte", ok: false });
    } finally {
      setPrinting(false);
      setTimeout(() => setPrintMsg(null), 3000);
    }
  }

  return (
    <div className={styles.cajaDetail}>
      <div className={styles.detailHeader} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <h3>Caja #{caja.id} · {formatDate(caja.fechaApertura)}</h3>
          <p className={styles.panelSub}>
            {formatTime(caja.fechaApertura)} → {caja.fechaCierre ? formatTime(caja.fechaCierre) : "Abierta"}
            {caja.user ? ` · ${caja.user.name}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
          <button
            onClick={handlePrint}
            disabled={printing}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              padding: "0.5rem 1rem",
              background: printing ? "#e2e8f0" : "#0f172a",
              color: printing ? "#94a3b8" : "#fff",
              border: "none", borderRadius: "8px",
              fontSize: "0.8rem", fontWeight: 600,
              cursor: printing ? "not-allowed" : "pointer",
              transition: "background 0.2s", whiteSpace: "nowrap",
            }}
          >
            <Printer size={15} />
            {printing ? "Imprimiendo..." : "Reimprimir corte"}
          </button>
          {printMsg && (
            <span style={{ fontSize: "0.75rem", color: printMsg.ok ? "#16a34a" : "#ef4444", fontWeight: 500 }}>
              {printMsg.ok ? "✓" : "✗"} {printMsg.text}
            </span>
          )}
        </div>
      </div>

      {/* Stats con entradas y salidas */}
      <div className={styles.detailStats}>
        <StatCard label="Ventas"       value={formatCurrency(r.totalVentas)}  accent="#22c55e" />
        <StatCard label="Efectivo"     value={formatCurrency(r.efectivo)}     accent="#f59e0b" />
        <StatCard label="Tarjeta"      value={formatCurrency(r.tarjeta)}      accent="#8b5cf6" />
        <StatCard label="Gastos"       value={formatCurrency(r.gastos)}       accent="#ef4444" />
        <StatCard label="Entradas"     value={`+${formatCurrency(r.entradas)}`} accent="#16a34a" />
        <StatCard label="Salidas"      value={`-${formatCurrency(r.salidas)}`}  accent="#dc2626" />
        <StatCard label="Total final"  value={formatCurrency(r.totalGeneral)} accent="#14b8a6" />
        <StatCard label="Ticket prom." value={formatCurrency(r.avgTicket)}    accent="#3b82f6" />
      </div>

      {/* Gráfica top productos */}
      {r.topItems.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h4 className={styles.sectionTitle} style={{ marginBottom: "1rem" }}>Top productos</h4>
          <TopProductsChart items={r.topItems} totalVentas={r.totalVentas} />
        </div>
      )}

      {caja.ventas.length > 0 && (
        <>
          <h4 className={styles.sectionTitle} style={{ marginTop: "1.5rem" }}>Ventas</h4>
          <div className={styles.saleList}>
            {[...caja.ventas]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((sale) => <SaleRow key={sale.id} sale={sale} />)}
          </div>
        </>
      )}

      <CancelledOrdersSection orders={cancelledOrders} />
      <MovimientosDetalle movimientos={caja.movimientos} gastos={caja.gastos} />
    </div>
  );
}

// ---------------------------------------------------
// Main Page
// ---------------------------------------------------
export default function SalesReportPage() {
  const [cajaActual, setCajaActual]           = useState<Caja | null>(null);
  const [historico, setHistorico]             = useState<Caja[]>([]);
  const [cancelledToday, setCancelledToday]   = useState<CancelledOrder[]>([]);
  const [cancelledByCaja, setCancelledByCaja] = useState<Record<number, CancelledOrder[]>>({});
  const [loading, setLoading]                 = useState(true);
  const [tab, setTab]                         = useState<"today" | "history" | "reports">("today");

  const fetchData = async () => {
    try {
      const [actual, all] = await Promise.all([
        apiRequest("/caja/actual").catch(() => null),
        apiRequest("/caja").catch(() => []),
      ]);
      setCajaActual(actual);
      setHistorico(all);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const cancelled: CancelledOrder[] = await apiRequest(
        `/orders?status=CANCELLED&from=${todayStart.toISOString()}&to=${new Date().toISOString()}`
      ).catch(() => []);
      setCancelledToday(cancelled);

      const closedCajas: Caja[] = (all as Caja[]).filter((c) => c.fechaCierre !== null);
      const cancelledPerCaja: Record<number, CancelledOrder[]> = {};
      await Promise.all(
        closedCajas.map(async (caja) => {
          const orders: CancelledOrder[] = await apiRequest(
            `/orders?status=CANCELLED&from=${new Date(caja.fechaApertura).toISOString()}&to=${new Date(caja.fechaCierre!).toISOString()}`
          ).catch(() => []);
          cancelledPerCaja[caja.id] = orders;
        })
      );
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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Cargando reportes...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reportes de Ventas</h1>
          <p className={styles.subtitle}>Rendimiento de ventas, gastos y movimientos de caja</p>
        </div>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === "today"   ? styles.tabActive : ""}`} onClick={() => setTab("today")}>Hoy</button>
          <button className={`${styles.tab} ${tab === "history" ? styles.tabActive : ""}`} onClick={() => setTab("history")}>Historial</button>
          <button className={`${styles.tab} ${tab === "reports" ? styles.tabActive : ""}`} onClick={() => setTab("reports")}>Reportes</button>
        </div>
      </div>

      {tab === "today" ? (
        cajaActual ? (
          <TodayPanel caja={cajaActual} cancelledOrders={cancelledToday} />
        ) : (
          <div className={styles.noCaja}><p>No hay caja abierta en este momento.</p></div>
        )
      ) : tab === "history" ? (
        <HistoryPanel cajas={historico} cancelledByCaja={cancelledByCaja} />
      ) : (
        <ReportsPanel cajas={historico} />
      )}
    </div>
  );
}