package com.idc.timetracker.common.exception;

import org.springframework.http.HttpStatus;

public class NoHayJornadaActivaException extends DomainException {
    public NoHayJornadaActivaException(String msg) {
        super("NO_HAY_JORNADA_ACTIVA", HttpStatus.CONFLICT, msg);
    }
}
