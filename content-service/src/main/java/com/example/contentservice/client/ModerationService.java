package com.example.contentservice.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for calling moderation-service internal endpoints.
 * Uses RestTemplate for simplicity (no Feign dependency required).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ModerationService {

    @Value("${services.moderation.base-url:http://moderation-service:8084}")
    private String moderationServiceUrl;

    private static final String EVALUATE_ENDPOINT = "/api/internal/automod/evaluate";
    private static final String RULES_ENDPOINT    = "/api/internal/automod/rules/{subreddit}";

    private final RestTemplate restTemplate;

    /**
     * Get all enabled AutoMod rules for a subreddit.
     */
    public List<RuleDto> getRulesForSubreddit(String subreddit) {
        log.info("Getting AutoMod rules for subreddit: {}", subreddit);
        try {
            String url = moderationServiceUrl + RULES_ENDPOINT.replace("{subreddit}", subreddit);
            RuleDto[] rules = restTemplate.getForObject(url, RuleDto[].class);
            if (rules != null) {
                log.info("Retrieved {} rules for r/{}", rules.length, subreddit);
                return List.of(rules);
            }
            return List.of();
        } catch (RestClientException e) {
            log.warn("Failed to get AutoMod rules from moderation-service: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Evaluate a single AutoMod rule against content context.
     */
    public AutoModEvaluationResponse evaluateRule(String ruleYaml, Map<String, Object> context) {
        return evaluateRule(ruleYaml, context, null, null, null);
    }

    /**
     * Evaluate a single AutoMod rule against content context with rule metadata for logging.
     */
    public AutoModEvaluationResponse evaluateRule(String ruleYaml, Map<String, Object> context,
                                                  String ruleId, String ruleName, String subreddit) {
        log.debug("Evaluating AutoMod rule: {} from r/{}", ruleName, subreddit);
        try {
            String url = moderationServiceUrl + EVALUATE_ENDPOINT;

            Map<String, Object> request = new HashMap<>();
            request.put("ruleYaml", ruleYaml);
            request.put("context", context);
            if (ruleId != null) request.put("ruleId", ruleId);
            if (ruleName != null) request.put("ruleName", ruleName);
            if (subreddit != null) request.put("subredditName", subreddit);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            AutoModEvaluationResponse response = restTemplate.postForObject(url, entity, AutoModEvaluationResponse.class);

            log.debug("AutoMod rule evaluation result: triggered={}", response != null ? response.isTriggered() : "null");
            return response != null ? response : new AutoModEvaluationResponse(false, "none", "");
        } catch (RestClientException e) {
            log.warn("Failed to evaluate AutoMod rule: {}", e.getMessage());
            return new AutoModEvaluationResponse(false, "error", "Rule evaluation failed");
        }
    }

    // ─── DTOs ────────────────────────────────────────────────────────────────

    public static class RuleDto {
        private String id;
        private String name;
        private String yamlContent;

        public RuleDto() {}
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getYamlContent() { return yamlContent; }
        public void setYamlContent(String yamlContent) { this.yamlContent = yamlContent; }
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
}
