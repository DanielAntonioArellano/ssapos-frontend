import { useEffect, useState, useMemo } from "react";
import { apiRequest } from "../../services/api";

// ---------------------------------------------------
// Types
// ---------------------------------------------------
type Order = {
  id: number;
  clientName: string | null;
  clientPhone: string | null;
  clientNotes: string | null;
  total: number;
  status: string;
  createdAt: string;
  type: string;
};

type Customer = {
  phone: string;
  name: string;
  notes: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrder: string;
  orders: Order[];
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

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  ORDERED:     { label: "Ordenada",    color: "#d97706", bg: "#fef3c7" },
  PREPARATION: { label: "Preparando",  color: "#2563eb", bg: "#dbeafe" },
  DELIVERY:    { label: "En camino",   color: "#7c3aed", bg: "#ede9fe" },
  COMPLETED:   { label: "Completada",  color: "#16a34a", bg: "#dcfce7" },
  CANCELLED:   { label: "Cancelada",   color: "#dc2626", bg: "#fee2e2" },
};

const TYPE_LABEL: Record<string, string> = {
  DELIVERY: "🛵 Delivery",
  TAKEAWAY: "🥡 Para llevar",
  DINE_IN:  "🍽️ Mesa",
};

// ---------------------------------------------------
// Aggregate orders into unique customers by phone
// ---------------------------------------------------
function aggregateCustomers(orders: Order[]): Customer[] {
  const map: Record<string, Customer> = {};

  for (const order of orders) {
    // Skip orders without contact info
    if (!order.clientPhone && !order.clientName) continue;

    const key = order.clientPhone?.trim() || order.clientName?.trim() || "";
    if (!key) continue;

    if (!map[key]) {
      map[key] = {
        phone:       order.clientPhone?.trim() || "—",
        name:        order.clientName?.trim()  || "Sin nombre",
        notes:       order.clientNotes || null,
        totalOrders: 0,
        totalSpent:  0,
        lastOrder:   order.createdAt,
        orders:      [],
      };
    }

    // Update name/notes with most recent data
    if (order.clientName) map[key].name  = order.clientName.trim();
    if (order.clientNotes) map[key].notes = order.clientNotes.trim();

    map[key].totalOrders += 1;
    if (order.status === "COMPLETED") map[key].totalSpent += order.total;
    if (new Date(order.createdAt) > new Date(map[key].lastOrder)) {
      map[key].lastOrder = order.createdAt;
    }
    map[key].orders.push(order);
  }

  return Object.values(map).sort(
    (a, b) => new Date(b.lastOrder).getTime() - new Date(a.lastOrder).getTime()
  );
}

// ---------------------------------------------------
// Customer Row (expandible)
// ---------------------------------------------------
function CustomerRow({ customer }: { customer: Customer }) {
  const [expanded, setExpanded] = useState(false);

  const sortedOrders = [...customer.orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <>
      {/* Main row */}
      <tr
        onClick={() => setExpanded((e) => !e)}
        style={{ cursor: "pointer", background: expanded ? "#f8fafc" : "#fff", transition: "background 0.15s" }}
      >
        <td style={td}>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>{customer.name}</span>
        </td>
        <td style={td}>
          {customer.phone !== "—" ? (
            <a href={`tel:${customer.phone}`} onClick={(e) => e.stopPropagation()} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}>
              📞 {customer.phone}
            </a>
          ) : (
            <span style={{ color: "#94a3b8" }}>—</span>
          )}
        </td>
        <td style={td}>
          {customer.notes ? (
            <span style={{ color: "#475569", fontSize: "0.82rem" }}>{customer.notes}</span>
          ) : (
            <span style={{ color: "#cbd5e1" }}>—</span>
          )}
        </td>
        <td style={{ ...td, textAlign: "center" }}>
          <span style={{
            fontWeight: 700, fontSize: "0.85rem",
            background: "#e0f2fe", color: "#0369a1",
            borderRadius: "999px", padding: "2px 10px",
          }}>
            {customer.totalOrders}
          </span>
        </td>
        <td style={{ ...td, textAlign: "right", fontWeight: 600, color: "#16a34a" }}>
          {formatCurrency(customer.totalSpent)}
        </td>
        <td style={{ ...td, color: "#64748b", fontSize: "0.8rem" }}>
          {formatDate(customer.lastOrder)}
        </td>
        <td style={{ ...td, textAlign: "center", color: "#94a3b8", fontSize: "0.75rem" }}>
          {expanded ? "▲" : "▼"}
        </td>
      </tr>

      {/* Expanded orders */}
      {expanded && (
        <tr>
          <td colSpan={7} style={{ padding: "0 1rem 1rem 1rem", background: "#f8fafc" }}>
            <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    <th style={{ ...th, textAlign: "left" }}>Orden</th>
                    <th style={{ ...th, textAlign: "left" }}>Tipo</th>
                    <th style={{ ...th, textAlign: "left" }}>Fecha</th>
                    <th style={{ ...th, textAlign: "center" }}>Estado</th>
                    <th style={{ ...th, textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOrders.map((order) => {
                    const s = STATUS_LABEL[order.status] ?? { label: order.status, color: "#64748b", bg: "#f1f5f9" };
                    return (
                      <tr key={order.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                        <td style={{ ...td, fontWeight: 600 }}>#{order.id}</td>
                        <td style={td}>{TYPE_LABEL[order.type] ?? order.type}</td>
                        <td style={{ ...td, color: "#64748b" }}>{formatDate(order.createdAt)}</td>
                        <td style={{ ...td, textAlign: "center" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", background: s.bg, color: s.color }}>
                            {s.label}
                          </span>
                        </td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                          {formatCurrency(order.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------
// Styles
// ---------------------------------------------------
const td: React.CSSProperties = {
  padding: "0.75rem 1rem",
  verticalAlign: "middle",
  fontSize: "0.85rem",
  color: "#334155",
};

const th: React.CSSProperties = {
  padding: "0.6rem 1rem",
  fontWeight: 600,
  fontSize: "0.75rem",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

// ---------------------------------------------------
// Main Page
// ---------------------------------------------------
export default function CustomersPage() {
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    apiRequest("/orders")
      .then((data) => setOrders(data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const customers = useMemo(() => aggregateCustomers(orders), [orders]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
  }, [customers, search]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#94a3b8", fontSize: "1rem" }}>
        Cargando clientes...
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
          Clientes
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "0.25rem" }}>
          {customers.length} clientes registrados
        </p>
      </div>

      {/* Stats rápidas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total clientes", value: customers.length.toString(), accent: "#3b82f6" },
          { label: "Total facturado", value: formatCurrency(customers.reduce((s, c) => s + c.totalSpent, 0)), accent: "#22c55e" },
          { label: "Órdenes totales", value: customers.reduce((s, c) => s + c.totalOrders, 0).toString(), accent: "#8b5cf6" },
          { label: "Ticket promedio", value: formatCurrency(
            customers.length
              ? customers.reduce((s, c) => s + c.totalSpent, 0) / customers.reduce((s, c) => s + c.totalOrders, 0) || 0
              : 0
          ), accent: "#f59e0b" },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            borderLeft: `4px solid ${stat.accent}`,
          }}>
            <p style={{ fontSize: "0.75rem", color: "#64748b", margin: 0, fontWeight: 500 }}>{stat.label}</p>
            <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", margin: "0.25rem 0 0" }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", maxWidth: "400px",
            padding: "0.6rem 1rem",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            fontSize: "0.875rem",
            outline: "none",
            boxSizing: "border-box",
            color: "#0f172a",
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
            {search ? "No se encontraron clientes con ese criterio" : "Sin clientes registrados"}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ ...th, textAlign: "left" }}>Nombre</th>
                  <th style={{ ...th, textAlign: "left" }}>Teléfono</th>
                  <th style={{ ...th, textAlign: "left" }}>Dirección / Notas</th>
                  <th style={{ ...th, textAlign: "center" }}>Órdenes</th>
                  <th style={{ ...th, textAlign: "right" }}>Total gastado</th>
                  <th style={{ ...th, textAlign: "left" }}>Último pedido</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer) => (
                  <CustomerRow key={customer.phone + customer.name} customer={customer} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}