package com.example.moderationservice.automod;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class AutoModLogService {

    private final AutoModLogRepository repository;

    /**
     * Log an AutoMod rule action when it triggers.
     * Called from AutoModEngine when a rule is triggered.
     */
    public void logAction(String subredditName, String ruleId, String ruleName, String action,
                         String targetType, String targetId, String targetAuthor, String targetTitle, String reason) {
        AutoModLog autoModLog = AutoModLog.builder()
            .id(UUID.randomUUID().toString())
            .subredditName(subredditName)
            .ruleId(ruleId)
            .ruleName(ruleName)
            .action(action)
            .targetType(targetType)
            .targetId(targetId)
            .targetAuthor(targetAuthor)
            .targetTitle(targetTitle)
            .reason(reason)
            .timestamp(LocalDateTime.now())
            .build();

        try {
            repository.save(autoModLog);
            log.info("Logged AutoMod action: rule='{}' action='{}' target={}/{}", 
                     ruleName, action, targetType, targetId);
        } catch (Exception e) {
            log.error("Failed to persist AutoMod log entry: {}", e.getMessage());
        }
    }

    /**
     * Get AutoMod logs for a subreddit with optional action filtering.
     * Max 100 results per page, default 25.
     */
    public AutoModLogResponse getAutoModLogs(String subredditName, String action, int limit, int offset) {
        int pageSize = Math.min(Math.max(limit, 1), 100);
        Pageable pageable = PageRequest.of(offset / pageSize, pageSize);
        
        Page<AutoModLog> page = repository.findBySubredditNameOrderByTimestampDesc(subredditName, pageable);
        
        List<AutoModLogEntryDto> entries = page.getContent()
            .stream()
            .filter(entry -> action == null || action.isEmpty() || entry.getAction().equals(action))
            .map(AutoModLogEntryDto::fromEntity)
            .toList();

        return AutoModLogResponse.builder()
            .data(entries)
            .count(entries.size())
            .build();
    }
}
