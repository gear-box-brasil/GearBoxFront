import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ThemeToggle";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import OrdersPage from "@/features/orders/pages/OrdersPage";
import BudgetsPage from "@/features/budgets/pages/BudgetsPage";
import ClientsPage from "@/features/clients/pages/ClientsPage";
import VehiclesPage from "@/features/vehicles/pages/VehiclesPage";
import LoginPage from "@/features/auth/pages/LoginPage";
import NotFoundPage from "@/features/misc/pages/NotFoundPage";
import DashboardOwner from "@/pages/owner-dashboard/DashboardOwner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ThemeToggle className="fixed top-4 right-4 z-50" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="ordens" element={<OrdersPage />} />
              <Route path="orcamentos" element={<BudgetsPage />} />
              <Route path="clientes" element={<ClientsPage />} />
              <Route path="veiculos" element={<VehiclesPage />} />
              <Route
                path="owner-dashboard"
                element={
                  <ProtectedRoute requireOwner>
                    <DashboardOwner />
                  </ProtectedRoute>
                }
              />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
