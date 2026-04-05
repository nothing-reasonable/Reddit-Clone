package com.example.moderationservice.engine;

public class AutoModResult {
    private boolean triggered;
    private String action = "flag";
    private String message;
    private String subject;

    public AutoModResult() {}

    public AutoModResult(boolean triggered, String action, String message) {
        this.triggered = triggered;
        this.action = action;
        this.message = message;
    }

    // Getters and Setters
    public boolean isTriggered() { return triggered; }
    public void setTriggered(boolean triggered) { this.triggered = triggered; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
}
