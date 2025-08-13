package com.example.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception thrown when business logic rules are violated
 */
public class BusinessException extends BaseException {

    public BusinessException(String message) {
        super(message, HttpStatus.CONFLICT, "BUS_001");
    }

    public BusinessException(String message, Throwable cause) {
        super(message, cause, HttpStatus.CONFLICT, "BUS_001");
    }

    public static BusinessException agentNotAvailable() {
        return new BusinessException("No agents are currently available");
    }

    public static BusinessException callAlreadyInProgress() {
        return new BusinessException("User already has a call in progress");
    }

    public static BusinessException insufficientPermissions() {
        return new BusinessException("Insufficient permissions to perform this action");
    }

    public static BusinessException userAlreadyExists() {
        return new BusinessException("User with this email already exists");
    }

    public static BusinessException invalidOperation(String operation) {
        return new BusinessException("Invalid operation: " + operation);
    }
}
