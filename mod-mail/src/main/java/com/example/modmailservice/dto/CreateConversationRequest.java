package com.example.modmailservice.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateConversationRequest {

    @NotBlank(message = "recipientName is required")
    private String recipientName;

    @NotBlank(message = "body is required")
    private String body;

    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
}
