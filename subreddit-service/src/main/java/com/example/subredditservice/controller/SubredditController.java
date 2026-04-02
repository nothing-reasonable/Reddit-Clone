package com.example.subredditservice.controller;

import com.example.subredditservice.dto.*;
import com.example.subredditservice.service.SubredditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subreddits")
@RequiredArgsConstructor
public class SubredditController {

    private final SubredditService subredditService;

    // ───── Subreddit CRUD ─────

    @PostMapping
    public ResponseEntity<SubredditDto> createSubreddit(
            @Valid @RequestBody CreateSubredditRequest request,
            Authentication authentication) {
        SubredditDto created = subredditService.createSubreddit(request, authentication.getName());
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<SubredditDto>> getAllSubreddits() {
        return ResponseEntity.ok(subredditService.getAllSubreddits());
    }

    @GetMapping("/search")
    public ResponseEntity<List<SubredditDto>> searchSubreddits(@RequestParam String q) {
        return ResponseEntity.ok(subredditService.searchSubreddits(q));
    }

    @GetMapping("/user/communities")
    public ResponseEntity<List<SubredditMemberDto>> getUserCommunities(Authentication authentication) {
        List<SubredditMemberDto> communities = subredditService.getUserCommunities(authentication.getName());
        return ResponseEntity.ok(communities);
    }

    @GetMapping("/id/{id}")
    public ResponseEntity<SubredditDto> getSubredditById(@PathVariable Long id) {
        return ResponseEntity.ok(subredditService.getSubredditById(id));
    }

    @GetMapping("/{name}")
    public ResponseEntity<SubredditDto> getSubredditByName(@PathVariable String name) {
        return ResponseEntity.ok(subredditService.getSubredditByName(name));
    }

    @PutMapping("/{name}")
    public ResponseEntity<SubredditDto> updateSubreddit(
            @PathVariable String name,
            @Valid @RequestBody UpdateSubredditRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(subredditService.updateSubreddit(name, request, authentication.getName()));
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> deleteSubreddit(@PathVariable String name, Authentication authentication) {
        subredditService.deleteSubreddit(name, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    // ───── Membership ─────

    @PostMapping("/{name}/join")
    public ResponseEntity<SubredditMemberDto> joinSubreddit(
            @PathVariable String name,
            Authentication authentication) {
        SubredditMemberDto joined = subredditService.joinSubreddit(name, authentication.getName());
        return ResponseEntity.ok(joined);
    }

    @DeleteMapping("/{name}/join")
    public ResponseEntity<Void> leaveSubreddit(
            @PathVariable String name,
            Authentication authentication) {
        subredditService.leaveSubreddit(name, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{name}/moderator/resign")
    public ResponseEntity<Void> resignModeratorRole(
            @PathVariable String name,
            Authentication authentication) {
        subredditService.resignModeratorRole(name, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{name}/takeover-requests")
    public ResponseEntity<Void> requestTakeover(
            @PathVariable String name,
            Authentication authentication) {
        subredditService.requestTakeover(name, authentication.getName());
        return new ResponseEntity<>(HttpStatus.CREATED);
    }

    @GetMapping("/{name}/members")
    public ResponseEntity<List<SubredditMemberDto>> getSubredditMembers(@PathVariable String name) {
        return ResponseEntity.ok(subredditService.getMembers(name));
    }

    /**
     * Returns list of subreddit names that the given username moderates.
     * This is used by other services (internal) to verify moderator status.
     */
    @GetMapping("/moderates/{username}")
    public ResponseEntity<List<String>> getModeratedSubreddits(@PathVariable String username) {
        return ResponseEntity.ok(subredditService.getModeratedSubreddits(username));
    }

    @GetMapping("/exists/{name}")
    public ResponseEntity<Boolean> exists(@PathVariable String name) {
        try {
            subredditService.getSubredditByName(name);
            return ResponseEntity.ok(true);
        } catch (com.example.subredditservice.exception.ResourceNotFoundException ex) {
            return ResponseEntity.ok(false);
        }
    }

    @GetMapping("/{name}/is-member/{username}")
    public ResponseEntity<MemberCheckResponse> isMember(
            @PathVariable String name,
            @PathVariable String username) {
        boolean isMember = subredditService.isMember(name, username);
        return ResponseEntity.ok(new MemberCheckResponse(isMember));
    }

    @PostMapping("/{name}/moderators/add/{username}")
    public ResponseEntity<Void> addModerator(
            @PathVariable String name,
            @PathVariable String username) {
        subredditService.addModerator(name, username);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{name}/presence")
    public ResponseEntity<Long> heartbeatPresence(
            @PathVariable String name,
            @RequestHeader(value = "X-Presence-Session", required = false) String presenceSession,
            Authentication authentication) {
        long onlineCount = subredditService.heartbeatPresence(name, authentication.getName(), presenceSession);
        return ResponseEntity.ok(onlineCount);
    }

    @DeleteMapping("/{name}/presence")
    public ResponseEntity<Long> leavePresence(
            @PathVariable String name,
            @RequestHeader(value = "X-Presence-Session", required = false) String presenceSession,
            Authentication authentication) {
        long onlineCount = subredditService.leavePresence(name, authentication.getName(), presenceSession);
        return ResponseEntity.ok(onlineCount);
    }

    // ───── Bans ─────

    @PostMapping("/{name}/bans")
    public ResponseEntity<BannedMemberDto> banUser(
            @PathVariable String name,
            @RequestBody BanRequest request,
            Authentication authentication) {
        BannedMemberDto banned = subredditService.banUser(name, request, authentication.getName());
        return new ResponseEntity<>(banned, HttpStatus.CREATED);
    }

    @DeleteMapping("/{name}/bans/{username}")
    public ResponseEntity<Void> unbanUser(
            @PathVariable String name,
            @PathVariable String username) {
        subredditService.unbanUser(name, username);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{name}/bans")
    public ResponseEntity<List<BannedMemberDto>> getBannedUsers(@PathVariable String name) {
        return ResponseEntity.ok(subredditService.getBannedUsers(name));
    }

    @GetMapping("/{name}/is-banned/{username}")
    public ResponseEntity<IsBannedResponse> isBanned(
            @PathVariable String name,
            @PathVariable String username) {
        boolean banned = subredditService.isBanned(name, username);
        return ResponseEntity.ok(new IsBannedResponse(banned));
    }

    // ───── Rules ─────

    @PostMapping("/{name}/rules")
    public ResponseEntity<SubredditRuleDto> addRule(
            @PathVariable String name,
            @Valid @RequestBody SubredditRuleDto ruleDto) {
        return new ResponseEntity<>(subredditService.addRule(name, ruleDto), HttpStatus.CREATED);
    }

    @PutMapping("/{name}/rules/{ruleId}")
    public ResponseEntity<SubredditRuleDto> updateRule(
            @PathVariable String name,
            @PathVariable Long ruleId,
            @Valid @RequestBody SubredditRuleDto ruleDto) {
        return ResponseEntity.ok(subredditService.updateRule(name, ruleId, ruleDto));
    }

    @DeleteMapping("/{name}/rules/{ruleId}")
    public ResponseEntity<Void> deleteRule(
            @PathVariable String name,
            @PathVariable Long ruleId) {
        subredditService.deleteRule(name, ruleId);
        return ResponseEntity.noContent().build();
    }

    // ───── Flairs ─────

    @PostMapping("/{name}/flairs")
    public ResponseEntity<SubredditDto> addFlair(
            @PathVariable String name,
            @RequestParam String flair) {
        return new ResponseEntity<>(subredditService.addFlair(name, flair), HttpStatus.CREATED);
    }

    @DeleteMapping("/{name}/flairs/{flair}")
    public ResponseEntity<SubredditDto> removeFlair(
            @PathVariable String name,
            @PathVariable String flair) {
        return ResponseEntity.ok(subredditService.removeFlair(name, flair));
    }
}
