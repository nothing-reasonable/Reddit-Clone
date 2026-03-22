package com.example.moderationservice.controller;

import com.example.moderationservice.auth.ModeratorAuthService;
import com.example.moderationservice.dto.ModActionResponse;
import com.example.moderationservice.service.ModActionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/r/{subreddit}/mod-actions")
@RequiredArgsConstructor
public class ModActionController {

    private final ModActionService modActionService;
    private final ModeratorAuthService moderatorAuthService;

    @PostMapping("/{postId}/approve")
    public ResponseEntity<ModActionResponse> approvePost(
            @PathVariable String subreddit,
            @PathVariable String postId,
            Authentication authentication) {
        moderatorAuthService.requireModerator(subreddit, authentication.getName());
        return ResponseEntity.ok(modActionService.executeAction(postId, "approve", authentication.getName()));
    }

    @PostMapping("/{postId}/remove")
    public ResponseEntity<ModActionResponse> removePost(
            @PathVariable String subreddit,
            @PathVariable String postId,
            Authentication authentication) {
        moderatorAuthService.requireModerator(subreddit, authentication.getName());
        return ResponseEntity.ok(modActionService.executeAction(postId, "remove", authentication.getName()));
    }

    @PostMapping("/{postId}/lock")
    public ResponseEntity<ModActionResponse> lockPost(
            @PathVariable String subreddit,
            @PathVariable String postId,
            Authentication authentication) {
        moderatorAuthService.requireModerator(subreddit, authentication.getName());
        return ResponseEntity.ok(modActionService.executeAction(postId, "lock", authentication.getName()));
    }

    @PostMapping("/{postId}/unlock")
    public ResponseEntity<ModActionResponse> unlockPost(
            @PathVariable String subreddit,
            @PathVariable String postId,
            Authentication authentication) {
        moderatorAuthService.requireModerator(subreddit, authentication.getName());
        return ResponseEntity.ok(modActionService.executeAction(postId, "unlock", authentication.getName()));
    }

    @PostMapping("/{postId}/pin")
    public ResponseEntity<ModActionResponse> pinPost(
            @PathVariable String subreddit,
            @PathVariable String postId,
            Authentication authentication) {
        moderatorAuthService.requireModerator(subreddit, authentication.getName());
        return ResponseEntity.ok(modActionService.executeAction(postId, "pin", authentication.getName()));
    }

    @PostMapping("/{postId}/unpin")
    public ResponseEntity<ModActionResponse> unpinPost(
            @PathVariable String subreddit,
            @PathVariable String postId,
            Authentication authentication) {
        moderatorAuthService.requireModerator(subreddit, authentication.getName());
        return ResponseEntity.ok(modActionService.executeAction(postId, "unpin", authentication.getName()));
    }
}
