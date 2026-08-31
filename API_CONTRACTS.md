# Contratos de API REST

> Documento complementario de `REQUIREMENTS.md` y `DATABASE_SCHEMA.md`. Base path sugerida: `/api/v1`. Todas las rutas (excepto `/auth/*`) requieren header `Authorization: Bearer <JWT>`.

Convenciones de respuesta:
```json
// Éxito
{ "data": { ... }, "meta": { ... opcional } }

// Error
{ "error": { "code": "ESTADO_INVALIDO", "message": "...", "details": { ... opcional } } }
```

---

## 1. Autenticación

### `POST /auth/login`
```json
// Request
{ "email": "empleado@empresa.com", "password": "••••••" }

// Response 200
{ "data": { "token": "eyJ...", "usuario": { "id": "uuid", "nombre": "Ana Pérez", "rol": "empleado" } } }
```

### `POST /auth/refresh`
Renueva el token antes de expirar. Sin body adicional (usa refresh token en cookie httpOnly o body, a definir en implementación).

---

## 2. Fichaje / Jornada

### `GET /attendance/today`
Devuelve el estado actual del usuario autenticado para el día de hoy (según `America/Bogota`).
```json
// Response 200
{
  "data": {
    "estado": "SIN_INICIAR",
    "registro": null
  }
}
```
Si ya hay jornada activa:
```json
{
  "data": {
    "estado": "JORNADA_ACTIVA",
    "registro": {
      "id": "uuid",
      "fecha": "2026-08-30",
      "horaInicio": "2026-08-30T13:05:00Z"
    }
  }
}
```

### `POST /attendance/start`
Transición `SIN_INICIAR → JORNADA_ACTIVA`. Sin body (la hora la pone el servidor).
- `201` con el registro creado.
- `409 Conflict` (`code: JORNADA_YA_ACTIVA`) si ya existe una jornada activa sin cerrar.

### `POST /attendance/finish`
Transición `JORNADA_ACTIVA → JORNADA_FINALIZADA`.
```json
// Request
{ "descripcionProyectos": "Proyecto Facturación (4h), Soporte cliente X (3h)" }
```
- `200` con el registro actualizado y las horas ya calculadas (ordinarias/extra/nocturnas/dominicales).
- `409 Conflict` (`code: NO_HAY_JORNADA_ACTIVA`) si no hay una jornada `JORNADA_ACTIVA` para transicionar.
- `422 Unprocessable Entity` si falta `descripcionProyectos`.

### `GET /attendance?desde=2026-08-01&hasta=2026-08-31&usuarioId=uuid`
Lista registros en un rango. `usuarioId` solo puede ser distinto al usuario autenticado si el rol es `administrador`.
```json
{
  "data": [
    {
      "id": "uuid",
      "fecha": "2026-08-25",
      "horaInicio": "...",
      "horaFin": "...",
      "estado": "JORNADA_FINALIZADA",
      "horasOrdinarias": 8.0,
      "horasExtraDiurnas": 0,
      "horasExtraNocturnas": 0,
      "horasRecargoNocturno": 0,
      "horasDominicalFestivo": 0,
      "esFestivo": false,
      "esFinDeSemana": false
    }
  ]
}
```

### `PUT /attendance/:id`
Edición manual desde el calendario (barras arrastrables). Dispara recálculo de horas y registro en `audit_log`.
```json
// Request
{ "horaInicio": "2026-08-25T13:00:00Z", "horaFin": "2026-08-25T22:00:00Z", "motivo": "Corrección: olvidó fichar salida" }
```
- `200` con el registro recalculado.
- `403 Forbidden` si el usuario no es dueño del registro ni administrador.

### `GET /attendance/summary?semana=2026-W35&usuarioId=uuid`
Alimenta el panel de reporte del calendario (5.2).
```json
{
  "data": {
    "horasTrabajadas": 34.5,
    "horasMinimasSemanales": 42,
    "horasExtra": 0,
    "horasFaltantes": 7.5
  }
}
```

---

## 3. Configuración del sistema

### `GET /config`
Devuelve los valores **vigentes hoy** de todas las variables de sistema.

### `PUT /config/:clave` *(solo `administrador`)*
```json
// Request
{ "valor": 42, "vigenteDesde": "2026-07-15" }
```
Internamente **no hace UPDATE**: cierra la versión anterior (`vigente_hasta`) e inserta una nueva fila (ver `DATABASE_SCHEMA.md` sección 2).

---

## 4. Calendario

### `GET /calendar?mes=8&anio=2026&usuarioId=uuid`
Devuelve, por día del mes, las horas trabajadas + metadatos visuales (festivo, fin de semana) que el frontend usa para pintar sin tener que calcular nada por su cuenta.
```json
{
  "data": [
    { "fecha": "2026-08-01", "esFinDeSemana": false, "esFestivo": false, "horasTrabajadas": 8.0 },
    { "fecha": "2026-08-02", "esFinDeSemana": true, "esFestivo": false, "horasTrabajadas": 0 },
    { "fecha": "2026-08-07", "esFinDeSemana": false, "esFestivo": true, "nombreFestivo": "Batalla de Boyacá", "horasTrabajadas": 0 }
  ]
}
```

---

## 5. Permisos (Fase 3)

### `POST /leaves` — crea en estado `BORRADOR`
```json
{ "fechaSolicitud": "2026-09-02", "horas": 4, "tipo": "PARCIAL", "descripcion": "Cita médica" }
```

### `GET /leaves/:id/preview`
Devuelve la info combinada para la pantalla de previsualización (datos del empleado + del permiso).

### `POST /leaves/:id/submit` — transición a `ENVIADO`, dispara la confirmación en frontend.

### `PUT /leaves/:id` — edición (botón "Editar" de la previsualización regresa aquí).

---

## 6. Viajes (Fase 4)

### `POST /trips`
```json
{ "fecha": "2026-08-30", "puntoPartida": "Oficina Bogotá", "puntoFinal": "Cliente Zona Industrial", "descripcion": "Visita técnica", "valor": 5000 }
```
`valor` es opcional en el request; si se omite, el backend lo completa con `configuracion_sistema.valorViajePorDefecto` vigente.

### `GET /trips?fecha=2026-08-30&usuarioId=uuid`

---

## 7. Reportes

### `GET /reports/excel?desde=2026-08-01&hasta=2026-08-31&usuarioId=uuid`
Devuelve el archivo `.xlsx` (content-type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) con las hojas **"Horas laboradas"** y **"Viajes laborados"** (sección 6 de `REQUIREMENTS.md`). Si `usuarioId` se omite y el rol es `administrador`, se exporta el consolidado de todos los empleados.

---

## Códigos de error comunes

| Code | HTTP | Cuándo |
|---|---|---|
| `JORNADA_YA_ACTIVA` | 409 | Se intenta iniciar jornada existiendo una activa |
| `NO_HAY_JORNADA_ACTIVA` | 409 | Se intenta finalizar sin jornada activa |
| `TRANSICION_INVALIDA` | 409 | Cualquier otra transición de estado no permitida (ver `STATE_MACHINE.md`) |
| `NO_AUTORIZADO` | 403 | Acceso a recurso de otro usuario sin rol administrador |
| `VALIDACION` | 422 | Campos requeridos faltantes o inválidos |
