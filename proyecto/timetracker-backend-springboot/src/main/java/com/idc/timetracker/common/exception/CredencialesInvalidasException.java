package com.idc.timetracker.common.exception;

import org.springframework.http.HttpStatus;

public class CredencialesInvalidasException extends DomainException {
    public CredencialesInvalidasException(String msg) {
        super("CREDENCIALES_INVALIDAS", HttpStatus.UNAUTHORIZED, msg);
    }
}
