import { RegistroJornadaProps } from "../../../domain/entities/RegistroJornadaTypes";
import { horaBogota24, isoBogota, esFinDeSemanaBogotaFecha } from "../../../shared/utils/tiempo";

export function registroADTO(r: RegistroJornadaProps) {
  return {
    id: r.id,
    fecha: r.fecha,
    esFinDeSemana: esFinDeSemanaBogotaFecha(r.fecha),
    estado: r.estado,
    horaInicio: r.horaInicio ? isoBogota(r.horaInicio) : null,
    horaInicio24: r.horaInicio ? horaBogota24(r.horaInicio) : null,
    horaFin: r.horaFin ? isoBogota(r.horaFin) : null,
    horaFin24: r.horaFin ? horaBogota24(r.horaFin) : null,
    descripcionProyectos: r.descripcionProyectos,
    horasOrdinarias: r.horasOrdinarias,
    horasExtraDiurnas: r.horasExtraDiurnas,
    horasExtraNocturnas: r.horasExtraNocturnas,
    horasRecargoNocturno: r.horasRecargoNocturno,
    horasDominicalFestivo: r.horasDominicalFestivo,
    editadoManualmente: r.editadoManualmente,
  };
}
