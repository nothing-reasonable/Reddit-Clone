package com.example.contentservice.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "comments", indexes = {
        @Index(name = "idx_comment_post", columnList = "post_id"),
        @Index(name = "idx_comment_parent", columnList = "parent_id"),
        @Index(name = "idx_comment_author", columnList = "author"),
        @Index(name = "idx_comment_created_at", columnList = "created_at"),
        @Index(name = "idx_comment_subreddit_flagged", columnList = "subreddit,flagged")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comment {
    
    @Id
    private String id;
    
    @Column(name = "post_id", nullable = false)
    private String postId;
    
    @Column(nullable = false)
    private String subreddit;
    
    @Column(name = "parent_id")
    private String parentId; // null for top-level comments
    
    @Column(nullable = false)
    private String author;
    
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;
    
    @Builder.Default
    @Column(nullable = false, columnDefinition = "integer default 0")
    private int upvotes = 0;
    
    @Builder.Default
    @Column(nullable = false, columnDefinition = "integer default 0")
    private int downvotes = 0;
    
    @Builder.Default
    @Column(nullable = false, columnDefinition = "integer default 0")
    private int score = 0;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "edited_at")
    private LocalDateTime editedAt;
    
    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean removed = false;
    
    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean flagged = false;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "integer default 0")
    private int reports = 0;

    @Builder.Default
    @Column(columnDefinition = "TEXT")
    private String reportReasons = "[]"; // JSON array of report reasons
}
