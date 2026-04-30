# 1. Visión general

## Propósito
**CyT Propiedades** es un sistema web para administradoras inmobiliarias que gestionan
alquileres en Argentina. Reemplaza el seguimiento manual en Excel por un flujo integrado
de propiedades → contratos → liquidaciones mensuales → cobranzas → rendiciones.

## Usuarios
- **Administradora** (operadora): da de alta personas, propiedades y contratos; genera
  liquidaciones mensuales; registra pagos; rinde al propietario.
- **Cobranzas / contabilidad** (rol futuro): operación diaria de pagos.
- **Propietario / inquilino**: actualmente no acceden al sistema (solo reciben PDF/email
  por fuera; en roadmap se evalúa portal de cliente).

## Alcance funcional actual (MVP)
| Módulo | Estado |
|---|---|
| ABM Personas (propietario, inquilino, garante) con detección de duplicados | ✅ |
| ABM Propiedades (con lat/long y matrícula catastral) | ✅ |
| ABM Contratos (con reglas por contrato: TGI, API, expensas, seguro, servicios) | ✅ |
| Generación de liquidaciones mensuales con conceptos | ✅ |
| Registro de pagos con cambio automático de estado | ✅ |
| Anulación de pagos con recálculo y auditoría (RPC `anular_pago`) | ✅ |
| Historial / timeline de eventos por contrato | ✅ |
| Dashboard con KPIs financieros | ✅ |
| Reportes (resultado financiero) | ✅ |
| Autenticación email/password + RLS por rol (`admin`, `administrativo`) | ✅ |
| Organización + sucursales + alta/baja de personal con causa | ✅ |
| Auditoría inmutable de cambios sensibles (`/auditoria`) | ✅ |
| Exportación PDF de liquidaciones | ⏳ pendiente |
| Ajuste automático ICL/IPC | ⏳ pendiente (modelo soporta, falta job) |
| Notificaciones por email/WhatsApp | ⏳ pendiente |

## Reglas de negocio núcleo
1. **Una liquidación pertenece a (contrato, período mensual)**, no a la propiedad.
2. **Cada contrato tiene reglas propias** sobre quién paga cada concepto (inquilino,
   propietario, no aplica).
3. **Comisión inmobiliaria**: porcentaje configurable por contrato; opcionalmente con IVA.
4. **Ciclo de vida de la liquidación**: `Borrador → Pendiente → Parcial → Cobrada → Transferida` (y `Anulada`).
5. **Neto al propietario** = `total_cobrado − comision_inmobiliaria` (más/menos saldos
   anteriores y conceptos a cuenta del propietario).
6. **Persona única, múltiples roles de dominio**: una persona física puede ser
   simultáneamente propietaria de una unidad e inquilina de otra. Los roles de
   dominio (propietario / inquilino) **se derivan** de la existencia de filas en
   `propietarios` / `inquilinos` — no se persisten en una tabla aparte.
7. **Roles de aplicación** (`admin`, `administrativo`) viven en `user_roles` (N:M
   entre `usuarios` y `roles`), independientes de los roles de dominio.
8. **Personal**: una persona se vincula a una sucursal mediante un legajo en la
   tabla `personal` (`fecha_alta` / `causa_alta` / `fecha_baja` / `causa_baja`).
   Solo puede haber un legajo activo por persona.
