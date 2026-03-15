package com.example.moderationservice.testplayground;

public class TestPlaygroundResponse {
    private boolean triggered;
    private String action;
    private String message;
    private String error;

    public boolean isTriggered() {
        return triggered;
    }

    public void setTriggered(boolean triggered) {
        this.triggered = triggered;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }
}
