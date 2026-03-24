package com.example.moderationservice.controller;

import com.example.moderationservice.auth.ModeratorAuthService;
import com.example.moderationservice.dto.ModActionResponse;
import com.example.moderationservice.dto.ModLogEntry;
import com.example.moderationservice.service.ModActionService;
import com.example.moderationservice.service.ModLogStore;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/r/{subreddit}/mod-actions")
@RequiredArgsConstructor
public class ModActionController {

    private final ModActionService modActionService;
    private final ModeratorAuthService moderatorAuthService;
    private final ModLogStore modLogStore;

    @GetMapping("/log")
    public ResponseEntity<List<ModLogEntry>> getModLog(
            @PathVariable String subreddit,
            Authentication authentication) {
        moderatorAuthService.requireModerator(subreddit, authentication.getName());
        return ResponseEntity.ok(modLogStore.getBySubreddit(subreddit));
    }

    @PostMapping("/{postId}/approve")
    public ResponseEntity<ModActionResponse> approvePost(
            @PathVariable String subreddit,
            @PathVariable String postId,
            Authentication authentication) {
        moderatorAuthService.requireModerator(subreddit, authentication.getName());
        return ResponseEntity.ok(modActionService.executeAction(postId, "approve", authentication.getName(), subreddit));
    }

    @PostMapping("/{postId}/remove")
    public ResponseEntity<ModActionResponse> removePost(
            @PathVariable String subreddit,
            @PathVariable String postId,
            Authentication authentication) {
        moderatorAuthService.requireModerator(subreddit, authentication.getName());
        return ResponseEntity.ok(modActionService.executeAction(postId, "remove", authentication.getName(), subreddit));
    }

    @PostMapping("/{postId}/lock")
    public ResponseEntity<ModActionResponse> lockPost(
            @PathVariable String subreddit,
            @PathVariable String postId,
            Authentication authentication) {
        moderatorAuthService.requireModerator(subreddit, authentication.getName());
        return ResponseEntity.ok(modActionService.executeAction(postId, "lock", authentication.getName(), subreddit));
    }

    @PostMapping("/{postId}/unlock")
    public ResponseEntity<ModActionResponse> unlockPost(
            @PathVariable String subreddit,
            @PathVariable String postId,
            Authentication authentication) {
        moderatorAuthService.requireModerator(subreddit, authentication.getName());
        return ResponseEntity.ok(modActionService.executeAction(postId, "unlock", authentication.getName(), subreddit));
    }

    @PostMapping("/{postId}/pin")
    public ResponseEntity<ModActionResponse> pinPost(
            @PathVariable String subreddit,
            @PathVariable String postId,
            Authentication authentication) {
        moderatorAuthService.requireModerator(subreddit, authentication.getName());
        return ResponseEntity.ok(modActionService.executeAction(postId, "pin", authentication.getName(), subreddit));
    }

    @PostMapping("/{postId}/unpin")
    public ResponseEntity<ModActionResponse> unpinPost(
            @PathVariable String subreddit,
            @PathVariable String postId,
            Authentication authentication) {
        moderatorAuthService.requireModerator(subreddit, authentication.getName());
        return ResponseEntity.ok(modActionService.executeAction(postId, "unpin", authentication.getName(), subreddit));
    }

    // ── Comment Mod Action Endpoints ────────────────────────────────

    @PostMapping("/{postId}/comments/{commentId}/approve")
    public ResponseEntity<ModActionResponse> approveComment(
            @PathVariable String subreddit,
            @PathVariable String postId,
            @PathVariable String commentId,
            Authentication authentication) {
        moderatorAuthService.requireModerator(subreddit, authentication.getName());
        return ResponseEntity.ok(modActionService.executeCommentAction(commentId, postId, "approve", authentication.getName(), subreddit));
    }

    @PostMapping("/{postId}/comments/{commentId}/remove")
    public ResponseEntity<ModActionResponse> removeComment(
            @PathVariable String subreddit,
            @PathVariable String postId,
            @PathVariable String commentId,
            Authentication authentication) {
        moderatorAuthService.requireModerator(subreddit, authentication.getName());
        return ResponseEntity.ok(modActionService.executeCommentAction(commentId, postId, "remove", authentication.getName(), subreddit));
    }
}
