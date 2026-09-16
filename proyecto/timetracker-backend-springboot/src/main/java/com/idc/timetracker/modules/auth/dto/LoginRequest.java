package com.idc.timetracker.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    @NotBlank(message = "El campo 'email' es obligatorio.")
    @Email(message = "El email no es válido.")
    private String email;

    @NotBlank(message = "El campo 'password' es obligatorio.")
    private String password;
}
