# Flujo 08 — Gastos, arreglos y reintegros en la liquidación

Este documento explica **cómo se determina quién paga un gasto** (un arreglo de
plomería, un service del termotanque, una reparación edilicia, un impuesto, una
expensa extraordinaria, etc.) y **cómo ese gasto entra a la liquidación
mensual** según las reglas del contrato y la modalidad de cobro
(`Inmobiliaria` / `Propietario`).

> Regla mental rápida:
> 1. ¿Quién es el **responsable** del gasto según el contrato? (Inquilino / Propietario / Compartido)
> 2. ¿Quién **adelantó** la plata? (Inquilino, Propietario o la Inmobiliaria)
> 3. Según eso, el gasto se **cobra al inquilino**, se **descuenta del neto al propietario** o se **reintegra**.

---

## 1. Quién se hace cargo: reglas del contrato

Cada contrato define, en su tab **Configuración Contractual Vigente**, quién
asume cada tipo de gasto recurrente. Estos campos viven en `public.contratos`:

| Campo | Valores típicos | Qué representa |
|---|---|---|
| `expensas_ordinarias` | `Inquilino` / `Propietario` | Expensas mensuales del consorcio. Por ley de alquileres (Vivienda) suelen ir a cargo del inquilino. |
| `expensas_extraordinarias` | `Propietario` / `Inquilino` | Obras, refacciones del edificio, fondos especiales. Por defecto **Propietario**. |
| `tgi` (TGI / ABL) | `Inquilino` / `Propietario` | Impuesto inmobiliario municipal. |
| `api` | `Inquilino` / `Propietario` | Aporte Patronal Inmobiliario (Santa Fe). |
| `seguro` | `Inquilino` / `Propietario` / `No aplica` | Seguro de incendio / integral. |
| `servicios` | `Inquilino` / `Propietario` | Luz, gas, agua, internet (lo normal: inquilino). |

Estos valores se **leen al generar la liquidación** y determinan qué conceptos
se agregan automáticamente y con qué `responsable`.

### Reparaciones y arreglos puntuales (no recurrentes)

No hay una regla fija en el contrato para cada arreglo posible (un caño que
pierde, un calefón roto, una persiana). La operadora aplica el **criterio
legal/contractual estándar**:

| Tipo de arreglo | Por defecto lo paga | Por qué |
|---|---|---|
| Mantenimiento por **uso normal** (cambio de lamparitas, juntas, destapaciones simples, pintura de desgaste) | **Inquilino** | Conservación corriente. |
| **Roturas por mal uso** del inquilino | **Inquilino** | Daño imputable. |
| **Reparaciones estructurales** (cañerías, techos, instalación eléctrica, calefón, termotanque, electrodomésticos provistos) | **Propietario** | Conservación de la cosa locada. |
| **Vicios ocultos** o anteriores al contrato | **Propietario** | Responsabilidad del dueño. |
| Reparaciones **urgentes** que adelanta el inquilino | Se **reintegra al inquilino** si corresponde al propietario | Art. 1209 CCyC. |
| **Cláusulas particulares** del contrato | Lo que diga el contrato | Prevalece sobre el default. |

> Si hay duda, la operadora consulta a las partes antes de cargar el concepto.
> Las cláusulas particulares quedan en `contratos.clausulas_particulares` y
> `reglas_observaciones` como referencia.

---

## 2. Cómo entra el gasto a la liquidación

Toda la liquidación se compone de **conceptos** en
`public.conceptos_liquidacion`. Cada concepto tiene dos campos clave:

```
responsable           text   -- 'Inquilino' | 'Propietario' | 'Compartido'
aplica_al_inquilino   bool   -- ¿se cobra al inquilino en esta liquidación?
```

La combinación de esos dos campos define **dónde impacta** el gasto:

| Caso | `responsable` | `aplica_al_inquilino` | Efecto |
|---|---|---|---|
| **A.** Gasto típico del inquilino (alquiler, expensas ord., ABL si así está pactado, servicios) | `Inquilino` | `true` | Suma al `total_cobrar` del inquilino. No afecta neto al propietario. |
| **B.** Gasto del propietario que la inmobiliaria adelantó o que sale del cobro (expensas extraordinarias, arreglo estructural, seguro a cargo del dueño) | `Propietario` | `false` | **NO** se le cobra al inquilino. Se **descuenta del neto al propietario** al rendir. |
| **C.** Arreglo que correspondía al propietario pero **adelantó el inquilino** y se le reintegra | `Propietario` | `false` + concepto **negativo** “Reintegro a inquilino” `aplica_al_inquilino=true` con signo negativo | Se descuenta del total a cobrar al inquilino y se descuenta del neto al propietario. |
| **D.** Gasto compartido (ej.: 50/50 una mejora) | `Compartido` | `true` (la parte del inquilino) + segundo concepto `Propietario` / `false` (la parte del dueño) | Se parte en dos líneas. |

> Regla de oro: **un concepto a cargo del propietario nunca se le cobra al
> inquilino**. Si el inquilino adelantó la plata, se carga como **reintegro**
> aparte, no se mezcla.

### Fórmulas internas

```
subtotal              = Σ conceptos donde aplica_al_inquilino = true
total_cobrar          = subtotal + saldo_anterior
gastos_propietario    = Σ conceptos donde responsable = 'Propietario'
                        y aplica_al_inquilino = false
comision_inmobiliaria = alquiler_base * comision% * (iva ? 1.21 : 1)
neto_propietario      = total_cobrado
                        - comision_inmobiliaria
                        - gastos_propietario
```

Si `gastos_propietario` supera lo cobrado en el mes, `neto_propietario` puede
ser cero o negativo: en ese caso **se arrastra como saldo a favor/contra del
propietario** al período siguiente (queda asentado en observaciones; no se
fuerza un valor negativo).

---

## 3. Modalidad de cobro y el destino del gasto

El campo `contratos.destino_cobro` (y su snapshot en
`liquidaciones.destino_cobro`) define dos circuitos distintos:

### 3.1 Modalidad `Inmobiliaria` (default)

- El inquilino paga **a la inmobiliaria**.
- La inmobiliaria descuenta comisión + gastos a cargo del propietario.
- Se **rinde al propietario** el neto (tabla `rendiciones_propietario`).
- Estado terminal de la liquidación: **`Transferida`** ("Rendida al propietario").

Ejemplo: arreglo de termotanque de $80.000 que paga la inmobiliaria al
plomero por cuenta del propietario.

```
Conceptos:
- Alquiler                350.000   responsable=Inquilino     aplica=true
- Expensas ord.            60.000   responsable=Inquilino     aplica=true
- Arreglo termotanque      80.000   responsable=Propietario   aplica=false

subtotal              = 410.000
total_cobrar          = 410.000
comision (8%)         =  28.000
gastos_propietario    =  80.000
neto_propietario      = 410.000 − 28.000 − 80.000 = 302.000
```

Al rendir se transfieren **$302.000** al propietario y se adjunta el
comprobante del arreglo.

### 3.2 Modalidad `Propietario`

- El inquilino paga **directo al propietario** (pago tipo
  `pago_directo_propietario` — no entra a caja de la inmobiliaria, no suma a la
  facturación de la administradora).
- La inmobiliaria **no rinde nada**: solo **cobra su comisión + IVA +
  eventuales reintegros** al propietario (tabla
  `cobros_comision_propietario`).
- Estado terminal de la liquidación: **`Cobrada`** (etiquetada en UI como
  "Comisión cobrada").
- **Nunca** se usa la palabra "rendición" en esta modalidad.

Ejemplo: mismo arreglo de $80.000, pero esta vez lo pagó la **inmobiliaria** y
hay que reintegrárselo cuando cobre la comisión.

```
Liquidación:
- Alquiler                350.000   responsable=Inquilino     aplica=true (cobra el dueño)
- Expensas ord.            60.000   responsable=Inquilino     aplica=true (cobra el dueño)
- Arreglo termotanque      80.000   responsable=Propietario   aplica=false (lo adelantó la inmobiliaria)

comision (8% s/alquiler) =  28.000
iva_comision (21%)       =   5.880
gastos_reintegro         =  80.000

A cobrar al propietario  = 28.000 + 5.880 + 80.000 = 113.880
```

En la pantalla de detalle aparece el bloque **"A cobrar al propietario"** con
ese total y el botón **"Cobrar comisión"** que registra el cobro en
`cobros_comision_propietario` (estado Pendiente → Cobrada).

Si el arreglo lo pagó el **propietario directamente** al plomero, no se carga
como concepto: queda asentado en observaciones / eventos del contrato y no
modifica los números de la liquidación.

---

## 4. Paso a paso en la UI

1. **Generar liquidación** (`/generar-liquidacion`)
   - Se eligen contrato + período.
   - El sistema precarga los conceptos automáticos según las reglas del
     contrato (alquiler, expensas, ABL, API, seguro, servicios) con su
     `responsable` correcto.
2. **Agregar el arreglo** como concepto manual:
   - Si lo paga el inquilino → `responsable = Inquilino`, `aplica = true`.
   - Si lo paga el propietario y lo adelantó la inmobiliaria →
     `responsable = Propietario`, `aplica = false`. Adjuntar comprobante en
     observaciones / documentos.
   - Si lo adelantó el inquilino y se le reintegra → agregar concepto
     `Reintegro` negativo `aplica = true` + concepto `Propietario`/`false` por
     el mismo importe (deja la traza contable).
3. **Emitir** la liquidación (`Borrador → Pendiente`).
4. **Cobrar** del inquilino (`RegistrarPagoDialog`). El estado pasa a
   `Parcial` o `Cobrada`.
5. **Cierre financiero**:
   - Modalidad `Inmobiliaria`: botón **Rendir al propietario** →
     `Transferida`.
   - Modalidad `Propietario`: botón **Cobrar comisión** → registra cobro en
     `cobros_comision_propietario`.

---

## 5. Errores comunes a evitar

- ❌ Cargar un arreglo del propietario con `aplica_al_inquilino = true` "para
  que el inquilino lo pague". Si correspondía al propietario y se decidió
  cobrárselo al inquilino, **modificar primero la regla del contrato** o
  dejarlo explícito como acuerdo particular en observaciones.
- ❌ En modalidad `Propietario`, registrar el cobro del inquilino como pago
  normal de la inmobiliaria. Debe usarse el flujo **"pago directo al
  propietario"** (`tipo = 'pago_directo_propietario'`) para no inflar la
  facturación de la administradora.
- ❌ Hablar de "rendición" cuando el contrato es modalidad `Propietario`. El
  término correcto es **"cobro de comisión"**.
- ❌ Mezclar reintegros con conceptos del inquilino sin discriminar. Cada
  reintegro debe ser una línea propia y trazable a su comprobante.

---

## 6. Referencias

- Reglas del contrato: [`../03-modelo-de-datos.md`](../03-modelo-de-datos.md)
- Generación de la liquidación: [`02-generacion-liquidacion.md`](./02-generacion-liquidacion.md)
- Cobranzas: [`03-cobranza-y-pagos.md`](./03-cobranza-y-pagos.md)
- Rendición al propietario (modalidad Inmobiliaria): [`04-rendicion-al-propietario.md`](./04-rendicion-al-propietario.md)
- Glosario (TGI, API, comisión, neto, etc.): [`../05-glosario.md`](../05-glosario.md)
