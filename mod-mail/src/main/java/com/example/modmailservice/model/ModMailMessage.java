package com.example.modmailservice.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "modmail_messages", indexes = {
        @Index(name = "idx_modmail_message_thread_created", columnList = "thread_id,created_at")
})
public class ModMailMessage {

    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Dhaka");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "thread_id", nullable = false)
    private ModMailThread thread;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false)
    private ModMailSenderType senderType;

    @Column(name = "sender_name", nullable = false)
    private String senderName;

    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now(APP_ZONE);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public ModMailThread getThread() { return thread; }
    public void setThread(ModMailThread thread) { this.thread = thread; }

    public ModMailSenderType getSenderType() { return senderType; }
    public void setSenderType(ModMailSenderType senderType) { this.senderType = senderType; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
