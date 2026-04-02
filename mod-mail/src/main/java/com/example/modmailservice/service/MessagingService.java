package com.example.modmailservice.service;

import com.example.modmailservice.auth.AuthorizationException;
import com.example.modmailservice.dto.ConversationDto;
import com.example.modmailservice.dto.MessageDto;
import com.example.modmailservice.model.*;
import com.example.modmailservice.repository.ConversationRepository;
import com.example.modmailservice.repository.MessageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MessagingService {

    private final ConversationRepository conversationRepo;
    private final MessageRepository messageRepo;
    private final org.springframework.web.client.RestClient restClient;

    public MessagingService(ConversationRepository conversationRepo,
            MessageRepository messageRepo,
            org.springframework.web.client.RestClient restClient) {
        this.conversationRepo = conversationRepo;
        this.messageRepo = messageRepo;
        this.restClient = restClient;
    }

    private List<String> getModeratedSubreddits(String username) {
        return getModeratedSubreddits(username, null);
    }

    private List<String> getModeratedSubreddits(String username, String authorization) {
        try {
            var spec = restClient.get()
                    .uri("http://localhost:8082/api/subreddits/moderates/{username}", username);
            if (authorization != null && !authorization.isEmpty()) {
                spec = spec.headers(h -> h.set("Authorization", authorization));
            }
            String[] subs = spec.retrieve().body(String[].class);
            return subs != null ? java.util.Arrays.asList(subs) : java.util.Collections.emptyList();
        } catch (Exception e) {
            return java.util.Collections.emptyList();
        }
    }

    @Transactional
    public ConversationDto createConversation(String username, String recipient, String body,
            String actingAsSubreddit, String authorization) {
        String sender = username;
        // Normalize recipient and subreddit names: allow frontend to send 'r/name'
        String recipientNorm = (recipient != null && recipient.startsWith("r/")) ? recipient.substring(2) : recipient;
        String actingAsNorm = (actingAsSubreddit != null && actingAsSubreddit.startsWith("r/"))
                ? actingAsSubreddit.substring(2)
                : actingAsSubreddit;
        if (actingAsNorm != null && !actingAsNorm.trim().isEmpty()) {
            List<String> moderated = getModeratedSubreddits(username, authorization);
            if (!moderated.contains(actingAsNorm)) {
                throw new AuthorizationException(403, "You are not a moderator of r/" + actingAsNorm);
            }
            sender = actingAsNorm;
        }
        if (sender.equalsIgnoreCase(recipientNorm)) {
            throw new IllegalArgumentException("Cannot message yourself");
        }

        // Verify recipient exists
        boolean recipientExists = false;
        try {
            Boolean isUser = restClient.get()
                    .uri("http://localhost:8081/api/users/exists/{username}", recipientNorm)
                    .retrieve()
                    .body(Boolean.class);
            if (isUser != null && isUser)
                recipientExists = true;
        } catch (Exception e) {
        }

        if (!recipientExists) {
            try {
                var spec = restClient.get()
                        .uri("http://localhost:8082/api/subreddits/exists/{name}", recipientNorm);
                if (authorization != null && !authorization.isEmpty()) {
                    spec = spec.headers(h -> h.set("Authorization", authorization));
                }
                Boolean isSub = spec.retrieve().body(Boolean.class);
                if (isSub != null && isSub)
                    recipientExists = true;
            } catch (Exception e) {
            }
        }

        if (!recipientExists) {
            throw new IllegalArgumentException("Recipient '" + recipient + "' does not exist");
        }

        Conversation conversation = conversationRepo
                .findBetweenUsers(sender, recipient)
                .orElse(null);

        if (conversation != null) {
            conversation.setStatus(ConversationStatus.OPEN);
        } else {
            conversation = new Conversation();
            conversation.setUser1(sender);
            conversation.setUser2(recipientNorm);
            conversation.setStatus(ConversationStatus.OPEN);
        }
        conversation.setUpdatedAt(java.time.LocalDateTime.now());
        conversation.setLastReadByUser1(java.time.LocalDateTime.now());
        conversation = conversationRepo.save(conversation);

        Message message = new Message();
        message.setConversation(conversation);
        message.setSenderName(username);
        if (actingAsNorm != null && !actingAsNorm.trim().isEmpty()) {
            message.setActingAsSubreddit(actingAsNorm);
        }
        message.setBody(body);
        messageRepo.save(message);

        List<String> moderatedSubreddits = getModeratedSubreddits(username, authorization);
        return toDto(conversation, body, username, moderatedSubreddits);
    }

    public List<ConversationDto> getConversations(String username, String authorization) {
        List<String> participants = new java.util.ArrayList<>();
        participants.add(username);
        participants.addAll(getModeratedSubreddits(username, authorization));

        List<String> moderatedSubreddits = getModeratedSubreddits(username, authorization);

        return conversationRepo.findAllByParticipants(participants)
                .stream()
                .map(c -> toDtoWithLastMessage(c, username, moderatedSubreddits))
                .toList();
    }

    @Transactional
    public List<MessageDto> getMessages(Long conversationId, String username, String authorization) {
        Conversation conversation = findConversationOrThrow(conversationId);
        List<String> moderatedSubreddits = getModeratedSubreddits(username, authorization);
        requireAccess(conversation, username, moderatedSubreddits);

        // Mark as read
        if (conversation.getUser1().equalsIgnoreCase(username)
                || moderatedSubreddits.contains(conversation.getUser1())) {
            conversation.setLastReadByUser1(java.time.LocalDateTime.now());
        } else {
            conversation.setLastReadByUser2(java.time.LocalDateTime.now());
        }
        conversationRepo.save(conversation);

        return messageRepo.findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(m -> toMessageDto(m, moderatedSubreddits))
                .toList();
    }

    @Transactional
    public MessageDto sendMessage(Long conversationId, String senderName, String body, String authorization) {
        Conversation conversation = findConversationOrThrow(conversationId);
        List<String> moderated = getModeratedSubreddits(senderName, authorization);
        requireAccess(conversation, senderName, moderated);

        if (conversation.getStatus() == ConversationStatus.CLOSED) {
            throw new IllegalArgumentException("Cannot send message to a closed conversation");
        }

        Message message = new Message();
        message.setConversation(conversation);
        message.setSenderName(senderName);
        message.setBody(body);

        if (moderated.contains(conversation.getUser1())) {
            message.setActingAsSubreddit(conversation.getUser1());
        } else if (moderated.contains(conversation.getUser2())) {
            message.setActingAsSubreddit(conversation.getUser2());
        }

        message = messageRepo.save(message);

        // Touch the conversation to update updatedAt
        conversation.setUpdatedAt(java.time.LocalDateTime.now());

        // Update sender's last read
        if (conversation.getUser1().equalsIgnoreCase(senderName) || moderated.contains(conversation.getUser1())) {
            conversation.setLastReadByUser1(java.time.LocalDateTime.now());
        } else {
            conversation.setLastReadByUser2(java.time.LocalDateTime.now());
        }
        conversationRepo.save(conversation);

        return toMessageDto(message, moderated);
    }

    @Transactional
    public ConversationDto createModeratorApplication(String applicant, String subreddit, String authorization) {
        // Create a conversation between the subreddit and a system recipient so
        // moderators
        // who moderate the subreddit will see it (conversation.user1 = subreddit)
        if (applicant == null || subreddit == null)
            throw new IllegalArgumentException("Invalid application");

        Conversation conversation = conversationRepo
                .findBetweenUsers(subreddit, "__SYSTEM__")
                .orElse(null);

        if (conversation == null) {
            conversation = new Conversation();
            conversation.setUser1(subreddit);
            conversation.setUser2("__SYSTEM__");
            conversation.setStatus(ConversationStatus.OPEN);
        }
        conversation.setUpdatedAt(java.time.LocalDateTime.now());
        conversation = conversationRepo.save(conversation);

        Message message = new Message();
        message.setConversation(conversation);
        message.setSenderName("SYSTEM");
        message.setBody("Application from " + applicant + " to moderate r/" + subreddit + ". Accept or reject.");
        messageRepo.save(message);

        List<String> moderatedSubreddits = getModeratedSubreddits(applicant, authorization);
        return toDto(conversation, message.getBody(), applicant, moderatedSubreddits);
    }

    @Transactional
    public void acceptModeratorApplication(Long conversationId, String actingModerator, String authorization) {
        Conversation conversation = findConversationOrThrow(conversationId);
        // verify actingModerator moderates the subreddit
        String subreddit = conversation.getUser1();
        List<String> mods = getModeratedSubreddits(actingModerator, authorization);
        if (!mods.contains(subreddit)) {
            throw new AuthorizationException(403, "Only subreddit moderators can accept applications");
        }
        // Find applicant from system message body
        java.util.List<Message> msgs = messageRepo.findByConversationIdOrderByCreatedAtAsc(conversation.getId());
        String applicant = null;
        for (Message m : msgs) {
            if ("SYSTEM".equalsIgnoreCase(m.getSenderName()) && m.getBody() != null) {
                String body = m.getBody();
                System.out.println("[ModMail] Checking message body: " + body);
                if (body.contains("Application from ") && body.contains(" to moderate r/")) {
                    int start = body.indexOf("Application from ") + "Application from ".length();
                    int mid = body.indexOf(" to moderate r/");
                    if (start >= 0 && mid > start)
                        applicant = body.substring(start, mid).trim();
                    System.out.println("[ModMail] Extracted applicant: " + applicant);
                    break;
                }
            }
        }

        System.out.println("[ModMail] acceptModeratorApplication: applicant=" + applicant + ", subreddit=" + subreddit);

        // Call subreddit service to promote applicant
        if (applicant != null && !applicant.isEmpty()) {
            try {
                String url = "http://localhost:8082/api/subreddits/" + subreddit + "/moderators/add/" + applicant;
                System.out.println("[ModMail] Calling URL: " + url);
                var spec = restClient.post()
                        .uri("http://localhost:8082/api/subreddits/{sub}/moderators/add/{user}", subreddit, applicant);
                if (authorization != null && !authorization.isEmpty()) {
                    spec = spec.headers(h -> h.set("Authorization", authorization));
                }
                spec.retrieve().body(Void.class);
                System.out.println("[ModMail] Successfully promoted " + applicant + " to r/" + subreddit);
            } catch (Exception e) {
                System.out.println("[ModMail] Failed to promote: " + e.getMessage());
                e.printStackTrace();
                throw new RuntimeException("Failed to promote applicant: " + e.getMessage(), e);
            }
        } else {
            System.out.println("[ModMail] No applicant found");
            throw new IllegalArgumentException("Could not determine applicant");
        }

        conversationRepo.delete(conversation);
    }

    @Transactional
    public void rejectModeratorApplication(Long conversationId, String actingModerator, String authorization) {
        Conversation conversation = findConversationOrThrow(conversationId);
        String subreddit = conversation.getUser1();
        List<String> mods = getModeratedSubreddits(actingModerator, authorization);
        if (!mods.contains(subreddit)) {
            throw new AuthorizationException(403, "Only subreddit moderators can reject applications");
        }
        // remove the conversation to hide the application
        conversationRepo.delete(conversation);
    }

    public java.util.List<String> getApplicationsForUser(String username, String authorization) {
        java.util.List<String> result = new java.util.ArrayList<>();
        // Find all conversations where system is participant
        java.util.List<Conversation> convs = conversationRepo.findAllByParticipant("__SYSTEM__");
        for (Conversation c : convs) {
            // messages for conversation
            java.util.List<Message> msgs = messageRepo.findByConversationIdOrderByCreatedAtAsc(c.getId());
            for (Message m : msgs) {
                if ("SYSTEM".equalsIgnoreCase(m.getSenderName()) && m.getBody() != null) {
                    String body = m.getBody();
                    // expect format: "Application from <applicant> to moderate r/<subreddit>."
                    if (body.contains("Application from ") && body.contains(" to moderate r/")) {
                        int start = body.indexOf("Application from ") + "Application from ".length();
                        int mid = body.indexOf(" to moderate r/");
                        if (start >= 0 && mid > start) {
                            String applicant = body.substring(start, mid).trim();
                            if (applicant.equalsIgnoreCase(username)) {
                                // subreddit is conversation.user1
                                result.add(c.getUser1());
                            }
                        }
                    }
                }
            }
        }
        return result;
    }

    @Transactional
    public void closeConversation(Long conversationId, String username, String authorization) {
        Conversation conversation = findConversationOrThrow(conversationId);
        List<String> moderatedSubreddits = getModeratedSubreddits(username, authorization);
        requireAccess(conversation, username, moderatedSubreddits);
        conversation.setStatus(ConversationStatus.CLOSED);
        conversationRepo.save(conversation);
    }

    private Conversation findConversationOrThrow(Long id) {
        return conversationRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + id));
    }

    private void requireAccess(Conversation conversation, String username, List<String> moderatedSubreddits) {
        if (!username.equalsIgnoreCase(conversation.getUser1()) &&
                !username.equalsIgnoreCase(conversation.getUser2()) &&
                !moderatedSubreddits.contains(conversation.getUser1()) &&
                !moderatedSubreddits.contains(conversation.getUser2())) {
            throw new AuthorizationException(403, "Access denied");
        }
    }

    private ConversationDto toDto(Conversation c, String lastMessagePreview, String currentUsername,
            List<String> moderatedSubreddits) {
        ConversationDto dto = new ConversationDto();
        dto.setId(c.getId());
        String otherUser = null;
        // Check if this is a moderator-as-subreddit conversation.
        // If one participant is a subreddit the current user moderates, check whether
        // the other participant also moderates that subreddit. If so, show
        // r/<subreddit>.
        String p1 = c.getUser1();
        String p2 = c.getUser2();
        boolean p1IsModOfAny = moderatedSubreddits.contains(p1);
        boolean p2IsModOfAny = moderatedSubreddits.contains(p2);

        if (p1IsModOfAny || p2IsModOfAny) {
            String sub = p1IsModOfAny ? p1 : p2;
            String other = p1IsModOfAny ? p2 : p1;
            try {
                // if other also moderates this subreddit -> moderator group thread
                if (getModeratedSubreddits(other).contains(sub)) {
                    otherUser = "r/" + sub;
                } else {
                    // moderator messaging a user: show user with subreddit tag for moderator view
                    otherUser = other + " [r/" + sub + "]";
                }
            } catch (Exception e) {
                otherUser = other;
            }
        } else if (p1.equalsIgnoreCase(currentUsername)) {
            otherUser = p2;
        } else if (p2.equalsIgnoreCase(currentUsername)) {
            otherUser = p1;
        } else {
            otherUser = p1;
        }

        dto.setOtherUser(otherUser);
        dto.setUsername(currentUsername);
        dto.setStatus(c.getStatus().name());
        dto.setCreatedAt(c.getCreatedAt());
        dto.setUpdatedAt(c.getUpdatedAt());
        dto.setLastMessagePreview(truncate(lastMessagePreview, 100));

        java.time.LocalDateTime lastRead;
        if (c.getUser1().equalsIgnoreCase(currentUsername) || moderatedSubreddits.contains(c.getUser1())) {
            lastRead = c.getLastReadByUser1();
        } else {
            lastRead = c.getLastReadByUser2();
        }

        dto.setUnread(lastRead == null || c.getUpdatedAt().isAfter(lastRead));

        return dto;
    }

    private ConversationDto toDtoWithLastMessage(Conversation c, String currentUsername,
            List<String> moderatedSubreddits) {
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

        String otherUser = null;
        String p1 = c.getUser1();
        String p2 = c.getUser2();

        // Look for the most recent acting-as-subreddit message where current user
        // moderates that subreddit
        String foundSub = null;
        for (int i = messages.size() - 1; i >= 0; i--) {
            Message msg = messages.get(i);
            String acting = msg.getActingAsSubreddit();
            if (acting != null && moderatedSubreddits.contains(acting)) {
                foundSub = acting;
                break;
            }
        }

        if (foundSub != null) {
            // Determine other participant (not the subreddit)
            String other = p1.equalsIgnoreCase(foundSub) ? p2
                    : (p2.equalsIgnoreCase(foundSub) ? p1 : (p1.equalsIgnoreCase(currentUsername) ? p2 : p1));
            try {
                if (getModeratedSubreddits(other).contains(foundSub)) {
                    // moderator-to-moderator conversation -> show subreddit title
                    otherUser = "r/" + foundSub;
                } else {
                    // moderator-to-user -> show user with subreddit tag for moderator view
                    otherUser = other + " [r/" + foundSub + "]";
                }
            } catch (Exception e) {
                otherUser = other;
            }
        } else {
            // No acting-as messages; fall back to previous behavior
            if (moderatedSubreddits.contains(p1)) {
                String other = p2;
                try {
                    if (getModeratedSubreddits(other).contains(p1)) {
                        otherUser = "r/" + p1;
                    } else {
                        otherUser = other + " [r/" + p1 + "]";
                    }
                } catch (Exception e) {
                    otherUser = other;
                }
            } else if (moderatedSubreddits.contains(p2)) {
                String other = p1;
                try {
                    if (getModeratedSubreddits(other).contains(p2)) {
                        otherUser = "r/" + p2;
                    } else {
                        otherUser = other + " [r/" + p2 + "]";
                    }
                } catch (Exception e) {
                    otherUser = other;
                }
            } else if (p1.equalsIgnoreCase(currentUsername)) {
                otherUser = p2;
            } else if (p2.equalsIgnoreCase(currentUsername)) {
                otherUser = p1;
            } else {
                otherUser = p1;
            }
        }

        dto.setOtherUser(otherUser);
        dto.setUsername(currentUsername);
        dto.setStatus(c.getStatus().name());
        dto.setCreatedAt(c.getCreatedAt());
        dto.setUpdatedAt(lastActivity); // Use actual last message time
        dto.setLastMessagePreview(truncate(preview, 100));

        java.time.LocalDateTime lastRead;
        if (c.getUser1().equalsIgnoreCase(currentUsername) || moderatedSubreddits.contains(c.getUser1())) {
            lastRead = c.getLastReadByUser1();
        } else {
            lastRead = c.getLastReadByUser2();
        }

        dto.setUnread(lastRead == null || lastActivity.isAfter(lastRead));

        return dto;
    }

    private MessageDto toMessageDto(Message m, List<String> moderatedSubreddits) {
        MessageDto dto = new MessageDto();
        dto.setId(m.getId());
        // System messages
        if (m.getSenderName() != null && m.getSenderName().equalsIgnoreCase("SYSTEM")) {
            dto.setSenderType("SYSTEM");
            dto.setSenderDisplayName("System");
        } else {
            dto.setSenderType("USER");
            if (m.getActingAsSubreddit() != null) {
                dto.setSenderType("MODERATOR");
                if (moderatedSubreddits.contains(m.getActingAsSubreddit())) {
                    dto.setSenderDisplayName("u/" + m.getSenderName() + "[" + m.getActingAsSubreddit() + "]");
                } else {
                    dto.setSenderDisplayName("u/" + m.getActingAsSubreddit());
                }
            } else {
                dto.setSenderDisplayName(m.getSenderName());
            }
        }
        dto.setBody(m.getBody());
        dto.setCreatedAt(m.getCreatedAt());
        return dto;
    }

    private String truncate(String text, int maxLength) {
        if (text == null)
            return "";
        return text.length() <= maxLength ? text : text.substring(0, maxLength) + "…";
    }
}
