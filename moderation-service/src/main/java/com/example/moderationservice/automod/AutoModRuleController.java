package com.example.moderationservice.automod;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/r/{subreddit}/automod", "/r/{subreddit}/automod"})
public class AutoModRuleController {

    private final AutoModRuleService service;

    public AutoModRuleController(AutoModRuleService service) {
        this.service = service;
    }

    @GetMapping("/rules")
    public ResponseEntity<Map<String, Object>> listRules(
            @PathVariable String subreddit,
            @AuthenticationPrincipal String username) {
        List<AutoModRule> rules = service.getRules(subreddit, username);
        return ResponseEntity.ok(Map.of("data", rules));
    }

    @GetMapping("/history")
    public ResponseEntity<AutoModHistoryResponse> getHistory(
            @PathVariable String subreddit,
            @AuthenticationPrincipal String username) {
        return ResponseEntity.ok(service.getHistory(subreddit, username));
    }

    @PostMapping("/rules")
    public ResponseEntity<AutoModRule> createRule(
            @PathVariable String subreddit,
            @Valid @RequestBody AutoModRuleRequest request,
            @AuthenticationPrincipal String username) {
        AutoModRule rule = service.createRule(subreddit, request, username);
        return ResponseEntity.status(HttpStatus.CREATED).body(rule);
    }

    @PutMapping("/rules/{ruleId}")
    public ResponseEntity<AutoModRule> replaceRule(
            @PathVariable String subreddit,
            @PathVariable String ruleId,
            @Valid @RequestBody AutoModRuleRequest request,
            @AuthenticationPrincipal String username) {
        AutoModRule rule = service.replaceRule(subreddit, ruleId, request, username);
        return ResponseEntity.ok(rule);
    }

    @PatchMapping("/rules/{ruleId}")
    public ResponseEntity<Void> toggleRule(
            @PathVariable String subreddit,
            @PathVariable String ruleId,
            @RequestBody Map<String, Boolean> body,
            @AuthenticationPrincipal String username) {
        service.toggleRule(subreddit, ruleId, body.get("enabled"), username);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/rules/{ruleId}")
    public ResponseEntity<Void> deleteRule(
            @PathVariable String subreddit,
            @PathVariable String ruleId,
            @AuthenticationPrincipal String username) {
        service.deleteRule(subreddit, ruleId, username);
        return ResponseEntity.noContent().build();
    }
}
