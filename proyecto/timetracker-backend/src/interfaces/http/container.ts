import { pool } from "../../infrastructure/db/pool";
import { UsuarioRepository } from "../../infrastructure/repositories/UsuarioRepository";
import { ConfiguracionRepository } from "../../infrastructure/repositories/ConfiguracionRepository";
import { RegistroJornadaRepository } from "../../infrastructure/repositories/RegistroJornadaRepository";
import { FestivoRepository } from "../../infrastructure/repositories/FestivoRepository";
import { AuditLogRepository } from "../../infrastructure/repositories/AuditLogRepository";
import { PermisoRepository } from "../../infrastructure/repositories/PermisoRepository";
import { ViajeRepository } from "../../infrastructure/repositories/ViajeRepository";
import { AuthService } from "../../application/services/AuthService";
import { ConfigService } from "../../application/services/ConfigService";
import { AttendanceService } from "../../application/services/AttendanceService";
import { HolidaySyncService } from "../../application/services/HolidaySyncService";
import { CalendarService } from "../../application/services/CalendarService";
import { PermisoService } from "../../application/services/PermisoService";
import { ViajeService } from "../../application/services/ViajeService";

/**
 * Composition root: único lugar donde se instancian repositorios y servicios
 * concretos y se "cablean" entre sí. Los controladores solo dependen de los
 * servicios de aplicación, nunca de `pool` ni de los repositorios directamente
 * (Dependency Inversion).
 */
const usuarioRepository = new UsuarioRepository(pool);
const configuracionRepository = new ConfiguracionRepository(pool);
const registroJornadaRepository = new RegistroJornadaRepository(pool);
const festivoRepository = new FestivoRepository(pool);
const auditLogRepository = new AuditLogRepository(pool);
const permisoRepository = new PermisoRepository(pool);
const viajeRepository = new ViajeRepository(pool);

const holidaySyncService = new HolidaySyncService(festivoRepository);

export const container = {
  authService: new AuthService(usuarioRepository),
  configService: new ConfigService(configuracionRepository),
  attendanceService: new AttendanceService(registroJornadaRepository, configuracionRepository, auditLogRepository),
  calendarService: new CalendarService(registroJornadaRepository, festivoRepository, holidaySyncService),
  permisoService: new PermisoService(permisoRepository, registroJornadaRepository, usuarioRepository, configuracionRepository),
  viajeService: new ViajeService(viajeRepository, configuracionRepository),
  holidaySyncService,
};
