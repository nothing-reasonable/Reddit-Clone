package com.example.subredditservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubredditRuleDto {
    private Long id;

    @NotBlank(message = "Rule title cannot be empty")
    private String title;

    private String description;
}
