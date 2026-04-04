package com.example.modmailservice.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "modmail_read_receipts", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"thread_id", "moderator_username"})
})
public class ModMailReadReceipt {

    private static final ZoneId APP_ZONE = ZoneId.of("Asia/Dhaka");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "thread_id", nullable = false)
    private ModMailThread thread;

    @Column(name = "moderator_username", nullable = false)
    private String moderatorUsername;

    @Column(name = "last_read_at", nullable = false)
    private LocalDateTime lastReadAt;

    @PrePersist
    protected void onCreate() {
        if (lastReadAt == null) {
            lastReadAt = LocalDateTime.now(APP_ZONE);
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public ModMailThread getThread() { return thread; }
    public void setThread(ModMailThread thread) { this.thread = thread; }

    public String getModeratorUsername() { return moderatorUsername; }
    public void setModeratorUsername(String moderatorUsername) { this.moderatorUsername = moderatorUsername; }

    public LocalDateTime getLastReadAt() { return lastReadAt; }
    public void setLastReadAt(LocalDateTime lastReadAt) { this.lastReadAt = lastReadAt; }
}
