package com.example.modmailservice.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "modmail_threads", indexes = {
        @Index(name = "idx_modmail_thread_subreddit_updated", columnList = "subreddit_name,updated_at"),
        @Index(name = "idx_modmail_thread_username_updated", columnList = "username,updated_at")
})
public class ModMailThread {

    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Dhaka");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "subreddit_name", nullable = false)
    private String subredditName;

    @Column(name = "username", nullable = false)
    private String username;

    @Column(name = "subject", nullable = false)
    private String subject;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ConversationStatus status = ConversationStatus.OPEN;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "user_last_read_at")
    private LocalDateTime userLastReadAt;

    @OneToMany(mappedBy = "thread", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<ModMailMessage> messages = new ArrayList<>();

    @OneToMany(mappedBy = "thread", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ModMailReadReceipt> readReceipts = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now(APP_ZONE);
        updatedAt = LocalDateTime.now(APP_ZONE);
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now(APP_ZONE);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSubredditName() { return subredditName; }
    public void setSubredditName(String subredditName) { this.subredditName = subredditName; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public ConversationStatus getStatus() { return status; }
    public void setStatus(ConversationStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public LocalDateTime getUserLastReadAt() { return userLastReadAt; }
    public void setUserLastReadAt(LocalDateTime userLastReadAt) { this.userLastReadAt = userLastReadAt; }

    public List<ModMailMessage> getMessages() { return messages; }
    public void setMessages(List<ModMailMessage> messages) { this.messages = messages; }

    public List<ModMailReadReceipt> getReadReceipts() { return readReceipts; }
    public void setReadReceipts(List<ModMailReadReceipt> readReceipts) { this.readReceipts = readReceipts; }
}
