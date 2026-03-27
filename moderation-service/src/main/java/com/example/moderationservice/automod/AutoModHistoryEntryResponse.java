package com.example.moderationservice.automod;

import java.time.Instant;
import java.util.Map;

public record AutoModHistoryEntryResponse(
        String id,
        String ruleId,
        String ruleName,
        String action,
        String moderator,
        Instant timestamp,
        Map<String, Object> changes
) {
}