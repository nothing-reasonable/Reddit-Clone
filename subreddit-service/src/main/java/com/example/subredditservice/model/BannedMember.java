package com.example.subredditservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "banned_members", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"subreddit_id", "username"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BannedMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "subreddit_id", nullable = false)
    private Long subredditId;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String bannedBy;

    @Column(nullable = false)
    private String reason;

    @Column(nullable = false)
    private boolean permanent;

    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private LocalDateTime bannedAt;
}
