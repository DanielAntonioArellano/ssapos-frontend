import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../services/api";
import styles from "./products.module.css";

// ---------------------------------------------------
// Types
// ---------------------------------------------------
type Category = {
  id: number;
  name: string;
};

type FormData = {
  name: string;
  barcode: string;
  priceBuy: string;
  priceSell: string;
  stock: string;
  categoryId: string;
  imageUrl: string;
};

const EMPTY_FORM: FormData = {
  name: "",
  barcode: "",
  priceBuy: "",
  priceSell: "",
  stock: "",
  categoryId: "",
  imageUrl: "",
};

// ---------------------------------------------------
// ProductFormPage
// ---------------------------------------------------
export default function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
    if (isEdit) loadProduct();
  }, []);

  async function loadCategories() {
    try {
      const data = await apiRequest("/categories");
      setCategories(data);
    } catch {
      // silencioso
    }
  }

  async function loadProduct() {
    try {
      setFetching(true);
      const data = await apiRequest(`/products/${id}`);
      setForm({
        name: data.name ?? "",
        barcode: data.barcode ?? "",
        priceBuy: data.priceBuy?.toString() ?? "",
        priceSell: data.priceSell?.toString() ?? "",
        stock: data.stock?.toString() ?? "",
        categoryId: data.categoryId?.toString() ?? "",
        imageUrl: data.imageUrl ?? "",
      });
    } catch (err: any) {
      setError(err.message || "Error cargando producto");
    } finally {
      setFetching(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit() {
    // Validaciones básicas
    if (!form.name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (!form.priceBuy || Number(form.priceBuy) < 0) {
      setError("El precio de compra es obligatorio");
      return;
    }
    if (!form.priceSell || Number(form.priceSell) < 0) {
      setError("El precio de venta es obligatorio");
      return;
    }
    if (!form.stock || Number(form.stock) < 0) {
      setError("El stock es obligatorio");
      return;
    }
    if (!form.categoryId) {
      setError("Selecciona una categoría");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        name: form.name.trim(),
        barcode: form.barcode.trim() || undefined,
        priceBuy: Number(form.priceBuy),
        priceSell: Number(form.priceSell),
        stock: Number(form.stock),
        categoryId: Number(form.categoryId),
        imageUrl: form.imageUrl.trim() || undefined,
      };

      if (isEdit) {
        await apiRequest(`/products/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      navigate("/products");
    } catch (err: any) {
      setError(err.message || "Error al guardar producto");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Cargando producto...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {isEdit ? "Editar producto" : "Nuevo producto"}
          </h1>
          <p className={styles.subtitle}>
            {isEdit
              ? "Modifica los datos del producto"
              : "Completa los datos para crear un producto"}
          </p>
        </div>
        <button
          className={styles.secondaryBtn}
          onClick={() => navigate("/products")}
        >
          ← Volver
        </button>
      </div>

      {/* Form */}
      <div className={styles.formCard}>
        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.formGrid}>

          {/* Nombre */}
          <div className={`${styles.field} ${styles.colSpan2}`}>
            <label className={styles.label}>Nombre *</label>
            <input
              className={styles.input}
              name="name"
              placeholder="Ej. Hamburguesa clásica"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          {/* Categoría */}
          <div className={styles.field}>
            <label className={styles.label}>Categoría *</label>
            <select
              className={styles.select}
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Código de barras */}
          <div className={styles.field}>
            <label className={styles.label}>Código de barras</label>
            <input
              className={styles.input}
              name="barcode"
              placeholder="Opcional"
              value={form.barcode}
              onChange={handleChange}
            />
          </div>

          {/* Precio compra */}
          <div className={styles.field}>
            <label className={styles.label}>Precio de compra *</label>
            <input
              className={styles.input}
              name="priceBuy"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.priceBuy}
              onChange={handleChange}
            />
          </div>

          {/* Precio venta */}
          <div className={styles.field}>
            <label className={styles.label}>Precio de venta *</label>
            <input
              className={styles.input}
              name="priceSell"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.priceSell}
              onChange={handleChange}
            />
          </div>

          {/* Stock */}
          <div className={styles.field}>
            <label className={styles.label}>Stock inicial *</label>
            <input
              className={styles.input}
              name="stock"
              type="number"
              min="0"
              placeholder="0"
              value={form.stock}
              onChange={handleChange}
            />
          </div>

          {/* Imagen URL */}
          <div className={`${styles.field} ${styles.colSpan2}`}>
            <label className={styles.label}>URL de imagen</label>
            <input
              className={styles.input}
              name="imageUrl"
              placeholder="https://... (opcional)"
              value={form.imageUrl}
              onChange={handleChange}
            />
            {form.imageUrl && (
              <img
                src={form.imageUrl}
                alt="preview"
                className={styles.imagePreview}
                onError={(e) =>
                  ((e.target as HTMLImageElement).style.display = "none")
                }
              />
            )}
          </div>

        </div>

        {/* Actions */}
        <div className={styles.formActions}>
          <button
            className={styles.secondaryBtn}
            onClick={() => navigate("/products")}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className={styles.primaryBtn}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? "Guardando..."
              : isEdit
              ? "Guardar cambios"
              : "Crear producto"}
          </button>
        </div>
      </div>
    </div>
  );
}