package com.example.moderationservice.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class CommentDto {
    private String id;
    private String postId;
    private String parentId;
    private String author;
    private String content;
    private int upvotes;
    private int downvotes;
    private int score;
    private LocalDateTime createdAt;
    private LocalDateTime editedAt;
    private boolean removed;
    private boolean flagged;
    private int reports;
    private String reportReasons; // JSON array of report reasons
}
