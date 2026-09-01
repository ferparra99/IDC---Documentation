/**
 * Subconjunto de variables de sistema (docs/REQUIREMENTS.md sección 4) necesario
 * para calcular el desglose de horas de una jornada. Se pasa como parámetro
 * explícito al motor de cálculo (en vez de que este consulte la BD directamente),
 * para mantenerlo puro, testeable y desacoplado de infraestructura (Dependency Inversion).
 */
export interface ConfiguracionVigente {
  /** Hora de inicio de la franja nocturna, formato "HH:mm" (Bogotá). Ej: "19:00". */
  inicioHorarioNocturno: string;
  /** Hora de fin de la franja nocturna, formato "HH:mm" (Bogotá). Ej: "06:00". */
  finHorarioNocturno: string;
  /** Horas ordinarias/objetivo por jornada estándar, usado como umbral para detectar horas extra en el día. */
  horasOrdinariasPorDia: number;
}

export const CONFIGURACION_POR_DEFECTO: ConfiguracionVigente = {
  inicioHorarioNocturno: "19:00",
  finHorarioNocturno: "06:00",
  horasOrdinariasPorDia: 8,
};
