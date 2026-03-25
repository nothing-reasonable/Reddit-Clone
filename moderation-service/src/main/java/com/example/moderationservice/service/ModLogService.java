package com.example.moderationservice.service;

import com.example.moderationservice.dto.ModLogEntryDto;
import com.example.moderationservice.dto.ModLogResponse;
import com.example.moderationservice.dto.PaginationInfo;
import com.example.moderationservice.model.ModAction;
import com.example.moderationservice.model.ModLog;
import com.example.moderationservice.repository.ModLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ModLogService {

    private final ModLogRepository modLogRepository;

    /**
     * Log a moderation action to the database.
     * This is called whenever a moderator performs an action.
     */
    @Transactional
    public ModLog logAction(String subreddit, String moderator, ModAction action,
                           String targetUser, String targetContent, String reason) {
        ModLog modLog = ModLog.builder()
                .subreddit(subreddit)
                .moderator(moderator)
                .action(action)
                .targetUser(targetUser)
                .targetContent(targetContent)
                .reason(reason)
                .build();

        log.debug("Saving modlog: subreddit={}, moderator={}, action={}, targetUser={}", 
                subreddit, moderator, action, targetUser);
        return modLogRepository.save(modLog);
    }

    /**
     * Retrieve moderation log for a subreddit with optional filtering.
     * Defaults to 25 items per page, max 100.
     */
    public ModLogResponse getModLog(String subreddit, String actionFilter, String moderatorFilter,
                                   int limit, String after) {
        log.info("getModLog called: subreddit={}, actionFilter={}, moderatorFilter={}, limit={}", 
                subreddit, actionFilter, moderatorFilter, limit);
                
        // Validate and cap limit
        int pageSize = Math.min(Math.max(limit, 1), 100);
        Pageable pageable = PageRequest.of(0, pageSize);

        // Parse action filter
        ModAction action = null;
        if (actionFilter != null && !actionFilter.isEmpty()) {
            try {
                action = ModAction.valueOf(actionFilter.toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // Invalid action type, treat as null
            }
        }

        // Query the database
        log.info("Querying modlog for subreddit={}, action={}, moderator={}", subreddit, action, moderatorFilter);
        Page<ModLog> page = modLogRepository.findBySubredditWithFilters(
                subreddit,
                action,
                moderatorFilter,
                pageable);

        log.info("Query returned {} results", page.getTotalElements());

        // Convert to DTOs
        List<ModLogEntryDto> entries = page.getContent()
                .stream()
                .map(this::convertToDto)
                .toList();

        log.info("Converted to {} DTOs", entries.size());

        // Build pagination info
        String nextCursor = page.hasNext() && !entries.isEmpty()
                ? entries.get(entries.size() - 1).getId()
                : null;

        PaginationInfo pagination = PaginationInfo.builder()
                .after(nextCursor)
                .count(entries.size())
                .has_more(page.hasNext())
                .build();

        return ModLogResponse.builder()
                .data(entries)
                .pagination(pagination)
                .build();
    }

    /**
     * Convert ModLog entity to DTO for API response.
     */
    private ModLogEntryDto convertToDto(ModLog modLog) {
        return ModLogEntryDto.builder()
                .id(modLog.getId())
                .subreddit(modLog.getSubreddit())
                .moderator(modLog.getModerator())
                .action(modLog.getAction().name().toLowerCase())
                .targetUser(modLog.getTargetUser())
                .targetContent(modLog.getTargetContent())
                .reason(modLog.getReason())
                .timestamp(modLog.getTimestamp())
                .build();
    }
}
