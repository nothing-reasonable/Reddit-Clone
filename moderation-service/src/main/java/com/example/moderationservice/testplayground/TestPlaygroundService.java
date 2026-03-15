package com.example.moderationservice.testplayground;

import com.example.moderationservice.engine.AutoModEngine;
import com.example.moderationservice.engine.AutoModContext;
import com.example.moderationservice.engine.AutoModResult;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.Map;

@Service
public class TestPlaygroundService {

    private final ObjectMapper mapper = new ObjectMapper(new YAMLFactory());
    private final AutoModEngine autoModEngine;

    public TestPlaygroundService(AutoModEngine autoModEngine) {
        this.autoModEngine = autoModEngine;
    }

    public TestPlaygroundResponse testCustomRule(TestPlaygroundRequest request) {
        TestPlaygroundResponse response = new TestPlaygroundResponse();
        
        if (request.getRuleYaml() == null || request.getRuleYaml().trim().isEmpty()) {
            response.setError("Rule YAML is empty");
            return response;
        }

        try {
            Map<String, Object> rule = mapper.readValue(request.getRuleYaml(), new TypeReference<Map<String, Object>>() {});
            if (rule == null) {
                response.setError("Invalid YAML");
                return response;
            }

            AutoModContext context = convertToEngineContext(request.getScenario(), request.getSubredditName());
            AutoModResult engineResult = autoModEngine.evaluateRule(rule, context);

            response.setTriggered(engineResult.isTriggered());
            response.setAction(engineResult.getAction());
            response.setMessage(engineResult.getMessage());
            
        } catch (JsonProcessingException e) {
            response.setError("Invalid YAML syntax: " + e.getMessage());
        } catch (Exception e) {
            response.setError("Error evaluating rule: " + e.getMessage());
        }

        return response;
    }

    private AutoModContext convertToEngineContext(TestScenario scenario, String subredditName) {
        AutoModContext context = new AutoModContext();
        context.setSubreddit(subredditName);
        if (scenario != null) {
            context.setType(scenario.getType());
            context.setId(scenario.getId());
            context.setUrl(scenario.getUrl());
            context.setTitle(scenario.getTitle());
            context.setBody(scenario.getBody());
            context.setAuthor(scenario.getAuthor());
            if (scenario.getSubreddit() != null && !scenario.getSubreddit().isBlank()) {
                context.setSubreddit(scenario.getSubreddit());
            }
            context.setPermalink(scenario.getPermalink() != null ? scenario.getPermalink() : scenario.getUrl());
            context.setKarma(scenario.getKarma());
            context.setPostKarma(scenario.getPostKarma());
            context.setCommentKarma(scenario.getCommentKarma());
            context.setAccountAge(scenario.getAccountAge());
            context.setDomain(resolveDomain(scenario.getDomain(), scenario.getUrl()));
            context.setFlair(scenario.getFlair());
            context.setFlairCssClass(scenario.getFlairCssClass());
            context.setReports(scenario.getReports());
            context.setIsEdited(scenario.getIsEdited());
            context.setIsTopLevel(scenario.getIsTopLevel());
            context.setIsModerator(scenario.getIsModerator());
            context.setParentSubmission(scenario.getParentSubmission());
            context.setMediaEmbed(scenario.getMediaEmbed());
            context.setSecureMediaEmbed(scenario.getSecureMediaEmbed());
        } else {
            context.setTitle("");
            context.setBody("");
            context.setDomain("");
            context.setFlair("");
        }
        return context;
    }

    private String resolveDomain(String explicitDomain, String url) {
        if (explicitDomain != null && !explicitDomain.isBlank()) {
            return explicitDomain;
        }

        if (url == null || url.isBlank()) {
            return "";
        }

        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            return host != null ? host : url;
        } catch (IllegalArgumentException ex) {
            return url;
        }
    }
}
