import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import styles from "./pos.module.css";
import { apiRequest } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import CreateProductModal from "./CreateProductModal";
import { useCaja } from "../../context/CajaContext";
import CheckoutModal from "./CheckOutModal";
import GastoMovimientoModal from "./Gastomovientomodal";
import { useToast } from "../../context/ToastContext";

interface Product {
  id: number;
  name: string;
  priceSell: number;
  categoryId: number;
}

interface CartItem {
  id?: number;
  name?: string;
  customName?: string;
  priceSell: number;
  categoryId?: number;
  quantity: number;
}

interface Category {
  id: number;
  name: string;
}

export default function PosPage() {
  const { user } = useAuth();
  const { caja } = useCaja();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const [orderType, setOrderType] = useState<"DELIVERY" | "DINE_IN">("DELIVERY");
  const [tableNumber, setTableNumber] = useState<number | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");

  const [editMode, setEditMode] = useState(false);

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState(1);

  const [showGastoModal, setShowGastoModal] = useState(false);

  useEffect(() => {
    loadProducts();
    loadCategories();
    const orderId = searchParams.get("orderId");
    if (orderId) loadOrder(Number(orderId));
  }, []);

  async function loadProducts() {
    const data = await apiRequest("/products");
    setProducts(data);
  }

  async function loadCategories() {
    const data = await apiRequest("/categories");
    setCategories(data);
    if (data.length > 0) setSelectedCategory(data[0].id);
  }

  async function loadOrder(orderId: number) {
    const order = await apiRequest(`/orders/${orderId}`);

    if (order.status !== "ORDERED") {
      toast("Solo se pueden editar órdenes ORDERED", "warning");
      return;
    }

    setCart(
      order.items.map((item: any) => ({
        id: item.productId ?? undefined,
        name: item.product?.name,
        customName: item.customName ?? undefined,
        priceSell: item.priceUnit,
        categoryId: item.product?.categoryId,
        quantity: item.quantity,
      }))
    );

    setOrderType(order.type);
    setTableNumber(order.tableNumber);
    setClientName(order.clientName ?? "");
    setClientPhone(order.clientPhone ?? "");
    setClientNotes(order.clientNotes ?? "");
    setCurrentOrderId(order.id);
    setEditMode(true);
  }

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products;

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  function addCustomItem() {
    if (!customName.trim() || !customPrice) {
      toast("Nombre y precio requeridos", "warning");
      return;
    }
    setCart((prev) => [
      ...prev,
      { customName, priceSell: Number(customPrice), quantity: customQty },
    ]);
    setCustomName("");
    setCustomPrice("");
    setCustomQty(1);
    setShowCustomForm(false);
  }

  function increase(index: number) {
    setCart((prev) =>
      prev.map((item, i) => i === index ? { ...item, quantity: item.quantity + 1 } : item)
    );
  }

  function decrease(index: number) {
    setCart((prev) =>
      prev
        .map((item, i) => i === index ? { ...item, quantity: item.quantity - 1 } : item)
        .filter((item) => item.quantity > 0)
    );
  }

  const total = cart.reduce((sum, item) => sum + item.priceSell * item.quantity, 0);

  // ── Payload base de la orden ──────────────────────────
  function buildPayload(requirePhone = true) {
    return {
      userId: user!.id,
      type: orderType,
      tableNumber: orderType === "DINE_IN" ? tableNumber : null,
      clientName: clientName || undefined,
      clientPhone: clientPhone || undefined,
      clientNotes: clientNotes || undefined,
      items: cart.map((item) => ({
        productId: item.id ?? null,
        customName: item.customName ?? null,
        quantity: item.quantity,
        priceUnit: item.priceSell,
      })),
    };
  }

  function resetForm() {
    setCart([]);
    setTableNumber(null);
    setOrderType("DELIVERY");
    setClientName("");
    setClientPhone("");
    setClientNotes("");
    setEditMode(false);
    setCurrentOrderId(null);
  }

  // ── Crear / actualizar orden sin cobrar ───────────────
  async function handleSubmitOrder() {
    if (!user) return;

    if (cart.length === 0) {
      toast("No hay productos en la orden", "warning");
      return;
    }

    if (orderType === "DINE_IN" && !tableNumber) {
      toast("Debe ingresar número de mesa", "warning");
      return;
    }

    if (orderType === "DELIVERY" && !clientPhone) {
      toast("Debe ingresar teléfono del cliente", "warning");
      return;
    }

    try {
      setLoading(true);

      if (editMode && currentOrderId) {
        await apiRequest(`/orders/${currentOrderId}`, {
          method: "PATCH",
          body: JSON.stringify(buildPayload()),
        });
        toast("Orden actualizada exitosamente", "success");
      } else {
        const order = await apiRequest("/orders", {
          method: "POST",
          body: JSON.stringify(buildPayload()),
        });

        setCurrentOrderId(order.id);
        toast(`Orden creada #${order.id}`, "success");

        try {
          await apiRequest(`/tickets/print/order/${order.id}`, { method: "POST" });
        } catch {
          toast("Orden creada, pero no se pudo imprimir", "warning");
        }
      }

      resetForm();
    } catch (err: any) {
      toast(err.message ?? "Error al procesar la orden", "error");
    } finally {
      setLoading(false);
    }
  }

  // ── Charge Order: crea la orden si no existe y cobra ──
  async function handleChargeOrder() {
    if (!user || !caja) return;

    if (cart.length === 0) {
      toast("No hay productos en la orden", "warning");
      return;
    }

    try {
      setLoading(true);

      let orderId = currentOrderId;

      // Si no hay orden creada aún, la crea silenciosamente
      if (!orderId) {
        const order = await apiRequest("/orders", {
          method: "POST",
          body: JSON.stringify(buildPayload(false)),
        });
        orderId = order.id;
        setCurrentOrderId(orderId);
      }

      setShowCheckoutModal(true);
    } catch (err: any) {
      toast(err.message ?? "Error al preparar el cobro", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className={styles.container}>
        <div className={styles.productsSection}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h3>Productos</h3>
            <button className={styles.addProductBtn} onClick={() => setShowGastoModal(true)}>
              + Gasto / Entrada
            </button>
          </div>

          <div className={styles.categoriesTabs}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={selectedCategory === cat.id ? styles.activeTab : styles.tab}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className={styles.grid}>
            {filteredProducts.map((product) => (
              <div key={product.id} className={styles.card} onClick={() => addToCart(product)}>
                <div>
                  <h4>{product.name}</h4>
                  <p>${product.priceSell.toFixed(2)}</p>
                </div>
                <button className={styles.addBtn}>+</button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.orderSection}>

          <div className={styles.toggleWrapper}>
            <div className={styles.toggleContainer}>
              <div className={`${styles.toggleSlider} ${orderType === "DINE_IN" ? styles.slideRight : styles.slideLeft}`} />
              <button
                className={`${styles.toggleOption} ${orderType === "DELIVERY" ? styles.activeLabel : ""}`}
                onClick={() => { setOrderType("DELIVERY"); setTableNumber(null); }}
              >
                Domicilio
              </button>
              <button
                className={`${styles.toggleOption} ${orderType === "DINE_IN" ? styles.activeLabel : ""}`}
                onClick={() => setOrderType("DINE_IN")}
              >
                Comer dentro
              </button>
            </div>
          </div>

          {orderType === "DINE_IN" && (
            <div className={styles.metaInput}>
              <label>Mesa</label>
              <input
                type="number"
                
                value={tableNumber ?? ""}
                onChange={(e) => setTableNumber(Number(e.target.value))}
              />
            </div>
          )}

          {orderType === "DELIVERY" && (
            <div className={styles.deliverySection}>
              <div className={styles.metaInput}>
                <label>Nombre / Dirección</label>
                <input value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>
              <div className={styles.metaInput}>
                <label>Teléfono</label>
                <input type="number" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
              </div>
            </div>
          )}

          <div className={styles.metaInput}>
            <label>Notas</label>
            <textarea value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} />
          </div>

          <button className={styles.addCustomBtn} onClick={() => setShowCustomForm(!showCustomForm)}>
            + Producto Personalizado
          </button>

          {showCustomForm && (
            <div className={styles.customForm}>
              <input
                placeholder="Nombre"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <input
                type="number"
                placeholder="Precio"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
              />
              <input
                type="number"
                min={1}
                value={customQty}
                onChange={(e) => setCustomQty(Number(e.target.value))}
              />
              <button onClick={addCustomItem}>Agregar</button>
            </div>
          )}

          <div className={styles.orderItems}>
            {cart.map((item, index) => (
              <div key={index} className={`${styles.orderItem} ${item.customName ? styles.customItem : ""}`}>
                <div className={styles.itemInfo}>
                  <strong>
                    {item.customName ?? item.name}
                    {item.customName && <span className={styles.customBadge}>CUSTOM</span>}
                  </strong>
                </div>
                <div className={styles.itemControls}>
                  <button onClick={() => decrease(index)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => increase(index)}>+</button>
                </div>
                <div className={styles.itemPrice}>
                  ${(item.priceSell * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>Total</span>
              <strong>${total.toFixed(2)}</strong>
            </div>
            <div className={styles.metaInfo}>
              {cart.length} productos • {cart.reduce((s, i) => s + i.quantity, 0)} items
            </div>
            <div className={styles.actions}>
              <button
                className={styles.secondaryBtn}
                onClick={handleSubmitOrder}
                disabled={loading}
              >
                {editMode ? "Actualizar Orden" : "Crear Orden"}
              </button>
              <button
                className={styles.primaryBtn}
                onClick={handleChargeOrder}
                disabled={loading || !caja || cart.length === 0}
              >
                {loading ? "Procesando..." : "Cobrar Orden"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <CreateProductModal onClose={() => setShowModal(false)} onCreated={loadProducts} />
      )}
      {showGastoModal && (
        <GastoMovimientoModal onClose={() => setShowGastoModal(false)} onSuccess={() => setShowGastoModal(false)} />
      )}
      {showCheckoutModal && currentOrderId && (
        <CheckoutModal
          orderId={currentOrderId}
          cart={cart}
          total={total}
          onClose={() => setShowCheckoutModal(false)}
          onSuccess={() => {
            setShowCheckoutModal(false);
            resetForm();
          }}
        />
      )}
    </>
  );
}