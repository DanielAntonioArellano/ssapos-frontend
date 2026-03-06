import styles from "./inventory.module.css";
import { useEffect, useState } from "react";
import { apiRequest } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import CreateInventoryModal from "./CreateInvetoryModal";
import InventoryMovimientoModal from "./InventoryMovimientoModal";
import { ArrowDownCircle, ArrowUpCircle, ClipboardList } from "lucide-react";

interface InventoryItem {
  id: number;
  name: string;
  stock: number;
  unit: string;
}

interface Movimiento {
  id: number;
  tipo: "ENTRADA" | "SALIDA";
  cantidad: number;
  motivo: string;
  stockAnterior: number;
  stockNuevo: number;
  createdAt: string;
}

type FilterType = "all" | "low" | "out";

export default function InventoryPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [movimientoItem, setMovimientoItem] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const data = await apiRequest("/inventory");
      setItems(data);
    } catch (error: any) {
      toast(error.message ?? "Error cargando inventario", "error");
    }
  }

  async function loadMovimientos(item: InventoryItem) {
    try {
      setLoadingMovimientos(true);
      setSelectedItem(item);
      const data = await apiRequest(`/inventory/${item.id}/movimientos`);
      setMovimientos(data);
    } catch (error: any) {
      toast(error.message ?? "Error cargando movimientos", "error");
    } finally {
      setLoadingMovimientos(false);
    }
  }

  function getStatus(stock: number) {
    if (stock === 0) return "out";
    if (stock < 10) return "low";
    return "in";
  }

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const status = getStatus(item.stock);
    const matchesFilter =
      filter === "all" ||
      (filter === "low" && status === "low") ||
      (filter === "out" && status === "out");
    return matchesSearch && matchesFilter;
  });

  return (
    <>
      <div className={styles.wrapper}>

        {/* LEFT PANEL */}
        <div className={styles.sidebar}>
          <div className={styles.card}>
            <h3>Filters</h3>
            <input
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className={styles.tags}>
              <span className={filter === "all" ? styles.tagActive : styles.tag} onClick={() => setFilter("all")}>
                All items
              </span>
              <span className={filter === "low" ? styles.tagActive : styles.tag} onClick={() => setFilter("low")}>
                Low stock
              </span>
              <span className={filter === "out" ? styles.tagActive : styles.tag} onClick={() => setFilter("out")}>
                Out of stock
              </span>
            </div>
          </div>

          <div className={styles.card}>
            <h3>Quick actions</h3>
            <button className={styles.primaryBtn} onClick={() => setShowModal(true)}>
              New Item
            </button>
          </div>

          {/* Historial de movimientos */}
          {selectedItem && (
            <div className={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Movimientos</h3>
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>{selectedItem.name}</span>
              </div>

              {loadingMovimientos ? (
                <p style={{ fontSize: 13, color: "#9CA3AF" }}>Cargando...</p>
              ) : movimientos.length === 0 ? (
                <p style={{ fontSize: 13, color: "#9CA3AF" }}>Sin movimientos registrados</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {movimientos.map((m) => (
                    <div key={m.id} style={{
                      background: "#F9FAFB", borderRadius: 10, padding: "10px 12px",
                      borderLeft: `3px solid ${m.tipo === "ENTRADA" ? "#059669" : "#DC2626"}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {m.tipo === "ENTRADA"
                            ? <ArrowDownCircle size={14} color="#059669" />
                            : <ArrowUpCircle size={14} color="#DC2626" />
                          }
                          <span style={{ fontSize: 13, fontWeight: 600, color: m.tipo === "ENTRADA" ? "#059669" : "#DC2626" }}>
                            {m.tipo === "ENTRADA" ? "+" : "-"}{m.cantidad} {selectedItem.unit}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{formatFecha(m.createdAt)}</span>
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6B7280" }}>{m.motivo}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9CA3AF" }}>
                        {m.stockAnterior} → {m.stockNuevo} {selectedItem.unit}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* TABLE SECTION */}
        <div className={styles.tableSection}>
          <div className={styles.tableCard}>
            <div className={styles.header}>
              <h2>Inventory list</h2>
              <button className={styles.lightBtn}>{filteredItems.length} items</button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>On hand</th>
                  <th>Unit</th>
                  <th>Status</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const status = getStatus(item.stock);
                  const isSelected = selectedItem?.id === item.id;

                  return (
                    <tr
                      key={item.id}
                      style={{ background: isSelected ? "#F0FDF4" : undefined, cursor: "pointer" }}
                      onClick={() => loadMovimientos(item)}
                    >
                      <td>{item.name}</td>
                      <td>{item.stock}</td>
                      <td>{item.unit}</td>
                      <td>
                        <span className={`${styles.badge} ${
                          status === "in" ? styles.in : status === "low" ? styles.low : styles.out
                        }`}>
                          {status === "in" ? "In stock" : status === "low" ? "Low stock" : "Out of stock"}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setMovimientoItem(item)}
                          style={{
                            padding: "6px 12px", borderRadius: 8, border: "1.5px solid #0F4C4C",
                            background: "white", color: "#0F4C4C", fontSize: 12,
                            fontWeight: 500, cursor: "pointer", display: "flex",
                            alignItems: "center", gap: 4,
                          }}
                        >
                          <ClipboardList size={13} /> Movimiento
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#9ca3af" }}>
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <CreateInventoryModal
          onClose={() => setShowModal(false)}
          onCreated={loadItems}
        />
      )}

      {movimientoItem && (
        <InventoryMovimientoModal
          item={movimientoItem}
          onClose={() => setMovimientoItem(null)}
          onSuccess={() => {
            loadItems();
            if (selectedItem?.id === movimientoItem.id) {
              loadMovimientos(movimientoItem);
            }
          }}
        />
      )}
    </>
  );
}