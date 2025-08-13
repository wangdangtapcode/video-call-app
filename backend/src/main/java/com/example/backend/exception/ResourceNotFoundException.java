package com.example.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception thrown when a requested resource is not found
 */
public class ResourceNotFoundException extends BaseException {

    public ResourceNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND, "RES_001");
    }

    public ResourceNotFoundException(String message, Throwable cause) {
        super(message, cause, HttpStatus.NOT_FOUND, "RES_001");
    }

    public static ResourceNotFoundException userNotFound(String email) {
        return new ResourceNotFoundException("User not found with email: " + email);
    }

    public static ResourceNotFoundException userNotFound(Long id) {
        return new ResourceNotFoundException("User not found with id: " + id);
    }

    public static ResourceNotFoundException roleNotFound(String roleName) {
        return new ResourceNotFoundException("Role not found: " + roleName);
    }

    public static ResourceNotFoundException agentNotFound(Long id) {
        return new ResourceNotFoundException("Agent not found with id: " + id);
    }
}
