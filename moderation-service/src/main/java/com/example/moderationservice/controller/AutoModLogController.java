package com.example.moderationservice.controller;

import com.example.moderationservice.automod.AutoModLogResponse;
import com.example.moderationservice.automod.AutoModLogService;
import com.example.moderationservice.auth.ModeratorAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Slf4j
public class AutoModLogController {

    private final AutoModLogService autoModLogService;
    private final ModeratorAuthService moderatorAuthService;

    /**
     * GET /api/r/{subreddit}/automod/logs
     * Public endpoint for moderators to view AutoMod action logs.
     * Requires moderator privilege for the subreddit.
     */
    @GetMapping("/api/r/{subreddit}/automod/logs")
    public AutoModLogResponse getAutoModLogs(
        @PathVariable String subreddit,
        @RequestParam(required = false) String action,
        @RequestParam(defaultValue = "25") int limit,
        @RequestParam(defaultValue = "0") int offset,
        Authentication authentication) {

        // Same auth pattern as other moderation controllers
        moderatorAuthService.requireModerator(subreddit, authentication.getName());

        return autoModLogService.getAutoModLogs(subreddit, action, limit, offset);
    }
}
