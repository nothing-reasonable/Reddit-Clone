package com.example.modmailservice.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "conversations", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user1", "user2"})
})
public class Conversation {

    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Dhaka");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user1", nullable = false)
    private String user1;

    @Column(name = "user2", nullable = false)
    private String user2;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ConversationStatus status = ConversationStatus.OPEN;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "last_read_user1")
    private LocalDateTime lastReadByUser1;

    @Column(name = "last_read_user2")
    private LocalDateTime lastReadByUser2;

    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<Message> messages = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now(APP_ZONE);
        updatedAt = LocalDateTime.now(APP_ZONE);
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now(APP_ZONE);
    }

    // ── Getters & Setters ──

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUser1() { return user1; }
    public void setUser1(String user1) { this.user1 = user1; }

    public String getUser2() { return user2; }
    public void setUser2(String user2) { this.user2 = user2; }

    public ConversationStatus getStatus() { return status; }
    public void setStatus(ConversationStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public LocalDateTime getLastReadByUser1() { return lastReadByUser1; }
    public void setLastReadByUser1(LocalDateTime lastReadByUser1) { this.lastReadByUser1 = lastReadByUser1; }

    public LocalDateTime getLastReadByUser2() { return lastReadByUser2; }
    public void setLastReadByUser2(LocalDateTime lastReadByUser2) { this.lastReadByUser2 = lastReadByUser2; }

    public List<Message> getMessages() { return messages; }
    public void setMessages(List<Message> messages) { this.messages = messages; }
}
