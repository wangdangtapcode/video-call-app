package com.example.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception thrown when authentication fails
 */
public class AuthenticationException extends BaseException {

    public AuthenticationException(String message) {
        super(message, HttpStatus.UNAUTHORIZED, "AUTH_001");
    }

    public AuthenticationException(String message, Throwable cause) {
        super(message, cause, HttpStatus.UNAUTHORIZED, "AUTH_001");
    }

    public static AuthenticationException invalidCredentials() {
        return new AuthenticationException("Invalid email or password");
    }

    public static AuthenticationException userNotFound() {
        return new AuthenticationException("User not found");
    }

    public static AuthenticationException accountLocked() {
        return new AuthenticationException("Account is locked");
    }
}
