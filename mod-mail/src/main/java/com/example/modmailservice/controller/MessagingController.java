package com.example.modmailservice.controller;

import com.example.modmailservice.dto.*;
import com.example.modmailservice.service.MessagingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessagingController {

    private final MessagingService messagingService;

    public MessagingController(MessagingService messagingService) {
        this.messagingService = messagingService;
    }

    /**
     * POST /api/messages/conversations
     * Start a new conversation with another user.
     */
    @PostMapping("/conversations")
    public ResponseEntity<ConversationDto> createConversation(
            @Valid @RequestBody CreateConversationRequest request,
            Authentication auth) {
        String username = auth.getName();
        ConversationDto dto = messagingService.createConversation(
                username, request.getRecipientName(), request.getBody());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /**
     * GET /api/messages/conversations
     * View all conversations for the authenticated user.
     */
    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationDto>> getConversations(Authentication auth) {
        String username = auth.getName();
        return ResponseEntity.ok(messagingService.getConversations(username));
    }

    /**
     * GET /api/messages/conversations/{id}/messages
     * View messages in a conversation.
     */
    @GetMapping("/conversations/{id}/messages")
    public ResponseEntity<List<MessageDto>> getMessages(
            @PathVariable Long id,
            Authentication auth) {
        String username = auth.getName();
        return ResponseEntity.ok(messagingService.getMessages(id, username));
    }

    /**
     * POST /api/messages/conversations/{id}/messages
     * Send a message in an existing conversation.
     */
    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<MessageDto> sendMessage(
            @PathVariable Long id,
            @Valid @RequestBody SendMessageRequest request,
            Authentication auth) {
        String username = auth.getName();
        MessageDto dto = messagingService.sendMessage(id, username, request.getBody());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /**
     * PUT /api/messages/conversations/{id}/close
     * Close/archive a conversation.
     */
    @PutMapping("/conversations/{id}/close")
    public ResponseEntity<Void> closeConversation(
            @PathVariable Long id,
            Authentication auth) {
        String username = auth.getName();
        messagingService.closeConversation(id, username);
        return ResponseEntity.ok().build();
    }
}
