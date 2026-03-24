package com.example.moderationservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModLogEntryDto {
    private String id;
    private String subreddit;
    private String moderator;
    private String action;
    
    @JsonProperty("targetUser")
    private String targetUser;
    
    @JsonProperty("targetContent")
    private String targetContent;
    
    private String reason;
    private LocalDateTime timestamp;
}
