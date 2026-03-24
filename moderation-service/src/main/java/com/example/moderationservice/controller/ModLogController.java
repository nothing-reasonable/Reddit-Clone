package com.example.moderationservice.controller;

import com.example.moderationservice.auth.ModeratorAuthService;
import com.example.moderationservice.dto.ModLogResponse;
import com.example.moderationservice.service.ModLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/r/{subreddit}/modlog")
@RequiredArgsConstructor
public class ModLogController {

    private final ModLogService modLogService;
    private final ModeratorAuthService moderatorAuthService;

    /**
     * GET /api/r/{subreddit}/modlog
     * Returns the audit trail of all moderator actions in this subreddit.
     * 
     * Query Parameters:
     * - action: Filter by action type (e.g., remove_post, ban_user, etc.)
     * - moderator: Filter by moderator username
     * - limit: Number of items to return (max 100, default 25)
     * - after: Cursor for pagination
     * 
     * Requires moderator privileges.
     */
    @GetMapping
    public ResponseEntity<ModLogResponse> getModLog(
            @PathVariable String subreddit,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String moderator,
            @RequestParam(defaultValue = "25") int limit,
            @RequestParam(required = false) String after,
            Authentication authentication) {

        // Check authorization - only moderators can view the mod log
        moderatorAuthService.requireModerator(subreddit, authentication.getName());

        // Retrieve and return the mod log
        ModLogResponse response = modLogService.getModLog(subreddit, action, moderator, limit, after);
        return ResponseEntity.ok(response);
    }
}
