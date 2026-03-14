package com.example.subredditservice.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class SubredditMemberDto {
    private String username;
    private String role;
    private LocalDateTime joinedAt;
}
