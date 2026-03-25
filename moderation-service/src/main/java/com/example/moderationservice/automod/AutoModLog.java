package com.example.moderationservice.automod;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "automod_logs", indexes = {
    @Index(name = "idx_automod_logs_subreddit", columnList = "subreddit_name"),
    @Index(name = "idx_automod_logs_rule_id", columnList = "rule_id"),
    @Index(name = "idx_automod_logs_action", columnList = "action"),
    @Index(name = "idx_automod_logs_timestamp", columnList = "timestamp")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutoModLog {

    @Id
    private String id;

    @Column(nullable = false)
    private String subredditName;

    @Column(nullable = false)
    private String ruleId;

    @Column(nullable = false)
    private String ruleName;

    @Column(nullable = false)
    private String action; // remove, flag, send_modmail, set_flair, etc.

    @Column(nullable = false)
    private String targetType; // post, comment

    @Column(nullable = false)
    private String targetId;

    @Column(nullable = false)
    private String targetAuthor;

    @Column(columnDefinition = "TEXT")
    private String reason; // Rule message/reason

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}
