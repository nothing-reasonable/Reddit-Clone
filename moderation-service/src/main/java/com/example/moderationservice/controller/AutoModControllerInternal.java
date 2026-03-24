package com.example.moderationservice.controller;

import com.example.moderationservice.automod.AutoModRule;
import com.example.moderationservice.automod.AutoModRuleRepository;
import com.example.moderationservice.engine.AutoModContext;
import com.example.moderationservice.engine.AutoModEngine;
import com.example.moderationservice.engine.AutoModResult;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
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
public class AutoModControllerInternal {

    private final AutoModEngine autoModEngine;
    private final AutoModRuleRepository autoModRuleRepository;
    private final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());

    public AutoModControllerInternal(AutoModEngine autoModEngine,
                                     AutoModRuleRepository autoModRuleRepository) {
        this.autoModEngine = autoModEngine;
        this.autoModRuleRepository = autoModRuleRepository;
    }

    /**
     * Evaluate a single AutoMod rule against content context.
     * Called by content-service when a post is created.
     */
    @PostMapping("/evaluate")
    public AutoModEvaluationResponse evaluateRule(@RequestBody AutoModEvaluationRequest request) {
        try {
            Map<String, Object> rule = yamlMapper.readValue(request.getRuleYaml(),
                    new TypeReference<Map<String, Object>>() {});
            AutoModContext context = buildContextFromMap(request.getContext());
            AutoModResult result = autoModEngine.evaluateRule(rule, context);
            return new AutoModEvaluationResponse(result.isTriggered(), result.getAction(), result.getMessage());
        } catch (Exception e) {
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

        public AutoModEvaluationRequest() {}
        public AutoModEvaluationRequest(String ruleYaml, Map<String, Object> context) {
            this.ruleYaml = ruleYaml;
            this.context = context;
        }
        public String getRuleYaml() { return ruleYaml; }
        public void setRuleYaml(String ruleYaml) { this.ruleYaml = ruleYaml; }
        public Map<String, Object> getContext() { return context; }
        public void setContext(Map<String, Object> context) { this.context = context; }
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
