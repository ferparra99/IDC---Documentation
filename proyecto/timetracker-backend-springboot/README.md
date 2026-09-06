# Timetracker — Backend Spring Boot (Java 21)

Clon del backend Node (`../timetracker-backend`) en Spring Boot 3.3 + JPA + Flyway + PostgreSQL.
Mantiene **contratos API y esquema DB idénticos** para ser intercambiable con el backend Node vía `VITE_API_BASE_URL`.

## Requisitos
- Java 21, Maven 3.9+, PostgreSQL 14+
- `DATABASE_URL` o `SPRING_DATASOURCE_URL` (soporta `postgres://` y `jdbc:postgresql://`)

## Ejecución
```bash
mvn spring-boot:run
# o
mvn package -DskipTests && java -jar target/*.jar
```

Frontend apunta a este backend si `VITE_API_BASE_URL=http://localhost:3000/api/v1`.
Ver `../EJECUCION.md` para Docker (elige `docker-compose.node.yml` o `docker-compose.spring.yml`).

## Estructura
`src/main/java/com/idc/timetracker/{common,modules/*,health}` — ver `pom.xml`.
Migraciones Flyway en `src/main/resources/db/migration/` (copias literales de `timetracker-backend/src/infrastructure/db/migrations`).
