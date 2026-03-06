import { useEffect, useState } from "react";
import styles from "./product.module.css";
import { apiRequest } from "../../services/api";
import { useToast } from "../../context/ToastContext";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

interface Category {
  id: number;
  name: string;
}

interface InventoryItem {
  id: number;
  name: string;
  stock: number;
  unit: string;
}

interface SelectedInventory {
  inventoryItemId: number;
  quantity: number;
}

export default function CreateProductModal({ onClose, onCreated }: Props) {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [priceBuy, setPriceBuy] = useState("");
  const [priceSell, setPriceSell] = useState("");
  const [stock, setStock] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedInventory, setSelectedInventory] = useState<SelectedInventory[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
    loadInventory();
  }, []);

  async function loadCategories() {
    try {
      const data = await apiRequest("/categories");
      setCategories(data);
      if (data.length > 0) setCategoryId(data[0].id);
    } catch (error) {
      toast("Error cargando categorías", "error");
    }
  }

  async function loadInventory() {
    try {
      const data = await apiRequest("/inventory");
      setInventoryItems(data);
    } catch (error) {
      toast("Error cargando inventario", "error");
    }
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;

    try {
      const created = await apiRequest("/categories", {
        method: "POST",
        body: JSON.stringify({ name: newCategoryName }),
      });

      setCategories(prev => [...prev, created]);
      setCategoryId(created.id);
      setNewCategoryName("");
      setShowCategoryInput(false);
      toast("Categoría creada exitosamente", "success");
    } catch (error: any) {
      toast(error.message ?? "Error creando categoría", "error");
    }
  }

  function toggleInventoryItem(id: number) {
    const exists = selectedInventory.find(i => i.inventoryItemId === id);
    if (exists) {
      setSelectedInventory(prev => prev.filter(i => i.inventoryItemId !== id));
    } else {
      setSelectedInventory(prev => [...prev, { inventoryItemId: id, quantity: 1 }]);
    }
  }

  function updateInventoryQuantity(id: number, qty: number) {
    setSelectedInventory(prev =>
      prev.map(i => i.inventoryItemId === id ? { ...i, quantity: qty } : i)
    );
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast("El nombre del producto es requerido", "warning");
      return;
    }

    if (!categoryId) {
      toast("Selecciona una categoría", "warning");
      return;
    }

    try {
      setLoading(true);

      await apiRequest("/products", {
        method: "POST",
        body: JSON.stringify({
          name,
          priceBuy: Number(priceBuy),
          priceSell: Number(priceSell),
          stock: Number(stock),
          categoryId: Number(categoryId),
          inventoryUsage: selectedInventory.length > 0 ? selectedInventory : undefined,
        }),
      });

      toast("Producto creado exitosamente", "success");
      onCreated();
      onClose();
    } catch (error: any) {
      toast(error.message ?? "Error creando producto", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard}>

        <div className={styles.modalHeader}>
          <h2>Create Product</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.formSection}>
          <div className={styles.inputGroup}>
            <label>Product Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Buy Price</label>
              <input type="number" value={priceBuy} onChange={(e) => setPriceBuy(e.target.value)} />
            </div>
            <div className={styles.inputGroup}>
              <label>Sell Price</label>
              <input type="number" value={priceSell} onChange={(e) => setPriceSell(e.target.value)} />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Stock</label>
            <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>

          <div className={styles.inputGroup}>
            <label>Category</label>
            <div className={styles.inlineRow}>
              <select
                value={categoryId ?? ""}
                onChange={(e) => setCategoryId(Number(e.target.value))}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <button
                type="button"
                className={styles.secondarySmallBtn}
                onClick={() => setShowCategoryInput(!showCategoryInput)}
              >
                +
              </button>
            </div>
          </div>

          {showCategoryInput && (
            <div className={styles.inlineRow}>
              <input
                placeholder="New category"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
              />
              <button className={styles.primarySmallBtn} onClick={handleCreateCategory}>
                Save
              </button>
            </div>
          )}
        </div>

        <div className={styles.recipeSection}>
          <h4>Recipe (optional)</h4>

          {inventoryItems.length === 0 && (
            <p className={styles.helperText}>No inventory items created yet</p>
          )}

          <div className={styles.recipeList}>
            {inventoryItems.map(item => {
              const selected = selectedInventory.find(i => i.inventoryItemId === item.id);
              return (
                <div key={item.id} className={styles.recipeItem}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!selected}
                      onChange={() => toggleInventoryItem(item.id)}
                    />
                    {item.name} ({item.stock} {item.unit})
                  </label>
                  {selected && (
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={selected.quantity}
                      onChange={(e) => updateInventoryQuantity(item.id, Number(e.target.value))}
                      className={styles.qtyInput}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.primaryBtn} onClick={handleCreate} disabled={loading}>
            {loading ? "Creating..." : "Create Product"}
          </button>
        </div>

      </div>
    </div>
  );
}