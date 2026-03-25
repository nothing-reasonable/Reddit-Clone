package com.example.moderationservice.testplayground;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

public class SavedRulesTestRequest {

    @NotBlank(message = "subredditName is required")
    private String subredditName;

    @Valid
    private TestScenario scenario;

    public String getSubredditName() {
        return subredditName;
    }

    public void setSubredditName(String subredditName) {
        this.subredditName = subredditName;
    }

    public TestScenario getScenario() {
        return scenario;
    }

    public void setScenario(TestScenario scenario) {
        this.scenario = scenario;
    }
}
