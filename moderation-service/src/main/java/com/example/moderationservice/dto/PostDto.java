package com.example.moderationservice.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class PostDto {
    private String id;
    private String subreddit;
    private String author;
    private String title;
    private String content;
    private String type;
    private String url;
    private int upvotes;
    private int downvotes;
    private int score;
    private int commentCount;
    private LocalDateTime createdAt;
    private LocalDateTime editedAt;
    private String flair;
    private int reports;
    private String reportReasons; // JSON array of report reasons
    private boolean removed;
    private boolean locked;
    private boolean pinned;
}
