# Endpoints — Eventos del contrato (timeline)

Pantallas: tab "Historial" en `/contratos/:id`, sección de eventos recientes en
Dashboard.

Categorías: `contractual` · `financiero` · `administrativo` · `documental`.

Tipos sugeridos (no enum, texto libre):
`alta_contrato`, `firma`, `renovacion`, `rescision`, `liquidacion_emitida`,
`liquidacion_estado`, `pago_registrado`, `pago_anulado`, `ajuste_icl`,
`ajuste_ipc`, `mora_notificada`, `intimacion`, `documento_subido`,
`comentario_interno`, `cambio_inquilino`, `cambio_propietario`.

---

## 1. Eventos de un contrato

**Hook**
```ts
useEventosContrato(contratoId: string): UseQueryResult<EventoContrato[]>
```
**HTTP**
```
GET /rest/v1/eventos_contrato?contrato_id=eq.{id}&order=fecha.asc
```

---

## 2. Eventos de un período específico

**Hook**
```ts
useEventosPorPeriodo(contratoId: string, periodo: string)
```
Hace fetch amplio (mes calendario) y filtra en cliente.

```
GET /rest/v1/eventos_contrato
    ?contrato_id=eq.{id}
    &or=(periodo.eq.{YYYY-MM},and(fecha.gte.{YYYY-MM}-01,fecha.lte.{YYYY-MM}-31))
```

---

## 3. Eventos recientes (Dashboard)

**Hook**
```ts
useEventosRecientes(limit = 10)
```
```
GET /rest/v1/eventos_contrato?order=fecha.desc&limit=10
```

---

## 4. Crear evento manual

```
POST /rest/v1/eventos_contrato
Body:
{
  "contrato_id":   "uuid",
  "liquidacion_id": null,
  "periodo":        "2025-04",
  "fecha":          "2025-04-12",
  "tipo":           "comentario_interno",
  "categoria":      "administrativo",
  "descripcion":    "Inquilino avisó atraso por feriado bancario",
  "monto":          null,
  "documento_url":  null
}
```

Eventos `pago_registrado`, `liquidacion_emitida` y `liquidacion_estado` los crea
**automáticamente** la base mediante triggers — no insertarlos desde el frontend.
