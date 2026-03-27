package com.example.modmailservice.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateConversationRequest {

    @NotBlank(message = "recipientName is required")
    private String recipientName;

    @NotBlank(message = "body is required")
    private String body;

    private String actingAsSubreddit;

    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public String getActingAsSubreddit() { return actingAsSubreddit; }
    public void setActingAsSubreddit(String actingAsSubreddit) { this.actingAsSubreddit = actingAsSubreddit; }
}
