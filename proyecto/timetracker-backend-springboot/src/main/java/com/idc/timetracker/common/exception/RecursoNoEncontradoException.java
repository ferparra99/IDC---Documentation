package com.idc.timetracker.common.exception;

import org.springframework.http.HttpStatus;

public class RecursoNoEncontradoException extends DomainException {
    public RecursoNoEncontradoException(String msg) {
        super("RECURSO_NO_ENCONTRADO", HttpStatus.NOT_FOUND, msg);
    }
}
