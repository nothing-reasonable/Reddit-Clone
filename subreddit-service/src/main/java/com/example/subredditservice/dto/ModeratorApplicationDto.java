package com.example.subredditservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModeratorApplicationDto {
    private Long id;
    private String requesterUsername;
    private String status;
    private LocalDateTime requestedAt;
}
