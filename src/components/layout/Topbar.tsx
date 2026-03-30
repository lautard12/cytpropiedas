import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, Calculator, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbSeparator, BreadcrumbPage,
} from '@/components/ui/breadcrumb';

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
};

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-6">
      {/* Breadcrumb */}
      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          {pathSegments.length > 0 && pathSegments[0] !== '' && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {pathSegments.length === 1 ? (
                  <BreadcrumbPage>
                    {routeNames['/' + pathSegments[0]] || pathSegments[0]}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href={'/' + pathSegments[0]}
                    onClick={(e) => { e.preventDefault(); navigate('/' + pathSegments[0]); }}
                  >
                    {routeNames['/' + pathSegments[0]] || pathSegments[0]}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {pathSegments.length > 1 && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{decodeURIComponent(pathSegments[1])}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar contrato, propiedad..."
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Actions */}
      <Button size="sm" onClick={() => navigate('/nuevo-contrato')}>
        <Plus className="h-4 w-4 mr-1" />
        Nuevo contrato
      </Button>
      <Button size="sm" variant="outline" onClick={() => navigate('/generar-liquidacion')}>
        <Calculator className="h-4 w-4 mr-1" />
        Generar liquidación
      </Button>

      {/* Avatar */}
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <User className="h-4 w-4" />
      </div>
    </header>
  );
}
