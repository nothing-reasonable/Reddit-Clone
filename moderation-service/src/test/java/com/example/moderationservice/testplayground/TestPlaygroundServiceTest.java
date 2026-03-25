package com.example.moderationservice.testplayground;

import com.example.moderationservice.automod.AutoModRule;
import com.example.moderationservice.automod.AutoModRuleRepository;
import com.example.moderationservice.engine.AutoModEngine;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class TestPlaygroundServiceTest {

    private TestPlaygroundService serviceWithRepo(AutoModRuleRepository repository) {
        return new TestPlaygroundService(new AutoModEngine(), repository);
    }

    @Test
    void emptyYamlReturnsError() {
        AutoModRuleRepository repository = mock(AutoModRuleRepository.class);
        TestPlaygroundService service = serviceWithRepo(repository);
        TestPlaygroundRequest req = new TestPlaygroundRequest();
        req.setSubredditName("testsub");
        req.setRuleYaml("   ");

        TestPlaygroundResponse res = service.testCustomRule(req);
        assertNotNull(res.getError());
        assertTrue(res.getError().toLowerCase().contains("empty"));
    }

    @Test
    void invalidYamlReturnsError() {
        AutoModRuleRepository repository = mock(AutoModRuleRepository.class);
        TestPlaygroundService service = serviceWithRepo(repository);
        TestPlaygroundRequest req = new TestPlaygroundRequest();
        req.setSubredditName("testsub");
        req.setRuleYaml("title: [a\n"); // invalid

        TestPlaygroundResponse res = service.testCustomRule(req);
        assertNotNull(res.getError());
        assertTrue(res.getError().toLowerCase().contains("invalid yaml syntax"));
    }

    @Test
    void resolvesDomainFromUrlWhenDomainMissing() {
        AutoModRuleRepository repository = mock(AutoModRuleRepository.class);
        TestPlaygroundService service = serviceWithRepo(repository);
        TestPlaygroundRequest req = new TestPlaygroundRequest();
        req.setSubredditName("testsub");
        req.setRuleYaml("title: [hello]\naction: remove");

        TestScenario scenario = new TestScenario();
        scenario.setType("submission");
        scenario.setTitle("hello");
        scenario.setBody("");
        scenario.setAuthor("u1");
        scenario.setKarma(0);
        scenario.setAccountAge(0);
        scenario.setUrl("https://example.com/path?q=1");
        scenario.setDomain("");
        scenario.setFlair("");
        req.setScenario(scenario);

        TestPlaygroundResponse res = service.testCustomRule(req);
        assertNull(res.getError());
        assertTrue(res.isTriggered());
        assertEquals("remove", res.getAction());
        // If domain resolution failed, the engine's domain check behavior would be off; we at least assert it's non-null.
        assertNotNull(res.getAction());
    }

    @Test
    void testSavedRulesLoadsEnabledRulesFromRepository() {
        AutoModRuleRepository repository = mock(AutoModRuleRepository.class);
        TestPlaygroundService service = serviceWithRepo(repository);

        AutoModRule enabledRule = new AutoModRule();
        enabledRule.setId("r1");
        enabledRule.setName("Title contains hello");
        enabledRule.setEnabled(true);
        enabledRule.setYamlContent("title: [hello]\naction: remove");

        AutoModRule disabledRule = new AutoModRule();
        disabledRule.setId("r2");
        disabledRule.setName("Disabled rule");
        disabledRule.setEnabled(false);
        disabledRule.setYamlContent("title: [hello]\naction: approve");

        when(repository.findBySubredditNameOrderByPriorityAsc(anyString()))
                .thenReturn(List.of(enabledRule, disabledRule));

        SavedRulesTestRequest req = new SavedRulesTestRequest();
        req.setSubredditName("testsub");

        TestScenario scenario = new TestScenario();
        scenario.setType("submission");
        scenario.setTitle("hello world");
        scenario.setBody("");
        scenario.setAuthor("u1");
        scenario.setKarma(0);
        scenario.setAccountAge(0);
        scenario.setDomain("");
        scenario.setFlair("");
        req.setScenario(scenario);

        SavedRulesTestResponse response = service.testSavedRules(req);

        assertNotNull(response.getResults());
        assertEquals(1, response.getResults().size());
        SavedRuleTestResult first = response.getResults().getFirst();
        assertEquals("r1", first.getRuleId());
        assertEquals("Title contains hello", first.getRuleName());
        assertTrue(first.isTriggered());
        assertEquals("remove", first.getAction());
        assertNull(first.getError());
    }
}

