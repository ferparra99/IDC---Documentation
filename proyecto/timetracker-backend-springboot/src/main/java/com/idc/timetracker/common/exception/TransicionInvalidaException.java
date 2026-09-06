package com.idc.timetracker.common.exception;

import org.springframework.http.HttpStatus;

public class TransicionInvalidaException extends DomainException {
    public TransicionInvalidaException(String msg) {
        super("TRANSICION_INVALIDA", HttpStatus.CONFLICT, msg);
    }
}
