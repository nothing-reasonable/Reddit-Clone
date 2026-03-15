package com.example.moderationservice.testplayground;

public class TestPlaygroundRequest {
    private String ruleYaml;
    private TestScenario scenario;

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
