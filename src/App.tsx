import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
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
import Personas from "./pages/Personas";
import PersonaDetalle from "./pages/PersonaDetalle";
import Reportes from "./pages/Reportes";
import NuevoContrato from "./pages/NuevoContrato";
import GenerarLiquidacion from "./pages/GenerarLiquidacion";
import BandejaLiquidaciones from "./pages/BandejaLiquidaciones";
import MiOrganizacion from "./pages/MiOrganizacion";
import Auditoria from "./pages/Auditoria";
import NotFound from "./pages/NotFound";

// Redirecciones legacy: /propietarios/:id -> /personas/:id?rol=propietario
const RedirectToPersona = ({ rol }: { rol: 'propietario' | 'inquilino' }) => {
  const { id } = useParams();
  return <Navigate to={`/personas/${id}?rol=${rol}`} replace />;
};

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
              <Route path="/personas" element={<Personas />} />
              <Route path="/personas/:id" element={<PersonaDetalle />} />
              {/* Redirecciones legacy */}
              <Route path="/propietarios" element={<Navigate to="/personas?tab=propietarios" replace />} />
              <Route path="/propietarios/:id" element={<RedirectToPersona rol="propietario" />} />
              <Route path="/inquilinos" element={<Navigate to="/personas?tab=inquilinos" replace />} />
              <Route path="/inquilinos/:id" element={<RedirectToPersona rol="inquilino" />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/nuevo-contrato" element={<NuevoContrato />} />
              <Route path="/generar-liquidacion" element={<BandejaLiquidaciones />} />
              <Route path="/generar-liquidacion/nueva" element={<GenerarLiquidacion />} />
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
