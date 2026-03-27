package com.example.subredditservice.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class BannedMemberDto {
    private Long id;
    private String username;
    private String bannedBy;
    private String reason;
    private boolean permanent;
    private LocalDateTime expiresAt;
    private LocalDateTime bannedAt;
}
