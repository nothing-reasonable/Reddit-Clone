package com.example.modmailservice.service;

import com.example.modmailservice.auth.AuthorizationException;
import com.example.modmailservice.dto.ConversationDto;
import com.example.modmailservice.dto.MessageDto;
import com.example.modmailservice.model.*;
import com.example.modmailservice.repository.ConversationRepository;
import com.example.modmailservice.repository.MessageRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MessagingService {

    private final ConversationRepository conversationRepo;
    private final MessageRepository messageRepo;
    private final org.springframework.web.client.RestClient restClient;
    private final String userServiceBaseUrl;

    public MessagingService(ConversationRepository conversationRepo,
                            MessageRepository messageRepo,
                            org.springframework.web.client.RestClient restClient,
                            @Value("${services.user.base-url:http://localhost:8081}") String userServiceBaseUrl) {
        this.conversationRepo = conversationRepo;
        this.messageRepo = messageRepo;
        this.restClient = restClient;
        this.userServiceBaseUrl = userServiceBaseUrl;
    }

    @Transactional
    public ConversationDto createConversation(String user1, String user2, String body) {
        if (user1.equalsIgnoreCase(user2)) {
            throw new IllegalArgumentException("Cannot message yourself");
        }

        // Verify recipient exists
        Boolean exists = restClient.get()
            .uri(userServiceBaseUrl + "/api/users/exists/{username}", user2)
                .retrieve()
                .body(Boolean.class);
        
        if (exists == null || !exists) {
            throw new IllegalArgumentException("Recipient user '" + user2 + "' does not exist");
        }

        Conversation conversation = conversationRepo
                .findBetweenUsers(user1, user2)
                .orElse(null);

        if (conversation != null) {
            conversation.setStatus(ConversationStatus.OPEN);
        } else {
            conversation = new Conversation();
            conversation.setUser1(user1);
            conversation.setUser2(user2);
            conversation.setStatus(ConversationStatus.OPEN);
        }
        conversation.setUpdatedAt(java.time.LocalDateTime.now());
        conversation.setLastReadByUser1(java.time.LocalDateTime.now());
        conversation = conversationRepo.save(conversation);

        Message message = new Message();
        message.setConversation(conversation);
        message.setSenderName(user1);
        message.setBody(body);
        messageRepo.save(message);

        return toDto(conversation, body, user1);
    }

    public List<ConversationDto> getConversations(String username) {
        return conversationRepo.findAllByParticipant(username)
                .stream()
                .map(c -> toDtoWithLastMessage(c, username))
                .toList();
    }

    @Transactional
    public List<MessageDto> getMessages(Long conversationId, String username) {
        Conversation conversation = findConversationOrThrow(conversationId);
        requireAccess(conversation, username);

        // Mark as read
        if (username.equalsIgnoreCase(conversation.getUser1())) {
            conversation.setLastReadByUser1(java.time.LocalDateTime.now());
        } else {
            conversation.setLastReadByUser2(java.time.LocalDateTime.now());
        }
        conversationRepo.save(conversation);

        return messageRepo.findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(this::toMessageDto)
                .toList();
    }

    @Transactional
    public MessageDto sendMessage(Long conversationId, String senderName, String body) {
        Conversation conversation = findConversationOrThrow(conversationId);
        requireAccess(conversation, senderName);

        if (conversation.getStatus() == ConversationStatus.CLOSED) {
            throw new IllegalArgumentException("Cannot send message to a closed conversation");
        }

        Message message = new Message();
        message.setConversation(conversation);
        message.setSenderName(senderName);
        message.setBody(body);
        message = messageRepo.save(message);

        // Touch the conversation to update updatedAt
        conversation.setUpdatedAt(java.time.LocalDateTime.now());
        // Update sender's last read so it doesn't show as unread for them
        if (senderName.equalsIgnoreCase(conversation.getUser1())) {
            conversation.setLastReadByUser1(java.time.LocalDateTime.now());
        } else {
            conversation.setLastReadByUser2(java.time.LocalDateTime.now());
        }
        conversationRepo.save(conversation);

        return toMessageDto(message);
    }

    @Transactional
    public void closeConversation(Long conversationId, String username) {
        Conversation conversation = findConversationOrThrow(conversationId);
        requireAccess(conversation, username);
        conversation.setStatus(ConversationStatus.CLOSED);
        conversationRepo.save(conversation);
    }

    private Conversation findConversationOrThrow(Long id) {
        return conversationRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + id));
    }

    private void requireAccess(Conversation conversation, String username) {
        if (!username.equalsIgnoreCase(conversation.getUser1()) && 
            !username.equalsIgnoreCase(conversation.getUser2())) {
            throw new AuthorizationException(403, "Access denied");
        }
    }

    private ConversationDto toDto(Conversation c, String lastMessagePreview, String currentUsername) {
        ConversationDto dto = new ConversationDto();
        dto.setId(c.getId());
        String otherUser = c.getUser1().equalsIgnoreCase(currentUsername) ? c.getUser2() : c.getUser1();
        dto.setOtherUser(otherUser);
        dto.setUsername(currentUsername);
        dto.setStatus(c.getStatus().name());
        dto.setCreatedAt(c.getCreatedAt());
        dto.setUpdatedAt(c.getUpdatedAt());
        dto.setLastMessagePreview(truncate(lastMessagePreview, 100));

        // Calculate unread
        java.time.LocalDateTime lastRead = c.getUser1().equalsIgnoreCase(currentUsername) 
                ? c.getLastReadByUser1() 
                : c.getLastReadByUser2();
        
        dto.setUnread(lastRead == null || c.getUpdatedAt().isAfter(lastRead));

        return dto;
    }

    private ConversationDto toDtoWithLastMessage(Conversation c, String currentUsername) {
        List<Message> messages = messageRepo.findByConversationIdOrderByCreatedAtAsc(c.getId());
        String preview = "";
        java.time.LocalDateTime lastActivity = c.getCreatedAt();
        
        if (!messages.isEmpty()) {
            Message lastMsg = messages.get(messages.size() - 1);
            preview = lastMsg.getBody();
            lastActivity = lastMsg.getCreatedAt();
        }
        
        ConversationDto dto = new ConversationDto();
        dto.setId(c.getId());
        String otherUser = c.getUser1().equalsIgnoreCase(currentUsername) ? c.getUser2() : c.getUser1();
        dto.setOtherUser(otherUser);
        dto.setUsername(currentUsername);
        dto.setStatus(c.getStatus().name());
        dto.setCreatedAt(c.getCreatedAt());
        dto.setUpdatedAt(lastActivity); // Use actual last message time
        dto.setLastMessagePreview(truncate(preview, 100));

        // Calculate unread based on actual message time
        java.time.LocalDateTime lastRead = c.getUser1().equalsIgnoreCase(currentUsername) 
                ? c.getLastReadByUser1() 
                : c.getLastReadByUser2();
        
        dto.setUnread(lastRead == null || lastActivity.isAfter(lastRead));

        return dto;
    }

    private MessageDto toMessageDto(Message m) {
        MessageDto dto = new MessageDto();
        dto.setId(m.getId());
        dto.setSenderType("USER");
        dto.setSenderDisplayName(m.getSenderName());
        dto.setBody(m.getBody());
        dto.setCreatedAt(m.getCreatedAt());
        return dto;
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return "";
        return text.length() <= maxLength ? text : text.substring(0, maxLength) + "…";
    }
}
