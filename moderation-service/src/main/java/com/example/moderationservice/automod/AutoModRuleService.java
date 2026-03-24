package com.example.moderationservice.automod;

import com.example.moderationservice.auth.ModeratorAuthService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@Transactional
public class AutoModRuleService {

    private final AutoModRuleRepository repository;
    private final AutoModRuleHistoryRepository historyRepository;
    private final ModeratorAuthService moderatorAuthService;
    private final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
    private final ObjectMapper jsonMapper = new ObjectMapper();

    public AutoModRuleService(AutoModRuleRepository repository,
                              AutoModRuleHistoryRepository historyRepository,
                              ModeratorAuthService moderatorAuthService) {
        this.repository = repository;
        this.historyRepository = historyRepository;
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

        AutoModRule saved = repository.save(rule);
        recordHistory(saved.getSubredditName(), saved.getId(), "created", username, Map.of(
            "name", saved.getName(),
            "enabled", saved.isEnabled(),
            "priority", saved.getPriority(),
            "moderatorsExempt", saved.isModeratorsExempt(),
            "yamlContent", saved.getYamlContent()
        ));
        return saved;
    }

    public AutoModRule replaceRule(String subredditName, String ruleId,
                                   AutoModRuleRequest request, String username) {
        moderatorAuthService.requireModerator(subredditName, username);
        validateYaml(request.getYamlContent());

        AutoModRule rule = getRuleOrThrow(subredditName, ruleId);
        Map<String, Object> before = toRuleSnapshot(rule);
        rule.setName(request.getName());
        rule.setEnabled(request.isEnabled());
        rule.setPriority(request.getPriority());
        rule.setModeratorsExempt(request.isModeratorsExempt());
        rule.setYamlContent(request.getYamlContent());
        rule.setLastEditedBy(username);

        AutoModRule saved = repository.save(rule);
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("before", before);
        changes.put("after", toRuleSnapshot(saved));
        recordHistory(saved.getSubredditName(), saved.getId(), "updated", username, changes);
        return saved;
    }

    public void toggleRule(String subredditName, String ruleId,
                           boolean enabled, String username) {
        moderatorAuthService.requireModerator(subredditName, username);
        AutoModRule rule = getRuleOrThrow(subredditName, ruleId);
        boolean previous = rule.isEnabled();
        rule.setEnabled(enabled);
        rule.setLastEditedBy(username);
        AutoModRule saved = repository.save(rule);

        recordHistory(saved.getSubredditName(), saved.getId(), "toggled", username, Map.of(
            "beforeEnabled", previous,
            "afterEnabled", saved.isEnabled()
        ));
    }

    public void deleteRule(String subredditName, String ruleId, String username) {
        moderatorAuthService.requireModerator(subredditName, username);
        AutoModRule rule = getRuleOrThrow(subredditName, ruleId);
        Map<String, Object> deletedSnapshot = toRuleSnapshot(rule);
        recordHistory(rule.getSubredditName(), rule.getId(), "deleted", username, Map.of("deletedRule", deletedSnapshot));
        repository.delete(rule);
    }

    public AutoModHistoryResponse getHistory(String subredditName, String username) {
        moderatorAuthService.requireModerator(subredditName, username);
        List<AutoModHistoryEntryResponse> data = historyRepository
                .findBySubredditNameOrderByTimestampDesc(subredditName)
                .stream()
                .map(this::toHistoryEntryResponse)
                .toList();
        return new AutoModHistoryResponse(data);
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

    private AutoModRule getRuleOrThrow(String subredditName, String ruleId) {
        return repository.findByIdAndSubredditName(ruleId, subredditName)
                .orElseThrow(() -> new IllegalArgumentException("Rule not found"));
    }

    private Map<String, Object> toRuleSnapshot(AutoModRule rule) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("id", rule.getId());
        snapshot.put("name", rule.getName());
        snapshot.put("enabled", rule.isEnabled());
        snapshot.put("priority", rule.getPriority());
        snapshot.put("moderatorsExempt", rule.isModeratorsExempt());
        snapshot.put("yamlContent", rule.getYamlContent());
        return snapshot;
    }

    private void recordHistory(String subredditName,
                               String ruleId,
                               String action,
                               String moderator,
                               Map<String, Object> changes) {
        AutoModRuleHistory history = new AutoModRuleHistory();
        history.setSubredditName(subredditName);
        history.setRuleId(ruleId);
        history.setAction(action);
        history.setModerator(moderator);
        history.setChangesJson(writeJson(changes));
        historyRepository.save(history);
    }

    private AutoModHistoryEntryResponse toHistoryEntryResponse(AutoModRuleHistory history) {
        return new AutoModHistoryEntryResponse(
                history.getRuleId(),
                history.getAction(),
                history.getModerator(),
                history.getTimestamp(),
                readJsonMap(history.getChangesJson())
        );
    }

    private String writeJson(Map<String, Object> data) {
        try {
            return jsonMapper.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Unable to serialize history changes", e);
        }
    }

    private Map<String, Object> readJsonMap(String data) {
        try {
            return jsonMapper.readValue(data, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return new HashMap<>();
        }
    }
}
