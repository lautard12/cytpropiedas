import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, Calculator, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbSeparator, BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { useAuth } from '@/contexts/AuthContext';

const routeNames: Record<string, string> = {
  '/': 'Dashboard',
  '/propiedades': 'Propiedades',
  '/contratos': 'Contratos',
  '/liquidaciones': 'Liquidaciones',
  '/pagos': 'Pagos',
  '/propietarios': 'Propietarios',
  '/inquilinos': 'Inquilinos',
  '/reportes': 'Reportes',
  '/nuevo-contrato': 'Nuevo Contrato',
  '/generar-liquidacion': 'Generar Liquidación',
  '/mi-organizacion': 'Mi Organización',
  '/auditoria': 'Auditoría',
};

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const initials = (user?.email ?? 'U').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-6">
      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          {pathSegments.length > 0 && pathSegments[0] !== '' && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {pathSegments.length === 1 ? (
                  <BreadcrumbPage>{routeNames['/' + pathSegments[0]] || pathSegments[0]}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={'/' + pathSegments[0]} onClick={(e) => { e.preventDefault(); navigate('/' + pathSegments[0]); }}>
                    {routeNames['/' + pathSegments[0]] || pathSegments[0]}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {pathSegments.length > 1 && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbPage>{decodeURIComponent(pathSegments[1])}</BreadcrumbPage></BreadcrumbItem>
                </>
              )}
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="relative w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar contrato, propiedad..." className="pl-9 h-9 text-sm" />
      </div>

      <Button size="sm" onClick={() => navigate('/nuevo-contrato')}><Plus className="h-4 w-4 mr-1" />Nuevo contrato</Button>
      <Button size="sm" variant="outline" onClick={() => navigate('/generar-liquidacion')}><Calculator className="h-4 w-4 mr-1" />Generar liquidación</Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm">{user?.email}</span>
              <Badge variant="outline" className="mt-1 self-start text-[10px]">{isAdmin ? 'Administrador' : 'Administrativo'}</Badge>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={async () => { await signOut(); navigate('/auth'); }}>
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
