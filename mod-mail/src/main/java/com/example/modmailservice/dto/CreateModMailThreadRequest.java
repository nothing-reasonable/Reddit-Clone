package com.example.modmailservice.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateModMailThreadRequest {

    @NotBlank(message = "subredditName is required")
    private String subredditName;

    @NotBlank(message = "username is required")
    private String username;

    @NotBlank(message = "subject is required")
    private String subject;

    @NotBlank(message = "body is required")
    private String body;

    public String getSubredditName() { return subredditName; }
    public void setSubredditName(String subredditName) { this.subredditName = subredditName; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
}
