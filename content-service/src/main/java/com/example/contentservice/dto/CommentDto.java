package com.example.contentservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
}
