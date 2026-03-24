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
            Authentication authentication
    ) {
        SubredditDto created = subredditService.createSubreddit(request, authentication.getName());
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping("/{name}")
    public ResponseEntity<SubredditDto> getSubredditByName(@PathVariable String name) {
        return ResponseEntity.ok(subredditService.getSubredditByName(name));
    }

    @GetMapping("/id/{id}")
    public ResponseEntity<SubredditDto> getSubredditById(@PathVariable Long id) {
        return ResponseEntity.ok(subredditService.getSubredditById(id));
    }

    @GetMapping
    public ResponseEntity<List<SubredditDto>> getAllSubreddits() {
        return ResponseEntity.ok(subredditService.getAllSubreddits());
    }

    @GetMapping("/search")
    public ResponseEntity<List<SubredditDto>> searchSubreddits(@RequestParam String q) {
        return ResponseEntity.ok(subredditService.searchSubreddits(q));
    }

    @PutMapping("/{name}")
    public ResponseEntity<SubredditDto> updateSubreddit(
            @PathVariable String name,
            @Valid @RequestBody UpdateSubredditRequest request
    ) {
        // Note: For a simpler implementation, we assume authentication is enough for access control here
        // A complete implementation would verify the authenticated user is a MODERATOR of this subreddit.
        return ResponseEntity.ok(subredditService.updateSubreddit(name, request));
    }

    @DeleteMapping("/{name}")
    public ResponseEntity<Void> deleteSubreddit(@PathVariable String name) {
        subredditService.deleteSubreddit(name);
        return ResponseEntity.noContent().build();
    }

    // ───── Membership ─────

    @PostMapping("/{name}/join")
    public ResponseEntity<SubredditMemberDto> joinSubreddit(
            @PathVariable String name,
            Authentication authentication
    ) {
        SubredditMemberDto joined = subredditService.joinSubreddit(name, authentication.getName());
        return ResponseEntity.ok(joined);
    }

    @DeleteMapping("/{name}/join")
    public ResponseEntity<Void> leaveSubreddit(
            @PathVariable String name,
            Authentication authentication
    ) {
        subredditService.leaveSubreddit(name, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{name}/moderator/resign")
    public ResponseEntity<Void> resignModeratorRole(
            @PathVariable String name,
            Authentication authentication
    ) {
        subredditService.resignModeratorRole(name, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{name}/takeover-requests")
    public ResponseEntity<Void> requestTakeover(
            @PathVariable String name,
            Authentication authentication
    ) {
        subredditService.requestTakeover(name, authentication.getName());
        return new ResponseEntity<>(HttpStatus.CREATED);
    }

    @GetMapping("/{name}/members")
    public ResponseEntity<List<SubredditMemberDto>> getSubredditMembers(@PathVariable String name) {
        return ResponseEntity.ok(subredditService.getMembers(name));
    }

    @GetMapping("/{name}/is-member/{username}")
    public ResponseEntity<MemberCheckResponse> isMember(
            @PathVariable String name,
            @PathVariable String username
    ) {
        boolean isMember = subredditService.isMember(name, username);
        return ResponseEntity.ok(new MemberCheckResponse(isMember));
    }

    // ───── Rules ─────

    @PostMapping("/{name}/rules")
    public ResponseEntity<SubredditRuleDto> addRule(
            @PathVariable String name,
            @Valid @RequestBody SubredditRuleDto ruleDto
    ) {
        return new ResponseEntity<>(subredditService.addRule(name, ruleDto), HttpStatus.CREATED);
    }

    @PutMapping("/{name}/rules/{ruleId}")
    public ResponseEntity<SubredditRuleDto> updateRule(
            @PathVariable String name,
            @PathVariable Long ruleId,
            @Valid @RequestBody SubredditRuleDto ruleDto
    ) {
        return ResponseEntity.ok(subredditService.updateRule(name, ruleId, ruleDto));
    }

    @DeleteMapping("/{name}/rules/{ruleId}")
    public ResponseEntity<Void> deleteRule(
            @PathVariable String name,
            @PathVariable Long ruleId
    ) {
        subredditService.deleteRule(name, ruleId);
        return ResponseEntity.noContent().build();
    }

    // ───── Flairs ─────

    @PostMapping("/{name}/flairs")
    public ResponseEntity<SubredditDto> addFlair(
            @PathVariable String name,
            @RequestParam String flair
    ) {
        return new ResponseEntity<>(subredditService.addFlair(name, flair), HttpStatus.CREATED);
    }

    @DeleteMapping("/{name}/flairs/{flair}")
    public ResponseEntity<SubredditDto> removeFlair(
            @PathVariable String name,
            @PathVariable String flair
    ) {
        return ResponseEntity.ok(subredditService.removeFlair(name, flair));
    }
}
