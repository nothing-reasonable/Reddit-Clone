package com.example.modmailservice.dto;

import jakarta.validation.constraints.NotBlank;

public class SendModMailMessageRequest {

    @NotBlank(message = "body is required")
    private String body;

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
}
