import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Sidebar from "../../layout/SideBar";

interface Product {
  id: number;
  name: string;
  priceSell: number;
  categoryId: number;
}

interface Category {
  id: number;
  name: string;
}

interface CartItem {
  id?: number;
  name?: string;
  customName?: string;
  priceSell: number;
  quantity: number;
}

const COLOR_BG   = "#0F4C4C";
const COLOR_DARK = "#0a3333";
const COLOR_ITEM = "#136F6F";

export default function MeseroPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [orderType, setOrderType] = useState<"DINE_IN" | "DELIVERY">("DINE_IN");
  const [tableNumber, setTableNumber] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");

  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const startY = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [prods, cats] = await Promise.all([apiRequest("/products"), apiRequest("/categories")]);
    setProducts(prods);
    setCategories(cats);
    if (cats.length > 0) setSelectedCategory(cats[0].id);
  }

  const filtered = selectedCategory ? products.filter((p) => p.categoryId === selectedCategory) : products;
  const selectedCat = categories.find((c) => c.id === selectedCategory);

  function addToCart(product: Product) {
    setCart((prev) => [...prev, { id: product.id, name: product.name, priceSell: product.priceSell, quantity: 1 }]);
    toast(`${product.name} agregado`, "success");
  }

  function addCustom() {
    if (!customName.trim() || !customPrice) { toast("Nombre y precio requeridos", "warning"); return; }
    setCart((prev) => [...prev, { customName, priceSell: Number(customPrice), quantity: 1 }]);
    setCustomName(""); setCustomPrice(""); setShowCustom(false);
    toast("Producto personalizado agregado", "success");
  }

  function removeItem(index: number) { setCart((prev) => prev.filter((_, i) => i !== index)); }

  const total = cart.reduce((s, i) => s + i.priceSell * i.quantity, 0);

  function resetForm() {
    setCart([]); setTableNumber(""); setClientName(""); setClientPhone("");
    setClientNotes(""); setSheetOpen(false); setShowCustom(false);
  }

  async function handleCrearOrden() {
    if (cart.length === 0) { toast("Agrega productos a la orden", "warning"); return; }
    if (orderType === "DINE_IN" && !tableNumber) { toast("Ingresa el número de mesa", "warning"); return; }
    if (orderType === "DELIVERY" && !clientPhone) { toast("Ingresa el teléfono del cliente", "warning"); return; }
    try {
      setLoading(true);
      const order = await apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify({
          userId: user!.id, type: orderType,
          tableNumber: orderType === "DINE_IN" ? Number(tableNumber) : null,
          clientName: clientName || undefined, clientPhone: clientPhone || undefined,
          clientNotes: clientNotes || undefined,
          items: cart.map((i) => ({ productId: i.id ?? null, customName: i.customName ?? null, quantity: 1, priceUnit: i.priceSell })),
        }),
      });
      toast(`Orden #${order.id} creada`, "success");
      try { await apiRequest(`/tickets/print/order/${order.id}`, { method: "POST" }); }
      catch { toast("Orden creada, sin impresión", "warning"); }
      resetForm();
    } catch (err: any) {
      toast(err.message ?? "Error al crear orden", "error");
    } finally { setLoading(false); }
  }

  function onTouchStart(e: React.TouchEvent) { startY.current = e.touches[0].clientY; isDragging.current = true; }
  function onTouchEnd(e: React.TouchEvent) {
    if (!isDragging.current) return;
    const delta = e.changedTouches[0].clientY - startY.current;
    if (delta > 80) setSheetOpen(false);
    else if (delta < -80) setSheetOpen(true);
    isDragging.current = false;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>

      {/* ── SIDEBAR EXISTENTE ── */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 99 }} />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── HEADER ── */}
      <div style={{ background: COLOR_BG, color: "#fff", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        {/* Hamburguesa */}
        <button onClick={() => setSidebarOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: 5, padding: 4 }}>
          <span style={{ display: "block", width: 20, height: 2, background: "#fff", borderRadius: 2 }} />
          <span style={{ display: "block", width: 20, height: 2, background: "#fff", borderRadius: 2 }} />
          <span style={{ display: "block", width: 20, height: 2, background: "#fff", borderRadius: 2 }} />
        </button>

        <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>SSA POS</p>

        {/* Toggle DINE_IN / DELIVERY */}
        <div style={{ display: "flex", background: COLOR_DARK, borderRadius: 999, padding: 3 }}>
          {(["DINE_IN", "DELIVERY"] as const).map((t) => (
            <button key={t} onClick={() => setOrderType(t)}
              style={{ padding: "5px 10px", borderRadius: 999, border: "none", background: orderType === t ? COLOR_ITEM : "transparent", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "0.2s" }}>
              {t === "DINE_IN" ? "Mesa" : "Domicilio"}
            </button>
          ))}
        </div>
      </div>

      {/* ── SELECTOR DE CATEGORÍA ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
        <button onClick={() => setCategoryOpen(!categoryOpen)}
          style={{ width: "100%", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "none", background: "none", fontSize: 14, fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>
          <span>📂 {selectedCat?.name ?? "Categorías"}</span>
          <span style={{ fontSize: 12, color: "#64748b" }}>{categoryOpen ? "▲" : "▼"}</span>
        </button>
        {categoryOpen && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "8px 16px 12px" }}>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); setCategoryOpen(false); }}
                style={{ padding: "6px 14px", borderRadius: 999, border: "none", background: selectedCategory === cat.id ? COLOR_BG : "#f1f5f9", color: selectedCategory === cat.id ? "#fff" : "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── GRID DE PRODUCTOS ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12, paddingBottom: 90 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {filtered.map((product) => (
            <button key={product.id} onClick={() => addToCart(product)}
              style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", textAlign: "center", lineHeight: 1.3 }}>{product.name}</span>
              <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>${product.priceSell.toFixed(2)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── BOTÓN FLOTANTE CARRITO ── */}
      <button onClick={() => setSheetOpen(true)}
        style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: COLOR_BG, color: "#fff", border: "none", borderRadius: 999, padding: "13px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 10, zIndex: 50 }}>
        🛒 Ver orden
        {cart.length > 0 && <span style={{ background: "#3b82f6", borderRadius: 999, padding: "2px 8px", fontSize: 12 }}>{cart.length}</span>}
        {cart.length > 0 && <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>${total.toFixed(2)}</span>}
      </button>

      {/* ── BOTTOM SHEET ── */}
      {sheetOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100 }}>
          <div onClick={() => setSheetOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
          <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderRadius: "20px 20px 0 0", maxHeight: "88dvh", display: "flex", flexDirection: "column", boxShadow: "0 -4px 30px rgba(0,0,0,0.15)" }}>

            <div style={{ padding: "12px 0 6px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 999, background: "#e2e8f0" }} />
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: "0 16px 16px" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Orden</h3>

              {orderType === "DINE_IN" ? (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Número de mesa</label>
                  <input type="number" placeholder="Ej. 5" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, marginTop: 4, boxSizing: "border-box" }} />
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Nombre / Dirección</label>
                    <input value={clientName} onChange={(e) => setClientName(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, marginTop: 4, boxSizing: "border-box" }} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Teléfono</label>
                    <input type="number" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, marginTop: 4, boxSizing: "border-box" }} />
                  </div>
                </>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>Notas</label>
                <textarea value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} rows={2}
                  style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, marginTop: 4, boxSizing: "border-box", resize: "none" }} />
              </div>

              {cart.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "16px 0" }}>Sin productos aún</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  {cart.map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", borderRadius: 10, padding: "8px 12px" }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{item.customName ?? item.name}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>${item.priceSell.toFixed(2)}</p>
                      </div>
                      <button onClick={() => removeItem(i)} style={{ background: "#fee2e2", border: "none", borderRadius: 8, padding: "4px 8px", color: "#ef4444", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => setShowCustom(!showCustom)}
                style={{ width: "100%", padding: "9px", border: `1.5px dashed ${COLOR_BG}`, borderRadius: 10, background: "#f0fdf4", color: COLOR_BG, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}>
                + Producto personalizado
              </button>

              {showCustom && (
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <input placeholder="Nombre" value={customName} onChange={(e) => setCustomName(e.target.value)}
                    style={{ flex: 2, padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13 }} />
                  <input type="number" placeholder="Precio" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)}
                    style={{ flex: 1, padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13 }} />
                  <button onClick={addCustom} style={{ padding: "8px 12px", background: COLOR_BG, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+</button>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, padding: "10px 14px", background: "#f1f5f9", borderRadius: 12 }}>
                <span style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>Total</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>${total.toFixed(2)}</span>
              </div>

              <button onClick={handleCrearOrden} disabled={loading || cart.length === 0}
                style={{ width: "100%", padding: "14px", background: loading || cart.length === 0 ? "#e2e8f0" : COLOR_BG, color: loading || cart.length === 0 ? "#94a3b8" : "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: loading || cart.length === 0 ? "not-allowed" : "pointer" }}>
                {loading ? "Creando orden..." : "✓ Crear orden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}