package com.idc.timetracker.common.exception;

import org.springframework.http.HttpStatus;

public class ValidacionException extends DomainException {
    public ValidacionException(String msg) {
        super("VALIDACION", HttpStatus.UNPROCESSABLE_ENTITY, msg);
    }
}
