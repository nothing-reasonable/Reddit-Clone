package com.example.contentservice.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "posts", indexes = {
        @Index(name = "idx_post_subreddit", columnList = "subreddit"),
        @Index(name = "idx_post_score", columnList = "score"),
        @Index(name = "idx_post_created_at", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Post {

    @Id
    private String id;

    @Column(nullable = false)
    private String subreddit;

    @Column(nullable = false)
    private String author;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostType type;

    private String url;

    @Builder.Default
    private int upvotes = 0;
    
    @Builder.Default
    private int downvotes = 0;
    
    @Builder.Default
    private int score = 0;
    
    @Builder.Default
    private int commentCount = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;

    private String flair;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "integer default 0")
    private int reports = 0;

    // Kept to satisfy existing postgres schema constraints
    @Builder.Default
    @Column(nullable = false)
    private boolean flagged = false;
    
    @Builder.Default
    private boolean removed = false;
    
    @Builder.Default
    private boolean locked = false;
    
    @Builder.Default
    private boolean pinned = false;
}
