# Preparación para App Móvil Nativa (Fase 6)

> Documento complementario de `REQUIREMENTS.md`. Resume la revisión hecha para confirmar que el backend es consumible desde una futura app React Native **sin cambios de lógica**, y qué se ajustó para lograrlo.

## Checklist de arquitectura API-first

| Requisito | Estado | Detalle |
|---|---|---|
| API REST versionada, sin lógica en el cliente | ✅ | Todo bajo `/api/v1`; toda regla de negocio vive en `application`/`domain`, nunca se asumió un navegador |
| Autenticación sin estado de servidor (sesiones/cookies) | ✅ | JWT en `Authorization: Bearer`, nada de cookies — funciona igual en `fetch` de un navegador o de React Native |
| Sesiones largas sin re-pedir contraseña constantemente | ✅ (agregado en Fase 6) | Access token corto (1h) + refresh token opaco de 30 días, revocable (`refresh_tokens`). Antes de esta fase el JWT duraba 8h sin forma de renovarlo — inviable para una app que la gente no cierra en días. Ver `AuthService` y `POST /auth/refresh` / `POST /auth/logout` |
| Formato de respuesta uniforme | ✅ | Siempre `{ data }` o `{ error: { code, message } }` — un cliente móvil puede manejar errores por `code` sin parsear texto |
| Zona horaria/formato de hora explícitos en la respuesta | ✅ | Cada registro de jornada devuelve tanto ISO (`horaInicio`) como 24h Bogotá ya calculado (`horaInicio24`), para que el cliente no tenga que reimplementar conversión de zona horaria |
| Descarga de archivos (reporte Excel) sin requerir navegador | ✅ | `GET /reports/excel` es un `GET` autenticado que devuelve bytes con `Content-Type`/`Content-Disposition` estándar — se consume igual con `fetch` + `blob()` en React Native (con una librería de guardado de archivos del lado nativo) que en web |
| Endpoint de salud para diagnóstico de conectividad | ✅ | `GET /health`, sin autenticación, útil para que la app verifique conectividad al backend antes de operar |
| CORS | ⚠️ Revisar por entorno | Hoy `cors()` está abierto (`*`). Una app nativa no está sujeta a CORS (no es un navegador), así que esto no bloquea al móvil; pero **antes de producción, para el frontend web sí conviene restringir `origin` al dominio real** — no se cambió en esta fase para no romper el frontend de desarrollo, queda como pendiente explícito |
| Logging no interfiere con clientes múltiples | ✅ | El logger (Fase de logging) no asume un único cliente; cada request se loguea con su propio contexto |

## Qué se implementó en esta fase

- **`refresh_tokens`** (migración `009_refresh_tokens.sql`): tokens opacos (no JWT) hasheados con SHA-256, con expiración y revocación reales — un JWT no se puede invalidar antes de su vencimiento sin esto.
- **`AuthService.refrescar()`**: rota el refresh token en cada uso (revoca el anterior, emite uno nuevo) para limitar el daño si un token llega a filtrarse — buena práctica estándar para clientes móviles de larga duración.
- **`AuthService.logout()`**: revoca el refresh token — permite un "cerrar sesión" real, no solo borrar el token del lado del cliente.
- **`POST /auth/refresh`** y **`POST /auth/logout`**: documentados en `API_CONTRACTS.md`.
- **Frontend web actualizado como referencia de implementación**: `api/client.ts` ahora renueva automáticamente el access token ante un `401` y reintenta la request una vez; si el refresh también falla, limpia la sesión y notifica a la UI (`AuthContext`). **Este mismo patrón es el que debe replicar la app React Native** cuando se construya — es la razón por la que se implementó primero en el frontend web: sirve de referencia probada.

## Qué NO se implementó (fuera de alcance de esta fase, a definir cuando exista la app)

- Push notifications (requieren un servicio como Firebase Cloud Messaging, fuera del alcance de este backend).
- Sincronización offline / cola de acciones pendientes (relevante si la app debe funcionar sin conexión — el fichaje con hora de servidor, en particular, no es compatible con "guardar offline y sincronizar después" sin rediseñar esa regla de negocio).
- Restricción de CORS por entorno (ver tabla arriba).
- Endpoint de cambio de contraseña y gestión de dispositivos/sesiones activas (útil para que un usuario vea y revoque sesiones de otros dispositivos).

## Conclusión

El backend, tal como quedó al cierre de la Fase 6, es consumible por una app React Native sin necesidad de cambiar ninguna regla de negocio ni contrato de API — solo de escribir el cliente HTTP nativo replicando el patrón de refresh automático ya implementado y probado en `timetracker-frontend/src/api/client.ts`.
