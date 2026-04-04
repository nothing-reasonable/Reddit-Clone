package com.example.modmailservice.service;

import com.example.modmailservice.auth.AuthorizationException;
import com.example.modmailservice.dto.ModMailThreadDto;
import com.example.modmailservice.dto.MessageDto;
import com.example.modmailservice.model.*;
import com.example.modmailservice.repository.ModMailMessageRepository;
import com.example.modmailservice.repository.ModMailReadReceiptRepository;
import com.example.modmailservice.repository.ModMailThreadRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class ModMailService {

    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Dhaka");

    private final ModMailThreadRepository threadRepository;
    private final ModMailMessageRepository messageRepository;
    private final ModMailReadReceiptRepository readReceiptRepository;
    private final RestClient restClient;
    private final String subredditServiceBaseUrl;
    private final String userServiceBaseUrl;

    public ModMailService(ModMailThreadRepository threadRepository,
                          ModMailMessageRepository messageRepository,
                          ModMailReadReceiptRepository readReceiptRepository,
                          RestClient restClient,
                          @Value("${services.subreddit.base-url:http://localhost:8082}") String subredditServiceBaseUrl,
                          @Value("${services.user.base-url:http://localhost:8081}") String userServiceBaseUrl) {
        this.threadRepository = threadRepository;
        this.messageRepository = messageRepository;
        this.readReceiptRepository = readReceiptRepository;
        this.restClient = restClient;
        this.subredditServiceBaseUrl = subredditServiceBaseUrl;
        this.userServiceBaseUrl = userServiceBaseUrl;
    }

    @Transactional
    public ModMailThreadDto createThread(String actorUsername,
                                         String subredditName,
                                         String targetUsername,
                                         String subject,
                                         String body) {
        boolean actorIsMod = isModerator(actorUsername, subredditName);

        if (!actorIsMod && !actorUsername.equalsIgnoreCase(targetUsername)) {
            throw new AuthorizationException(403, "Users can only create modmail for themselves");
        }

        ensureUserExists(targetUsername);

        ModMailSenderType senderType = actorIsMod ? ModMailSenderType.MODERATOR : ModMailSenderType.USER;
        String senderName = actorIsMod ? subredditName : actorUsername;

        ModMailThread thread = new ModMailThread();
        thread.setSubredditName(subredditName);
        thread.setUsername(targetUsername);
        thread.setSubject(subject);
        thread.setStatus(ConversationStatus.OPEN);
        if (senderType == ModMailSenderType.USER) {
            thread.setUserLastReadAt(LocalDateTime.now(APP_ZONE));
        }
        thread = threadRepository.save(thread);

        createMessage(thread, senderType, senderName, body);

        if (actorIsMod) {
            markModeratorRead(thread, actorUsername);
        }

        return toThreadDto(thread, actorUsername, actorIsMod);
    }

    @Transactional
    public ModMailThreadDto createSystemThread(String subredditName,
                                               String targetUsername,
                                               String subject,
                                               String body,
                                               ModMailSenderType senderType) {
        ensureUserExists(targetUsername);

        ModMailThread thread = new ModMailThread();
        thread.setSubredditName(subredditName);
        thread.setUsername(targetUsername);
        thread.setSubject(subject);
        thread.setStatus(ConversationStatus.OPEN);
        thread = threadRepository.save(thread);

        createMessage(thread, senderType, subredditName, body);

        return toThreadDto(thread, targetUsername, false);
    }

    public List<ModMailThreadDto> getThreadsForUser(String username) {
        return threadRepository.findByUsernameOrderByUpdatedAtDesc(username)
                .stream()
                .map(thread -> toThreadDto(thread, username, false))
                .toList();
    }

    public List<ModMailThreadDto> getThreadsForSubreddit(String subredditName, String moderatorUsername) {
        requireModerator(subredditName, moderatorUsername);
        return threadRepository.findBySubredditNameOrderByUpdatedAtDesc(subredditName)
                .stream()
                .map(thread -> toThreadDto(thread, moderatorUsername, true))
                .toList();
    }

    @Transactional
    public List<MessageDto> getThreadMessages(Long threadId, String actorUsername) {
        ModMailThread thread = findThreadOrThrow(threadId);
        boolean actorIsMod = isModerator(actorUsername, thread.getSubredditName());
        requireAccess(thread, actorUsername, actorIsMod);

        if (actorIsMod) {
            markModeratorRead(thread, actorUsername);
        } else {
            thread.setUserLastReadAt(LocalDateTime.now(APP_ZONE));
            threadRepository.save(thread);
        }

        return messageRepository.findByThreadIdOrderByCreatedAtAsc(threadId)
                .stream()
                .map(message -> toMessageDto(message, thread.getSubredditName()))
                .toList();
    }

    @Transactional
    public MessageDto sendThreadMessage(Long threadId, String actorUsername, String body) {
        ModMailThread thread = findThreadOrThrow(threadId);
        boolean actorIsMod = isModerator(actorUsername, thread.getSubredditName());
        requireAccess(thread, actorUsername, actorIsMod);

        if (thread.getStatus() == ConversationStatus.CLOSED) {
            throw new IllegalArgumentException("Cannot send message to a closed thread");
        }

        ModMailSenderType senderType = actorIsMod ? ModMailSenderType.MODERATOR : ModMailSenderType.USER;
        String senderName = actorIsMod ? thread.getSubredditName() : actorUsername;
        ModMailMessage message = createMessage(thread, senderType, senderName, body);

        if (actorIsMod) {
            markModeratorRead(thread, actorUsername);
        } else {
            thread.setUserLastReadAt(LocalDateTime.now(APP_ZONE));
            threadRepository.save(thread);
        }

        return toMessageDto(message, thread.getSubredditName());
    }

    @Transactional
    public void markThreadRead(Long threadId, String actorUsername) {
        ModMailThread thread = findThreadOrThrow(threadId);
        boolean actorIsMod = isModerator(actorUsername, thread.getSubredditName());
        requireAccess(thread, actorUsername, actorIsMod);

        if (actorIsMod) {
            markModeratorRead(thread, actorUsername);
        } else {
            thread.setUserLastReadAt(LocalDateTime.now(APP_ZONE));
            threadRepository.save(thread);
        }
    }

    private ModMailMessage createMessage(ModMailThread thread,
                                         ModMailSenderType senderType,
                                         String senderName,
                                         String body) {
        ModMailMessage message = new ModMailMessage();
        message.setThread(thread);
        message.setSenderType(senderType);
        message.setSenderName(senderName);
        message.setBody(body);
        message = messageRepository.save(message);

        thread.setUpdatedAt(LocalDateTime.now(APP_ZONE));
        threadRepository.save(thread);
        return message;
    }

    private ModMailThread findThreadOrThrow(Long threadId) {
        return threadRepository.findById(threadId)
                .orElseThrow(() -> new IllegalArgumentException("Thread not found: " + threadId));
    }

    private void requireAccess(ModMailThread thread, String actorUsername, boolean actorIsMod) {
        if (!actorIsMod && !thread.getUsername().equalsIgnoreCase(actorUsername)) {
            throw new AuthorizationException(403, "Access denied");
        }
    }

    private void requireModerator(String subredditName, String actorUsername) {
        if (!isModerator(actorUsername, subredditName)) {
            throw new AuthorizationException(403, "Only moderators can view subreddit modmail");
        }
    }

    private boolean isModerator(String username, String subredditName) {
        try {
            SubredditResponse subreddit = restClient.get()
                    .uri(subredditServiceBaseUrl + "/api/subreddits/{name}", subredditName)
                    .retrieve()
                    .body(SubredditResponse.class);

            return subreddit != null
                    && subreddit.getModerators() != null
                    && subreddit.getModerators().stream().anyMatch(mod -> mod.equalsIgnoreCase(username));
        } catch (Exception ignored) {
            return false;
        }
    }

    private void ensureUserExists(String username) {
        Boolean exists = restClient.get()
                .uri(userServiceBaseUrl + "/api/users/exists/{username}", username)
                .retrieve()
                .body(Boolean.class);

        if (exists == null || !exists) {
            throw new IllegalArgumentException("User '" + username + "' does not exist");
        }
    }

    private void markModeratorRead(ModMailThread thread, String moderatorUsername) {
        ModMailReadReceipt receipt = readReceiptRepository
                .findByThreadIdAndModeratorUsername(thread.getId(), moderatorUsername)
                .orElseGet(() -> {
                    ModMailReadReceipt newReceipt = new ModMailReadReceipt();
                    newReceipt.setThread(thread);
                    newReceipt.setModeratorUsername(moderatorUsername);
                    return newReceipt;
                });

        receipt.setLastReadAt(LocalDateTime.now(APP_ZONE));
        readReceiptRepository.save(receipt);
    }

    private ModMailThreadDto toThreadDto(ModMailThread thread, String actorUsername, boolean actorIsMod) {
        ModMailMessage lastMessage = messageRepository.findTopByThreadIdOrderByCreatedAtDesc(thread.getId());
        LocalDateTime lastActivity = lastMessage != null ? lastMessage.getCreatedAt() : thread.getUpdatedAt();

        boolean unread;
        if (actorIsMod) {
            LocalDateTime modLastRead = readReceiptRepository
                    .findByThreadIdAndModeratorUsername(thread.getId(), actorUsername)
                    .map(ModMailReadReceipt::getLastReadAt)
                    .orElse(null);
            unread = lastMessage != null
                    && lastMessage.getSenderType() == ModMailSenderType.USER
                    && (modLastRead == null || lastActivity.isAfter(modLastRead));
        } else {
            LocalDateTime userLastRead = thread.getUserLastReadAt();
            unread = lastMessage != null
                    && lastMessage.getSenderType() != ModMailSenderType.USER
                    && (userLastRead == null || lastActivity.isAfter(userLastRead));
        }

        ModMailThreadDto dto = new ModMailThreadDto();
        dto.setId(thread.getId());
        dto.setSubredditName(thread.getSubredditName());
        dto.setUsername(thread.getUsername());
        dto.setSubject(thread.getSubject());
        dto.setStatus(thread.getStatus().name());
        dto.setCreatedAt(toOffsetDateTime(thread.getCreatedAt()));
        dto.setUpdatedAt(toOffsetDateTime(lastActivity));
        dto.setUnread(unread);
        dto.setLastMessagePreview(lastMessage == null ? "" : truncate(lastMessage.getBody(), 120));
        return dto;
    }

    private MessageDto toMessageDto(ModMailMessage message, String subredditName) {
        MessageDto dto = new MessageDto();
        dto.setId(message.getId());
        dto.setSenderType(message.getSenderType().name());
        dto.setSenderDisplayName(resolveSenderDisplay(message, subredditName));
        dto.setBody(message.getBody());
        dto.setCreatedAt(toOffsetDateTime(message.getCreatedAt()));
        return dto;
    }

    private String resolveSenderDisplay(ModMailMessage message, String subredditName) {
        if (message.getSenderType() == ModMailSenderType.USER) {
            return message.getSenderName();
        }
        return "r/" + subredditName + " mods";
    }

    private OffsetDateTime toOffsetDateTime(LocalDateTime value) {
        return value == null ? null : value.atZone(APP_ZONE).toOffsetDateTime();
    }

    private String truncate(String text, int maxLength) {
        if (text == null) {
            return "";
        }
        return text.length() <= maxLength ? text : text.substring(0, maxLength) + "...";
    }

    public static class SubredditResponse {
        private List<String> moderators;

        public List<String> getModerators() { return moderators; }
        public void setModerators(List<String> moderators) { this.moderators = moderators; }
    }
}
