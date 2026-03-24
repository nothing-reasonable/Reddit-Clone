package com.example.moderationservice.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ModActionResponse {
    private String postId;
    private String action;
    private String moderator;
    private LocalDateTime timestamp;
    private boolean success;

    // Snapshot of the post after the action
    private String postTitle;
    private String postAuthor;
    private boolean removed;
    private boolean locked;
    private boolean pinned;
}
