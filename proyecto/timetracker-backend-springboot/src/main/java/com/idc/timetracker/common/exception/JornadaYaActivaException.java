package com.idc.timetracker.common.exception;

import org.springframework.http.HttpStatus;

public class JornadaYaActivaException extends DomainException {
    public JornadaYaActivaException(String msg) {
        super("JORNADA_YA_ACTIVA", HttpStatus.CONFLICT, msg);
    }
}
