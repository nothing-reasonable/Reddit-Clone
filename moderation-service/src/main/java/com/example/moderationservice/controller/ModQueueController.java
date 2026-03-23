package com.example.moderationservice.controller;

import com.example.moderationservice.auth.ModeratorAuthService;
import com.example.moderationservice.dto.ModQueueActionRequest;
import com.example.moderationservice.dto.ModQueueItem;
import com.example.moderationservice.dto.PageResponse;
import com.example.moderationservice.service.ModQueueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/r/{subreddit}/modqueue")
@RequiredArgsConstructor
public class ModQueueController {

    private final ModQueueService modQueueService;
    private final ModeratorAuthService moderatorAuthService;

    @GetMapping
    public ResponseEntity<PageResponse<ModQueueItem>> getModQueue(
            @PathVariable String subreddit,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int limit,
            Authentication authentication) {
        
        moderatorAuthService.requireModerator(subreddit, authentication.getName());
        return ResponseEntity.ok(modQueueService.getModQueue(subreddit, page, limit));
    }

    @PatchMapping
    public ResponseEntity<Map<String, Integer>> bulkModQueueAction(
            @PathVariable String subreddit,
            @RequestBody ModQueueActionRequest request,
            Authentication authentication) {
        
        moderatorAuthService.requireModerator(subreddit, authentication.getName());
        return ResponseEntity.ok(modQueueService.bulkModQueueAction(subreddit, request));
    }
}
