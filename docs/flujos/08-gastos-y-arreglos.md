# Flujo 08 — Gastos, arreglos y reintegros en la liquidación

Cómo se decide **quién paga un gasto** (reparación, service, impuesto,
expensa extraordinaria, etc.), **quién lo adelanta** y **cómo impacta** en la
liquidación, sin riesgo de doble descuento ni montos negativos.

> Regla mental rápida:
> 1. **Responsable**: ¿a quién le corresponde el gasto? (Inquilino / Propietario / Compartido)
> 2. **Pagado por**: ¿quién puso la plata? (Inquilino / Propietario / Inmobiliaria / Pendiente)
> 3. El sistema **deriva automáticamente** cómo se cobra, descuenta o reintegra.

---

## 1. Reglas del contrato

Tab **Configuración Contractual Vigente** (`public.contratos`):

| Campo | Valores | Qué representa |
|---|---|---|
| `expensas_ordinarias` | `Inquilino` / `Propietario` | Expensas mensuales del consorcio. |
| `expensas_extraordinarias` | `Propietario` / `Inquilino` | Obras, refacciones, fondos especiales. Default **Propietario**. |
| `tgi` (TGI / ABL) | `Inquilino` / `Propietario` | Impuesto inmobiliario. |
| `api` | `Inquilino` / `Propietario` | Aporte Patronal Inmobiliario (Santa Fe). |
| `seguro` | `Inquilino` / `Propietario` / `No aplica` | Seguro integral. |
| `servicios` | `Inquilino` / `Propietario` | Luz, gas, agua, internet. |
| `destino_cobro` | `Inmobiliaria` / `Propietario` | Modalidad de cobro (afecta el cierre financiero). |

### Reparaciones puntuales (no recurrentes)

Cuando no hay regla fija, la operadora aplica el criterio legal estándar (uso
normal → inquilino; estructural → propietario; urgentes adelantadas → se
reintegran). Las cláusulas particulares del contrato prevalecen.

---

## 2. Modelo de datos extendido

### 2.1 `conceptos_liquidacion`

Campos nuevos:

| Campo | Valores | Significado |
|---|---|---|
| `pagado_por` | `Inquilino` / `Propietario` / `Inmobiliaria` / `Pendiente` | Quién puso la plata. |
| `tipo_impacto` | ver tabla abajo | Cómo impacta en los totales. |
| `periodo_impacto` | `Actual` / `ProximoPeriodo` | Si pertenece a este mes o queda diferido. |
| `comprobante_url` | URL | Foto/PDF del comprobante. |
| `observaciones` | texto | Aclaraciones. |
| `concepto_relacionado_id` | uuid | Vínculo a otro concepto que **compensa** este (par a par). |

### 2.2 Regla dura: `monto >= 0` (siempre positivo)

El **signo** lo deriva el `tipo_impacto`. Si una operación reduce lo que paga
el inquilino (descuento, reintegro), **no se guarda negativo**; se guarda
positivo y el cálculo lo resta.

| `tipo_impacto` | Efecto en el cálculo |
|---|---|
| `cobrar_al_inquilino` | `+monto` al total a cobrar al inquilino |
| `reintegrar_al_inquilino` | `−monto` del total a cobrar al inquilino |
| `descontar_al_propietario` | `+monto` a descontar del neto / sumar al cobro al propietario |
| `reintegrar_al_propietario` | `−monto` al inquilino **y** reconocimiento a favor del propietario |
| `informativo` | No afecta totales (queda como evento/comprobante) |

`aplica_al_inquilino` se deriva automáticamente por trigger desde `tipo_impacto`.

### 2.3 Tabla `conceptos_pendientes_contrato`

Los gastos marcados con `periodo_impacto = ProximoPeriodo` **no** se insertan
en una liquidación futura inexistente. Se acumulan acá con estado
`Pendiente`, y al generar la próxima liquidación se vuelcan automáticamente y
pasan a `Aplicado`. También se usa para arrastrar saldo a favor del inquilino
(ver §4.4).

| Estado | Significado |
|---|---|
| `Pendiente` | Esperando próxima liquidación del contrato. |
| `Aplicado` | Ya se incorporó a una liquidación (`liquidacion_aplicada_id`). |
| `Anulado` | Descartado por la operadora. |

---

## 3. Matriz de derivación (UI guiada)

La operadora **no elige `tipo_impacto`**. Responde dos preguntas y el sistema
lo deriva:

```
Responsable | Pagado por   | tipo_impacto generado
------------+--------------+----------------------------------
Inquilino   | Inmobiliaria | cobrar_al_inquilino
Inquilino   | Inquilino    | informativo (cada uno pagó lo suyo)
Inquilino   | Propietario  | cobrar_al_inquilino  +  reintegrar_al_propietario  (par vinculado)
Propietario | Inmobiliaria | descontar_al_propietario
Propietario | Inquilino    | reintegrar_al_inquilino  (se sugiere vincular al descontar_al_propietario si existe)
Propietario | Propietario  | informativo
Compartido  | *            | se divide en dos partes y se aplica la matriz a cada una
Cualquiera  | Pendiente    | informativo (queda hasta definir)
```

El diálogo guiado vive en `src/components/ConceptoGastoDialog.tsx` y se abre:

- Desde **Detalle de Liquidación** (`/liquidaciones/:id`) → botón **“Agregar
  gasto / reparación”**.
- Para conceptos a aplicar el mes que viene → se guardan en
  `conceptos_pendientes_contrato`.

---

## 4. Cálculo (función `recalcular_liquidacion`)

Se invoca por trigger en cualquier INSERT/UPDATE/DELETE sobre
`conceptos_liquidacion`. Pasos:

### 4.1 Detalle al inquilino

```
subtotal_inquilino      = Σ cobrar_al_inquilino
reintegros_al_inquilino = Σ reintegrar_al_inquilino + Σ reintegrar_al_propietario
total_cobrar_bruto      = subtotal_inquilino − reintegros_al_inquilino + saldo_anterior
total_cobrar            = MAX(0, total_cobrar_bruto)
saldo_a_favor_inquilino = MAX(0, −total_cobrar_bruto)
```

### 4.2 Detalle propietario / inmobiliaria

```
gastos_descontables = Σ descontar_al_propietario
                      EXCLUYENDO los compensados por un reintegrar_al_inquilino
                      vinculado (concepto_relacionado_id)
gastos_a_reintegrar = Σ reintegrar_al_propietario
comision            = alquiler_base * comision_% * (iva ? 1.21 : 1)
```

### 4.3 Cierre por modalidad

```
Modalidad Inmobiliaria (rendición):
  neto_propietario =
        total_cobrado
      − comision
      − gastos_descontables
      + gastos_a_reintegrar

Modalidad Propietario (cobro de comisión):
  total_cobrar_al_propietario =
        comision + iva_comision
      + gastos_descontables       -- los adelantó la inmobiliaria
      − gastos_a_reintegrar       -- el dueño ya cobró del inquilino
```

### 4.4 Saldo a favor del inquilino

Si `total_cobrar_bruto < 0`, la liquidación queda con `total_cobrar = 0` y se
**genera automáticamente** un registro en `conceptos_pendientes_contrato` con
`tipo_impacto = reintegrar_al_inquilino` por `saldo_a_favor_inquilino`. Se
aplicará al generar la próxima liquidación del contrato.

---

## 5. Anti-doble-descuento (par a par)

La validación **no es global**. Funciona por vínculo concepto-a-concepto:

- Cuando se inserta un `reintegrar_al_inquilino` referenciando un
  `descontar_al_propietario` (vía `concepto_relacionado_id`), el cálculo
  **excluye** ese `descontar_al_propietario` de `gastos_descontables`. Queda
  solo el reintegro al inquilino como compensación → el propietario lo
  reconoce una vez, no dos.
- Si no se vincula y existe un `descontar_al_propietario` del mismo monto sin
  par, la UI muestra una alerta destructiva pidiendo confirmar o vincular.
- Conceptos vinculados deben tener el mismo monto.

---

## 6. Ejemplos

### 6.1 Modalidad Inmobiliaria — termotanque pagado por la inmobiliaria

```
Concepto                         | tipo_impacto             | monto
---------------------------------|--------------------------|--------
Alquiler                         | cobrar_al_inquilino      | 350.000
Expensas ord.                    | cobrar_al_inquilino      |  60.000
Arreglo termotanque (Inmob.)     | descontar_al_propietario |  80.000

subtotal_inquilino  = 410.000
total_cobrar        = 410.000
comision (8%)       =  28.000
gastos_descontables =  80.000
neto_propietario    = 410.000 − 28.000 − 80.000 = 302.000
```

### 6.2 Modalidad Propietario — termotanque adelantado por la inmobiliaria

Mismo ejemplo pero con `destino_cobro = Propietario`:

```
total_cobrar_al_propietario =
   28.000 (comisión)
 +  5.880 (IVA)
 + 80.000 (gastos descontables)
 = 113.880
```

### 6.3 Reintegro al inquilino vinculado (arreglo urgente que pagó él)

El inquilino adelantó al plomero $80.000 que correspondían al propietario.

```
1) Crear concepto base:
   "Arreglo cañería"  | descontar_al_propietario | 80.000  (pagado_por=Inquilino) → id=A
2) Crear concepto vinculado:
   "Reintegro inquilino" | reintegrar_al_inquilino | 80.000 | concepto_relacionado_id=A
```

Cálculo: `gastos_descontables` excluye A porque tiene un vínculo. La única
compensación al propietario es el reintegro al inquilino:

```
total_cobrar_inquilino reduce en 80.000
neto_propietario reduce en 80.000   (no se descuenta dos veces)
```

### 6.4 Propietario pagó un gasto del inquilino

El propietario le pagó al inquilino una multa de $20.000 que correspondía al
inquilino.

```
Concepto                        | tipo_impacto              | monto
--------------------------------|---------------------------|------
Multa adelantada por propietario| cobrar_al_inquilino       | 20.000
↳ vinculado                     | reintegrar_al_propietario | 20.000
```

El inquilino paga los $20.000 extra y se reconocen a favor del propietario en
el cálculo (suma al neto a rendir, o resta al cobro al propietario).

### 6.5 Saldo a favor del inquilino

Reintegros del mes ($500.000) > total a cobrar ($350.000):

```
total_cobrar_bruto      = 350.000 − 500.000 = −150.000
total_cobrar            =       0
saldo_a_favor_inquilino = 150.000
→ se crea conceptos_pendientes_contrato {reintegrar_al_inquilino, 150.000}
```

El próximo mes la nueva liquidación lo aplica automáticamente.

---

## 7. Resumen económico en pantalla

`/liquidaciones/:id` muestra dos bloques:

```
─ Inquilino
   Subtotal a cobrar al inquilino       $ ...
   Reintegros al inquilino             −$ ...
   Saldo anterior                       $ ...
   Total a cobrar al inquilino          $ ...
   Cobrado                              $ ...
   Pendiente                            $ ...

─ Propietario / Inmobiliaria
   Gastos adelantados por inmobiliaria  $ ...
   Gastos a cargo del propietario       $ ...   (los descontables)
   A reintegrar al propietario          $ ...
   Comisión inmobiliaria                $ ...
   IVA s/ comisión                      $ ...

   Modalidad Inmobiliaria:
      Neto a transferir al propietario  $ ...
   Modalidad Propietario:
      Total a cobrar al propietario     $ ...
```

---

## 8. Errores comunes a evitar

- ❌ Cargar montos negativos. La DB lo rechaza (`CHECK monto >= 0`). Usar
  `reintegrar_al_inquilino` o `reintegrar_al_propietario`.
- ❌ Crear un reintegro al inquilino sin vincular el `descontar_al_propietario`
  asociado: el propietario terminaría compensando dos veces.
- ❌ Insertar conceptos del "próximo período" en una liquidación que aún no
  existe. Para eso está `conceptos_pendientes_contrato`.
- ❌ En modalidad Propietario, usar la palabra "rendición". El término
  correcto es **cobro de comisión** (incluye comisión + IVA + gastos
  descontables − reintegros al propietario).

---

## 9. Referencias

- Reglas del contrato: [`../03-modelo-de-datos.md`](../03-modelo-de-datos.md)
- Generación de la liquidación: [`02-generacion-liquidacion.md`](./02-generacion-liquidacion.md)
- Cobranzas: [`03-cobranza-y-pagos.md`](./03-cobranza-y-pagos.md)
- Rendición al propietario: [`04-rendicion-al-propietario.md`](./04-rendicion-al-propietario.md)
- Glosario: [`../05-glosario.md`](../05-glosario.md)
