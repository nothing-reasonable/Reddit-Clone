package com.example.subredditservice.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class SubredditDto {
    private Long id;
    private String name;
    private String description;
    private String longDescription;
    private String type;
    private boolean isNsfw;
    private String bannerUrl;
    private String iconUrl;
    private String creatorUsername;
    private long memberCount;
    private List<SubredditRuleDto> rules;
    private List<String> flairs;
    private List<String> moderators;
    private LocalDateTime createdAt;
}
