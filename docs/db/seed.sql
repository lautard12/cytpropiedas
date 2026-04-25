-- =====================================================================
-- Datos de ejemplo opcionales (1 propietario + 1 inquilino + 1 contrato)
-- Solo para entornos de desarrollo / demo.
-- =====================================================================

WITH p_prop AS (
  INSERT INTO public.personas (nombre, dni, cuit, email, telefono, banco, cbu)
  VALUES ('Juan Pérez', '12.345.678', '20-12345678-3', 'juan@example.com',
          '+54 9 341 555-1111', 'Banco Galicia', '0070123456789012345678')
  RETURNING id
), p_inq AS (
  INSERT INTO public.personas (nombre, dni, cuit, email, telefono)
  VALUES ('María Gómez', '30.111.222', '27-30111222-4', 'maria@example.com',
          '+54 9 341 555-2222')
  RETURNING id
), r_prop AS (
  INSERT INTO public.personas_roles (persona_id, rol)
  SELECT id, 'propietario' FROM p_prop RETURNING persona_id
), r_inq AS (
  INSERT INTO public.personas_roles (persona_id, rol)
  SELECT id, 'inquilino' FROM p_inq RETURNING persona_id
), prop AS (
  INSERT INTO public.propiedades (direccion, unidad, tipo, propietario_id, estado, metros, ambientes)
  SELECT 'San Martín 1234', '4°B', 'Departamento', id, 'Vacante', 65, 2 FROM p_prop
  RETURNING id, propietario_id
)
INSERT INTO public.contratos (
  codigo, propiedad_id, propietario_id, inquilino_id,
  fecha_inicio, fecha_fin, estado, alquiler_base,
  tipo_ajuste, frecuencia_ajuste, dia_vencimiento, comision_porcentaje
)
SELECT 'CTR-2025-001',
       prop.id, prop.propietario_id, p_inq.id,
       DATE '2025-01-01', DATE '2027-12-31', 'Activo', 350000,
       'ICL', 'Cuatrimestral', 10, 8.5
FROM prop, p_inq;
