import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";
import styles from "./products.module.css";
import CreateProductModal from "../pos/CreateProductModal";
import { useToast } from "../../context/ToastContext";

type Category = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  name: string;
  barcode?: string;
  priceBuy: number;
  priceSell: number;
  stock: number;
  imageUrl?: string;
  categoryId: number;
  category?: Category;
};

export default function ProductsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prods, cats] = await Promise.all([
        apiRequest("/products"),
        apiRequest("/categories"),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err: any) {
      setError(err.message || "Error cargando productos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      selectedCategory === "all" || p.categoryId === selectedCategory;
    return matchSearch && matchCategory;
  });

  async function handleDelete(id: number) {
    if (!confirm("¿Seguro que deseas eliminar este producto?")) return;
    try {
      setDeletingId(id);
      await apiRequest(`/products/${id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast("Producto eliminado", "success");
    } catch (err: any) {
      toast(err.message || "Error al eliminar producto", "error");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <div className={styles.container}><p className={styles.loading}>Cargando productos...</p></div>;
  if (error) return <div className={styles.container}><p className={styles.errorMsg}>{error}</p></div>;

  return (
    <>
      <div className={styles.container}>

        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Productos</h1>
            <p className={styles.subtitle}>
              {products.length} producto{products.length !== 1 ? "s" : ""} registrado{products.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button className={styles.primaryBtn} onClick={() => setShowCreateModal(true)}>
            + Nuevo producto
          </button>
        </div>

        <div className={styles.filters}>
          <input
            className={styles.searchInput}
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.select}
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(e.target.value === "all" ? "all" : Number(e.target.value))
            }
          >
            <option value="all">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            {search || selectedCategory !== "all"
              ? "Sin resultados para tu búsqueda."
              : "No hay productos registrados."}
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Código</th>
                  <th>Precio compra</th>
                  <th>Precio venta</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id}>
                    <td className={styles.productId}>#{product.id}</td>
                    <td>
                      <div className={styles.productName}>
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className={styles.productImg} />
                        ) : (
                          <div className={styles.productImgPlaceholder}>
                            {product.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span>{product.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.categoryBadge}>
                        {product.category?.name ?? "—"}
                      </span>
                    </td>
                    <td className={styles.barcode}>{product.barcode ?? "—"}</td>
                    <td className={styles.price}>${product.priceBuy.toFixed(2)}</td>
                    <td className={styles.price}>${product.priceSell.toFixed(2)}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.editBtn}
                          onClick={() => navigate(`/products/edit/${product.id}`)}
                        >
                          Editar
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(product.id)}
                          disabled={deletingId === product.id}
                        >
                          {deletingId === product.id ? "..." : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateProductModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchData();
          }}
        />
      )}
    </>
  );
}