import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../modules/auth/LoginPage";
import ProtectedRoute from "./ProtectedRoute";
import MeseroRoute from "./MeseroRoute";
import SuperAdminRoute from "./SuperAdminRoute";
import DashboardLayout from "../layout/DashboardLayout";
import PosPage from "../modules/pos/PosPage";
import InventoryPage from "../modules/inventory/InventoryPage";
import OrdersPage from "../modules/orders/OrdersPage";
import TablesPage from "../modules/tables/TablesPage";
import { CajaProvider } from "../context/CajaContext";
import ReportesPage from "../modules/sales/Salesreportage";
import UsersPage from "../modules/users/UsersPage";
import ProductsPage from "../modules/products/Productspage";
import PrintersPage from "../modules/printers/PrintersPage";
import SuperAdminPage from "../modules/superadmin/SuperAdminPage";
import CustomersPage from "../modules/users/CustomersPage";
import MeseroPage from "../modules/mesero/meseroPage";

export default function AppRouter() {
  return (
    <Routes>

      {/* LOGIN */}
      <Route path="/" element={<LoginPage />} />

      {/* SUPERADMIN */}
      <Route
        path="/superadmin"
        element={
          <SuperAdminRoute>
            <SuperAdminPage />
          </SuperAdminRoute>
        }
      />

      {/* MESERO — layout propio optimizado para móvil */}
      <Route
        path="/mesero"
        element={
          <MeseroRoute>
            <CajaProvider>
              <MeseroPage />
            </CajaProvider>
          </MeseroRoute>
        }
      />

      {/* PROTECTED AREA — ADMIN y CAJERO */}
      <Route
        element={
          <ProtectedRoute>
            <CajaProvider>
              <DashboardLayout />
            </CajaProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<PosPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/tables" element={<TablesPage />} />
        <Route path="/reportes" element={<ReportesPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/new" element={<ProductsPage />} />
        <Route path="/products/edit/:id" element={<ProductsPage />} />
        <Route path="/printers" element={<PrintersPage />} />
        <Route path="/Customers" element={<CustomersPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}