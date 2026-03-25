package com.example.moderationservice.controller;

import com.example.moderationservice.automod.AutoModLogService;
import com.example.moderationservice.automod.AutoModRule;
import com.example.moderationservice.automod.AutoModRuleRepository;
import com.example.moderationservice.engine.AutoModContext;
import com.example.moderationservice.engine.AutoModEngine;
import com.example.moderationservice.engine.AutoModResult;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Internal endpoints for moderation-service.
 * Service-to-service only — no authentication required.
 * Called by content-service when a post or comment is created.
 */
@RestController
@RequestMapping("/api/internal/automod")
@Slf4j
public class AutoModControllerInternal {

    private final AutoModEngine autoModEngine;
    private final AutoModRuleRepository autoModRuleRepository;
    private final AutoModLogService autoModLogService;
    private final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());

    public AutoModControllerInternal(AutoModEngine autoModEngine,
                                     AutoModRuleRepository autoModRuleRepository,
                                     AutoModLogService autoModLogService) {
        this.autoModEngine = autoModEngine;
        this.autoModRuleRepository = autoModRuleRepository;
        this.autoModLogService = autoModLogService;
    }

    /**
     * Evaluate a single AutoMod rule against content context.
     * Called by content-service when a post is created.
     * If the rule triggers and includes rule metadata, logs the action.
     */
    @PostMapping("/evaluate")
    public AutoModEvaluationResponse evaluateRule(@RequestBody AutoModEvaluationRequest request) {
        try {
            Map<String, Object> rule = yamlMapper.readValue(request.getRuleYaml(),
                    new TypeReference<Map<String, Object>>() {});
            AutoModContext context = buildContextFromMap(request.getContext());
            AutoModResult result = autoModEngine.evaluateRule(rule, context);

            // Log the action if the rule was triggered and we have rule metadata
            if (result.isTriggered() && request.getRuleId() != null && request.getSubredditName() != null) {
                log.info("AutoMod rule triggered: {} in r/{}, action: {}", 
                    request.getRuleName(), request.getSubredditName(), result.getAction());
                
                // Extract context details for logging
                String targetType = context.getType() != null ? 
                    (context.getType().toLowerCase().contains("comment") ? "comment" : "post") : "post";
                String targetId = context.getId() != null ? context.getId() : "unknown";
                String targetAuthor = context.getAuthor() != null ? context.getAuthor() : "unknown";
                String reason = result.getMessage() != null ? result.getMessage() : 
                    (request.getRuleName() != null ? request.getRuleName() : "AutoMod rule triggered");

                // Log the action persistently
                autoModLogService.logAction(
                    request.getSubredditName(),
                    request.getRuleId(),
                    request.getRuleName(),
                    result.getAction(),
                    targetType,
                    targetId,
                    targetAuthor,
                    reason
                );
            }

            return new AutoModEvaluationResponse(result.isTriggered(), result.getAction(), result.getMessage());
        } catch (Exception e) {
            log.error("Error evaluating AutoMod rule: {}", e.getMessage());
            return new AutoModEvaluationResponse(false, "error", "Rule evaluation failed: " + e.getMessage());
        }
    }

    /**
     * Get all enabled AutoMod rules for a subreddit with their YAML content.
     * Called by content-service to fetch rules for enforcement.
     */
    @GetMapping("/rules/{subreddit}")
    public List<RuleDto> getRulesForSubreddit(@PathVariable String subreddit) {
        try {
            List<AutoModRule> rules = autoModRuleRepository
                    .findBySubredditNameOrderByPriorityAsc(subreddit)
                    .stream()
                    .filter(AutoModRule::isEnabled)
                    .toList();
            return rules.stream()
                    .map(rule -> new RuleDto(rule.getId(), rule.getName(), rule.getYamlContent()))
                    .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    /**
     * Build AutoModContext from a Map received from content-service.
     */
    private AutoModContext buildContextFromMap(Map<String, Object> contextMap) {
        AutoModContext context = new AutoModContext();
        if (contextMap.containsKey("title"))
            context.setTitle((String) contextMap.get("title"));
        if (contextMap.containsKey("body"))
            context.setBody((String) contextMap.get("body"));
        if (contextMap.containsKey("domain"))
            context.setDomain((String) contextMap.get("domain"));
        if (contextMap.containsKey("author"))
            context.setAuthor((String) contextMap.get("author"));
        if (contextMap.containsKey("type"))
            context.setType((String) contextMap.get("type"));
        if (contextMap.containsKey("flair_text"))
            context.setFlair((String) contextMap.get("flair_text"));
        if (contextMap.containsKey("subreddit"))
            context.setSubreddit((String) contextMap.get("subreddit"));
        if (contextMap.containsKey("id"))
            context.setId((String) contextMap.get("id"));

        Object karma = contextMap.get("author_karma");
        if (karma instanceof Integer) context.setKarma((Integer) karma);
        else if (karma instanceof Number) context.setKarma(((Number) karma).intValue());

        // author_account_age is sent as integer days from content-service
        Object accountAge = contextMap.get("author_account_age");
        if (accountAge instanceof Integer) context.setAccountAge((Integer) accountAge);
        else if (accountAge instanceof Number) context.setAccountAge(((Number) accountAge).intValue());

        // Parse is_moderator so moderators_exempt logic works correctly
        Object isMod = contextMap.get("is_moderator");
        if (isMod instanceof Boolean) context.setIsModerator((Boolean) isMod);
        else if (isMod instanceof String) context.setIsModerator(Boolean.parseBoolean((String) isMod));

        return context;
    }

    // ─── DTO Classes ──────────────────────────────────────────────────────────

    public static class AutoModEvaluationRequest {
        private String ruleYaml;
        private Map<String, Object> context;
        private String ruleId;        // Rule ID for logging
        private String ruleName;      // Rule name for logging
        private String subredditName; // Subreddit for logging

        public AutoModEvaluationRequest() {}
        public AutoModEvaluationRequest(String ruleYaml, Map<String, Object> context) {
            this.ruleYaml = ruleYaml;
            this.context = context;
        }
        public AutoModEvaluationRequest(String ruleYaml, Map<String, Object> context, 
                                       String ruleId, String ruleName, String subredditName) {
            this.ruleYaml = ruleYaml;
            this.context = context;
            this.ruleId = ruleId;
            this.ruleName = ruleName;
            this.subredditName = subredditName;
        }

        public String getRuleYaml() { return ruleYaml; }
        public void setRuleYaml(String ruleYaml) { this.ruleYaml = ruleYaml; }
        public Map<String, Object> getContext() { return context; }
        public void setContext(Map<String, Object> context) { this.context = context; }
        public String getRuleId() { return ruleId; }
        public void setRuleId(String ruleId) { this.ruleId = ruleId; }
        public String getRuleName() { return ruleName; }
        public void setRuleName(String ruleName) { this.ruleName = ruleName; }
        public String getSubredditName() { return subredditName; }
        public void setSubredditName(String subredditName) { this.subredditName = subredditName; }
    }

    public static class AutoModEvaluationResponse {
        private boolean triggered;
        private String action;
        private String message;

        public AutoModEvaluationResponse() {}
        public AutoModEvaluationResponse(boolean triggered, String action, String message) {
            this.triggered = triggered;
            this.action = action;
            this.message = message;
        }
        public boolean isTriggered() { return triggered; }
        public void setTriggered(boolean triggered) { this.triggered = triggered; }
        public String getAction() { return action; }
        public void setAction(String action) { this.action = action; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }

    public static class RuleDto {
        private String id;
        private String name;
        private String yamlContent;

        public RuleDto() {}
        public RuleDto(String id, String name, String yamlContent) {
            this.id = id;
            this.name = name;
            this.yamlContent = yamlContent;
        }
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getYamlContent() { return yamlContent; }
        public void setYamlContent(String yamlContent) { this.yamlContent = yamlContent; }
    }
}
