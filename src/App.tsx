import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Propiedades from "./pages/Propiedades";
import PropiedadDetalle from "./pages/PropiedadDetalle";
import Contratos from "./pages/Contratos";
import ContratoDetalle from "./pages/ContratoDetalle";
import Liquidaciones from "./pages/Liquidaciones";
import LiquidacionDetalle from "./pages/LiquidacionDetalle";
import Pagos from "./pages/Pagos";
import Rendiciones from "./pages/Rendiciones";
import Propietarios from "./pages/Propietarios";
import PropietarioDetalle from "./pages/PropietarioDetalle";
import Inquilinos from "./pages/Inquilinos";
import InquilinoDetalle from "./pages/InquilinoDetalle";
import Reportes from "./pages/Reportes";
import NuevoContrato from "./pages/NuevoContrato";
import GenerarLiquidacion from "./pages/GenerarLiquidacion";
import MiOrganizacion from "./pages/MiOrganizacion";
import Auditoria from "./pages/Auditoria";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/propiedades" element={<Propiedades />} />
              <Route path="/propiedades/:id" element={<PropiedadDetalle />} />
              <Route path="/contratos" element={<Contratos />} />
              <Route path="/contratos/:id" element={<ContratoDetalle />} />
              <Route path="/liquidaciones" element={<Liquidaciones />} />
              <Route path="/liquidaciones/:id" element={<LiquidacionDetalle />} />
              <Route path="/pagos" element={<Pagos />} />
              <Route path="/rendiciones" element={<Rendiciones />} />
              <Route path="/propietarios" element={<Propietarios />} />
              <Route path="/propietarios/:id" element={<PropietarioDetalle />} />
              <Route path="/inquilinos" element={<Inquilinos />} />
              <Route path="/inquilinos/:id" element={<InquilinoDetalle />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/nuevo-contrato" element={<NuevoContrato />} />
              <Route path="/generar-liquidacion" element={<GenerarLiquidacion />} />
              <Route path="/mi-organizacion" element={<ProtectedRoute requireAdmin><MiOrganizacion /></ProtectedRoute>} />
              <Route path="/auditoria" element={<ProtectedRoute requireAdmin><Auditoria /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
