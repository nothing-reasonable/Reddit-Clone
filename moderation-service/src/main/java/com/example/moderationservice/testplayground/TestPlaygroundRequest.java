package com.example.moderationservice.testplayground;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

public class TestPlaygroundRequest {

    @NotBlank(message = "subredditName is required")
    private String subredditName;

    @NotBlank(message = "ruleYaml is required")
    private String ruleYaml;

    @Valid
    private TestScenario scenario;

    public String getSubredditName() {
        return subredditName;
    }

    public void setSubredditName(String subredditName) {
        this.subredditName = subredditName;
    }

    public String getRuleYaml() {
        return ruleYaml;
    }

    public void setRuleYaml(String ruleYaml) {
        this.ruleYaml = ruleYaml;
    }

    public TestScenario getScenario() {
        return scenario;
    }

    public void setScenario(TestScenario scenario) {
        this.scenario = scenario;
    }
}
