package com.example.moderationservice.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ModLogEntry {
    private String id;
    private String subreddit;
    private String moderator;
    private String action;
    private String targetContent;
    private String targetUser;
    private LocalDateTime timestamp;
}
