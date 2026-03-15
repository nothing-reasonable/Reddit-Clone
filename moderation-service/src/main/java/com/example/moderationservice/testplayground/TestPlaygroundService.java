package com.example.moderationservice.testplayground;

import com.example.moderationservice.engine.AutoModEngine;
import com.example.moderationservice.engine.AutoModContext;
import com.example.moderationservice.engine.AutoModResult;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.stereotype.Service;

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

            AutoModContext context = convertToEngineContext(request.getScenario());
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

    private AutoModContext convertToEngineContext(TestScenario scenario) {
        AutoModContext context = new AutoModContext();
        if (scenario != null) {
            context.setTitle(scenario.getTitle());
            context.setBody(scenario.getBody());
            context.setAuthor(scenario.getAuthor());
            context.setKarma(scenario.getKarma());
            context.setAccountAge(scenario.getAccountAge());
            context.setDomain(scenario.getDomain());
            context.setFlair(scenario.getFlair());
        } else {
            context.setTitle("");
            context.setBody("");
            context.setDomain("");
            context.setFlair("");
        }
        return context;
    }
}
