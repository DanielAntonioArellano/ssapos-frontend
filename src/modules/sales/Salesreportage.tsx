import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import styles from "./sales.module.css"

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
};

type Movimiento = {
  id: number;
  tipo: "ENTRADA" | "SALIDA";
  monto: number;
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
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
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

  const gastos = caja.gastos.reduce((s, g) => s + g.monto, 0);

  const entradas = caja.movimientos
    .filter((m) => m.tipo === "ENTRADA")
    .reduce((s, m) => s + m.monto, 0);

  const salidas = caja.movimientos
    .filter((m) => m.tipo === "SALIDA")
    .reduce((s, m) => s + m.monto, 0);

  const totalVentas = efectivo + tarjeta;
  const totalGeneral =
    caja.totalGeneral ??
    caja.montoInicial + efectivo + entradas - gastos - salidas;

  // Top items
  const itemMap: Record<string, { name: string; qty: number; total: number }> =
    {};
  for (const venta of caja.ventas) {
    for (const item of venta.items ?? []) {
      const name =
        item.product?.name ?? item.customName ?? `Item #${item.id}`;
      if (!itemMap[name]) itemMap[name] = { name, qty: 0, total: 0 };
      itemMap[name].qty += item.quantity;
      itemMap[name].total += item.subtotal;
    }
  }
  const topItems = Object.values(itemMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    efectivo,
    tarjeta,
    gastos,
    entradas,
    salidas,
    totalVentas,
    totalGeneral,
    topItems,
    ordenes: caja.ventas.length,
    avgTicket: caja.ventas.length ? totalVentas / caja.ventas.length : 0,
  };
}

// ---------------------------------------------------
// Stat Card
// ---------------------------------------------------
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className={styles.statCard} style={{ "--accent": accent } as any}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  );
}

// ---------------------------------------------------
// Today Panel
// ---------------------------------------------------
function TodayPanel({ caja }: { caja: Caja }) {
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

      {/* Stats */}
      <div className={styles.statsGrid}>
        <StatCard
          label="Ventas brutas"
          value={formatCurrency(r.totalVentas)}
          sub={`${r.ordenes} órdenes`}
          accent="#22c55e"
        />
        <StatCard
          label="Ticket promedio"
          value={formatCurrency(r.avgTicket)}
          accent="#3b82f6"
        />
        <StatCard
          label="Efectivo"
          value={formatCurrency(r.efectivo)}
          accent="#f59e0b"
        />
        <StatCard
          label="Tarjeta"
          value={formatCurrency(r.tarjeta)}
          accent="#8b5cf6"
        />
        <StatCard
          label="Gastos"
          value={formatCurrency(r.gastos)}
          accent="#ef4444"
        />
        <StatCard
          label="Total en caja"
          value={formatCurrency(r.totalGeneral)}
          sub={`Inicial: ${formatCurrency(caja.montoInicial)}`}
          accent="#14b8a6"
        />
      </div>

      <div className={styles.bottomGrid}>
        {/* Top productos */}
        <div className={styles.topItems}>
          <h3 className={styles.sectionTitle}>Top productos</h3>
          {r.topItems.length === 0 ? (
            <p className={styles.empty}>Sin ventas aún</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Total</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {r.topItems.map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td>{item.qty}</td>
                    <td>{formatCurrency(item.total)}</td>
                    <td>
                      <span className={styles.shareBadge}>
                        {r.totalVentas > 0
                          ? ((item.total / r.totalVentas) * 100).toFixed(1)
                          : "0"}
                        %
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Ventas recientes */}
        <div className={styles.recentSales}>
          <h3 className={styles.sectionTitle}>Ventas recientes</h3>
          {caja.ventas.length === 0 ? (
            <p className={styles.empty}>Sin ventas aún</p>
          ) : (
            <div className={styles.saleList}>
              {[...caja.ventas]
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                )
                .slice(0, 8)
                .map((sale) => (
                  <div key={sale.id} className={styles.saleRow}>
                    <div className={styles.saleLeft}>
                      <span className={styles.saleId}>
                        Venta #{sale.id}
                      </span>
                      <span className={styles.saleTime}>
                        {formatTime(sale.createdAt)}
                      </span>
                    </div>
                    <div className={styles.saleRight}>
                      <span
                        className={`${styles.payBadge} ${
                          sale.payment?.toLowerCase() === "efectivo"
                            ? styles.payEfectivo
                            : styles.payTarjeta
                        }`}
                      >
                        {sale.payment}
                      </span>
                      <span className={styles.saleTotal}>
                        {formatCurrency(sale.total)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------
// History Panel
// ---------------------------------------------------
function HistoryPanel({ cajas }: { cajas: Caja[] }) {
  const [selected, setSelected] = useState<Caja | null>(null);

  const closed = cajas.filter((c) => c.fechaCierre !== null);

  return (
    <div className={styles.historyPanel}>
      <h2 className={styles.panelTitle}>Historial de cajas</h2>
      <p className={styles.panelSub}>{closed.length} cierres registrados</p>

      <div className={styles.historyGrid}>
        {/* Lista */}
        <div className={styles.historyList}>
          {closed.length === 0 && (
            <p className={styles.empty}>Sin historial</p>
          )}
          {closed.map((caja) => {
            const r = calcResumen(caja);
            return (
              <div
                key={caja.id}
                className={`${styles.historyCard} ${
                  selected?.id === caja.id ? styles.historyCardActive : ""
                }`}
                onClick={() =>
                  setSelected(selected?.id === caja.id ? null : caja)
                }
              >
                <div className={styles.historyCardTop}>
                  <span className={styles.historyDate}>
                    {formatDate(caja.fechaApertura)}
                  </span>
                  <span className={styles.historyTotal}>
                    {formatCurrency(r.totalVentas)}
                  </span>
                </div>
                <div className={styles.historyCardSub}>
                  <span>{r.ordenes} órdenes</span>
                  <span>
                    {formatTime(caja.fechaApertura)} →{" "}
                    {caja.fechaCierre ? formatTime(caja.fechaCierre) : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detalle */}
        <div className={styles.historyDetail}>
          {!selected ? (
            <div className={styles.emptyDetail}>
              <span>←</span>
              <p>Selecciona una caja para ver el detalle</p>
            </div>
          ) : (
            <CajaDetail caja={selected} />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------
// Caja Detail
// ---------------------------------------------------
function CajaDetail({ caja }: { caja: Caja }) {
  const r = calcResumen(caja);

  return (
    <div className={styles.cajaDetail}>
      <div className={styles.detailHeader}>
        <h3>
          Caja #{caja.id} · {formatDate(caja.fechaApertura)}
        </h3>
        <p className={styles.panelSub}>
          {formatTime(caja.fechaApertura)} →{" "}
          {caja.fechaCierre ? formatTime(caja.fechaCierre) : "Abierta"}
        </p>
      </div>

      <div className={styles.detailStats}>
        <StatCard label="Ventas" value={formatCurrency(r.totalVentas)} accent="#22c55e" />
        <StatCard label="Efectivo" value={formatCurrency(r.efectivo)} accent="#f59e0b" />
        <StatCard label="Tarjeta" value={formatCurrency(r.tarjeta)} accent="#8b5cf6" />
        <StatCard label="Gastos" value={formatCurrency(r.gastos)} accent="#ef4444" />
        <StatCard label="Total final" value={formatCurrency(r.totalGeneral)} accent="#14b8a6" />
        <StatCard label="Ticket prom." value={formatCurrency(r.avgTicket)} accent="#3b82f6" />
      </div>

      {/* Top productos */}
      {r.topItems.length > 0 && (
        <>
          <h4 className={styles.sectionTitle} style={{ marginTop: "1.5rem" }}>
            Top productos
          </h4>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Total</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {r.topItems.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{item.qty}</td>
                  <td>{formatCurrency(item.total)}</td>
                  <td>
                    <span className={styles.shareBadge}>
                      {r.totalVentas > 0
                        ? ((item.total / r.totalVentas) * 100).toFixed(1)
                        : "0"}
                      %
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Gastos */}
      {caja.gastos.length > 0 && (
        <>
          <h4 className={styles.sectionTitle} style={{ marginTop: "1.5rem" }}>
            Gastos
          </h4>
          <div className={styles.saleList}>
            {caja.gastos.map((g) => (
              <div key={g.id} className={styles.saleRow}>
                <span>{g.concepto}</span>
                <span className={styles.negativo}>
                  -{formatCurrency(g.monto)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Movimientos */}
      {caja.movimientos.length > 0 && (
        <>
          <h4 className={styles.sectionTitle} style={{ marginTop: "1.5rem" }}>
            Movimientos
          </h4>
          <div className={styles.saleList}>
            {caja.movimientos.map((m) => (
              <div key={m.id} className={styles.saleRow}>
                <div className={styles.saleLeft}>
                  <span
                    className={`${styles.payBadge} ${
                      m.tipo === "ENTRADA"
                        ? styles.payEfectivo
                        : styles.payTarjeta
                    }`}
                  >
                    {m.tipo}
                  </span>
                  <span className={styles.saleTime}>
                    {m.descripcion ?? "—"}
                  </span>
                </div>
                <span
                  className={
                    m.tipo === "ENTRADA" ? styles.positivo : styles.negativo
                  }
                >
                  {m.tipo === "ENTRADA" ? "+" : "-"}
                  {formatCurrency(m.monto)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------
// Main Page
// ---------------------------------------------------
export default function SalesReportPage() {
  const [cajaActual, setCajaActual] = useState<Caja | null>(null);
  const [historico, setHistorico] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"today" | "history">("today");

  const fetchData = async () => {
    try {
      const [actual, all] = await Promise.all([
        apiRequest("/caja/actual").catch(() => null),
        apiRequest("/caja").catch(() => []),
      ]);
      setCajaActual(actual);
      setHistorico(all);
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
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reportes de Ventas</h1>
          <p className={styles.subtitle}>
            Rendimiento de ventas, gastos y movimientos de caja
          </p>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === "today" ? styles.tabActive : ""}`}
            onClick={() => setTab("today")}
          >
            Hoy
          </button>
          <button
            className={`${styles.tab} ${tab === "history" ? styles.tabActive : ""}`}
            onClick={() => setTab("history")}
          >
            Historial
          </button>
        </div>
      </div>

      {/* Content */}
      {tab === "today" ? (
        cajaActual ? (
          <TodayPanel caja={cajaActual} />
        ) : (
          <div className={styles.noCaja}>
            <p>No hay caja abierta en este momento.</p>
          </div>
        )
      ) : (
        <HistoryPanel cajas={historico} />
      )}
    </div>
  );
}