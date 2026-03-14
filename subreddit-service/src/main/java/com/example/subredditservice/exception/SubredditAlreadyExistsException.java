package com.example.subredditservice.exception;

public class SubredditAlreadyExistsException extends RuntimeException {
    public SubredditAlreadyExistsException(String message) {
        super(message);
    }
}
