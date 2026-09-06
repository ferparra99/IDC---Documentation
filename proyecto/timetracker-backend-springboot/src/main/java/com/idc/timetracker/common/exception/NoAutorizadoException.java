package com.idc.timetracker.common.exception;

import org.springframework.http.HttpStatus;

public class NoAutorizadoException extends DomainException {
    public NoAutorizadoException(String msg) {
        super("NO_AUTORIZADO", HttpStatus.FORBIDDEN, msg);
    }
}
