import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../modules/auth/LoginPage";
import ProtectedRoute from "./ProtectedRoute";
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

export default function AppRouter() {
  return (
    <Routes>

      {/* LOGIN */}
      <Route path="/" element={<LoginPage />} />

      {/* SUPERADMIN — layout propio sin CajaProvider */}
      <Route
        path="/superadmin"
        element={
          <SuperAdminRoute>
            <SuperAdminPage />
          </SuperAdminRoute>
        }
      />

      {/* PROTECTED AREA */}
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
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}