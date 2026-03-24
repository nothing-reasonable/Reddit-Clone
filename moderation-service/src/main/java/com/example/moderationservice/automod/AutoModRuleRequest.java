package com.example.moderationservice.automod;

import jakarta.validation.constraints.NotBlank;

public class AutoModRuleRequest {

    @NotBlank
    private String name;
    private boolean enabled = true;
    private int priority = 0;
    private boolean moderatorsExempt = false;

    @NotBlank
    private String yamlContent;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }
    public boolean isModeratorsExempt() { return moderatorsExempt; }
    public void setModeratorsExempt(boolean moderatorsExempt) { this.moderatorsExempt = moderatorsExempt; }
    public String getYamlContent() { return yamlContent; }
    public void setYamlContent(String yamlContent) { this.yamlContent = yamlContent; }
}
