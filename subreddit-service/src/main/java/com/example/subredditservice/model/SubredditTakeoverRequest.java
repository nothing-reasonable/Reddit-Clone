package com.example.subredditservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "subreddit_takeover_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubredditTakeoverRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long subredditId;

    @Column(nullable = false)
    private String requesterUsername;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TakeoverRequestStatus status;

    @Column(nullable = false)
    private LocalDateTime requestedAt;
}
