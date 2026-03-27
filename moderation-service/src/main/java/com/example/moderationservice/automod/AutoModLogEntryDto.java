package com.example.moderationservice.automod;

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
public class AutoModLogEntryDto {

    @JsonProperty("id")
    private String id;

    @JsonProperty("ruleId")
    private String ruleId;

    @JsonProperty("ruleName")
    private String ruleName;

    @JsonProperty("action")
    private String action;

    @JsonProperty("targetType")
    private String targetType;

    @JsonProperty("targetId")
    private String targetId;

    @JsonProperty("targetAuthor")
    private String targetAuthor;

    @JsonProperty("targetTitle")
    private String targetTitle;

    @JsonProperty("reason")
    private String reason;

    @JsonProperty("timestamp")
    private LocalDateTime timestamp;

    // Factory method to convert from entity
    public static AutoModLogEntryDto fromEntity(AutoModLog log) {
        return AutoModLogEntryDto.builder()
            .id(log.getId())
            .ruleId(log.getRuleId())
            .ruleName(log.getRuleName())
            .action(log.getAction())
            .targetType(log.getTargetType())
            .targetId(log.getTargetId())
            .targetAuthor(log.getTargetAuthor())
            .targetTitle(log.getTargetTitle())
            .reason(log.getReason())
            .timestamp(log.getTimestamp())
            .build();
    }
}
