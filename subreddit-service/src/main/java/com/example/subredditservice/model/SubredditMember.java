package com.example.subredditservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "subreddit_members", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"subreddit_id", "username"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubredditMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "subreddit_id", nullable = false)
    private Long subredditId;

    @Column(nullable = false)
    private String username;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MemberRole role;

    private LocalDateTime joinedAt;
}
