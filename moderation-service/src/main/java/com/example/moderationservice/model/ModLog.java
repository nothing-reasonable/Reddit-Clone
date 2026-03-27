package com.example.moderationservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "mod_logs", indexes = {
        @Index(name = "idx_modlog_subreddit", columnList = "subreddit"),
        @Index(name = "idx_modlog_moderator", columnList = "moderator"),
        @Index(name = "idx_modlog_action", columnList = "action"),
        @Index(name = "idx_modlog_timestamp", columnList = "timestamp")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModLog {

    @Id
    private String id;

    @Column(nullable = false)
    private String subreddit;

    @Column(nullable = false)
    private String moderator;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ModAction action;

    @Column(name = "target_user")
    private String targetUser;

    @Column(name = "target_content")
    private String targetContent;

    private String reason;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
