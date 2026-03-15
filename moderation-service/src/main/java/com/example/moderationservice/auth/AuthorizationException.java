package com.example.moderationservice.auth;

public class AuthorizationException extends RuntimeException {

    private final int statusCode;

    public AuthorizationException(int statusCode, String message) {
        super(message);
        this.statusCode = statusCode;
    }

    public int getStatusCode() {
        return statusCode;
    }
}
