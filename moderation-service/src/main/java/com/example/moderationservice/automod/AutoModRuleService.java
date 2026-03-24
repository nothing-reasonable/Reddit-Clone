package com.example.moderationservice.automod;

import com.example.moderationservice.auth.ModeratorAuthService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@Transactional
public class AutoModRuleService {

    private final AutoModRuleRepository repository;
    private final ModeratorAuthService moderatorAuthService;
    private final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());

    public AutoModRuleService(AutoModRuleRepository repository,
                              ModeratorAuthService moderatorAuthService) {
        this.repository = repository;
        this.moderatorAuthService = moderatorAuthService;
    }

    public List<AutoModRule> getRules(String subredditName, String username) {
        moderatorAuthService.requireModerator(subredditName, username);
        return repository.findBySubredditNameOrderByPriorityAsc(subredditName);
    }

    public AutoModRule createRule(String subredditName, AutoModRuleRequest request, String username) {
        moderatorAuthService.requireModerator(subredditName, username);
        validateYaml(request.getYamlContent());

        AutoModRule rule = new AutoModRule();
        rule.setSubredditName(subredditName);
        rule.setName(request.getName());
        rule.setEnabled(request.isEnabled());
        rule.setPriority(request.getPriority());
        rule.setModeratorsExempt(request.isModeratorsExempt());
        rule.setYamlContent(request.getYamlContent());
        rule.setLastEditedBy(username);

        return repository.save(rule);
    }

    public AutoModRule replaceRule(String subredditName, String ruleId,
                                   AutoModRuleRequest request, String username) {
        moderatorAuthService.requireModerator(subredditName, username);
        validateYaml(request.getYamlContent());

        AutoModRule rule = repository.findById(ruleId)
                .orElseThrow(() -> new RuntimeException("Rule not found"));
        rule.setName(request.getName());
        rule.setEnabled(request.isEnabled());
        rule.setPriority(request.getPriority());
        rule.setModeratorsExempt(request.isModeratorsExempt());
        rule.setYamlContent(request.getYamlContent());
        rule.setLastEditedBy(username);

        return repository.save(rule);
    }

    public void toggleRule(String subredditName, String ruleId,
                           boolean enabled, String username) {
        moderatorAuthService.requireModerator(subredditName, username);
        AutoModRule rule = repository.findById(ruleId)
                .orElseThrow(() -> new RuntimeException("Rule not found"));
        rule.setEnabled(enabled);
        rule.setLastEditedBy(username);
        repository.save(rule);
    }

    public void deleteRule(String subredditName, String ruleId, String username) {
        moderatorAuthService.requireModerator(subredditName, username);
        AutoModRule rule = repository.findById(ruleId)
                .orElseThrow(() -> new RuntimeException("Rule not found"));
        repository.delete(rule);
    }

    public List<Map<String, Object>> getParsedRules(String subredditName) {
        return repository.findBySubredditNameOrderByPriorityAsc(subredditName)
                .stream()
                .filter(AutoModRule::isEnabled)
                .map(rule -> {
                    try {
                        return yamlMapper.readValue(rule.getYamlContent(),
                                new TypeReference<Map<String, Object>>() {});
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(r -> r != null)
                .toList();
    }

    private void validateYaml(String yaml) {
        try {
            yamlMapper.readValue(yaml, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid YAML: " + e.getMessage());
        }
    }
}
