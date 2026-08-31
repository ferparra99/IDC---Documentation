# CHANGELOG — Trazabilidad de cambios del proyecto

> Formato: cada entrada documenta un cambio de alcance, requerimiento o decisión técnica relevante. Ver sección 8 de `REQUIREMENTS.md` para el formato de auditoría a nivel de datos (dentro de la aplicación).

---

## [2026-08-30] - Documentación inicial
- **Autor:** Claude (junto con el usuario)
- **Cambio:** Creación del documento maestro `REQUIREMENTS.md` con el alcance completo del proyecto (módulos de fichaje, visualización de horas, permisos, viajes, reportería Excel, variables de sistema y marco legal colombiano) y de este `CHANGELOG.md`.
- **Motivo:** Establecer la fuente única de verdad antes de iniciar cualquier implementación.
- **Referencia:** N/A (kickoff del proyecto)

## [2026-08-30] - Gestión de estado y calendario
- **Autor:** Claude (junto con el usuario)
- **Cambio:** Se resuelven dos decisiones abiertas en `REQUIREMENTS.md`: (1) el manejo de estado de la jornada en frontend usará el patrón de diseño State, sincronizado con backend como fuente de verdad (nueva sección 11); (2) el módulo de calendario integrará una librería de festivos colombianos y resaltará sábados/domingos con color distintivo (nueva sección 12).
- **Motivo:** Definición explícita del usuario sobre arquitectura de estado y requisitos visuales del calendario.
- **Referencia:** N/A

## [2026-08-30] - Documentación técnica de detalle
- **Autor:** Claude (junto con el usuario)
- **Cambio:** Se agregan tres documentos complementarios: `DATABASE_SCHEMA.md` (esquema de BD detallado, incluye estado `JORNADA_INCOMPLETA` no contemplado antes), `API_CONTRACTS.md` (endpoints REST con ejemplos de request/response y códigos de error) y `STATE_MACHINE.md` (diagrama de la máquina de estados y casos borde: olvido de fichar salida, doble inicio, permisos vs. jornada ya registrada, cambio de variables de sistema a mitad de jornada). `REQUIREMENTS.md` se actualiza con referencia cruzada a estos documentos (sección 10.1).
- **Motivo:** Profundizar el diseño técnico antes de iniciar la implementación de la Fase 1.
- **Referencia:** N/A

## [2026-08-30] - Ajuste de manejo de tiempo y confirmación de permisos
- **Autor:** Claude (junto con el usuario)
- **Cambio:** Se elimina el estado `JORNADA_INCOMPLETA` y el job de cierre automático de jornada (definidos previamente en `STATE_MACHINE.md`). Se confirma: la hora se toma del reloj del servidor, zona horaria `America/Bogota`, formato de visualización 24 horas; no habrá cierre automático — una jornada sin cerrar permanece `JORNADA_ACTIVA` indefinidamente hasta cierre manual (nuevo caso borde 3.1 documentado). Se actualiza el enum de estado en `DATABASE_SCHEMA.md` y las decisiones abiertas en `REQUIREMENTS.md`. Se confirma también que la integración de permisos con el módulo de horas se resolverá en Fase 3.
- **Motivo:** Definición explícita del usuario sobre manejo de hora/zona horaria y alcance de la Fase 3.
- **Referencia:** N/A
