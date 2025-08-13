package com.example.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception thrown when validation fails
 */
public class ValidationException extends BaseException {

    public ValidationException(String message) {
        super(message, HttpStatus.BAD_REQUEST, "VAL_001");
    }

    public ValidationException(String message, Throwable cause) {
        super(message, cause, HttpStatus.BAD_REQUEST, "VAL_001");
    }

    public static ValidationException emailRequired() {
        return new ValidationException("Email is required");
    }

    public static ValidationException passwordRequired() {
        return new ValidationException("Password is required");
    }

    public static ValidationException invalidEmailFormat() {
        return new ValidationException("Invalid email format");
    }

    public static ValidationException passwordTooShort() {
        return new ValidationException("Password must be at least 6 characters");
    }

    public static ValidationException emailAlreadyExists() {
        return new ValidationException("Email already exists");
    }
}
