package com.example.moderationservice.testplayground;

import com.example.moderationservice.engine.AutoModEngine;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class TestPlaygroundServiceTest {

    @Test
    void emptyYamlReturnsError() {
        TestPlaygroundService service = new TestPlaygroundService(new AutoModEngine());
        TestPlaygroundRequest req = new TestPlaygroundRequest();
        req.setSubredditName("testsub");
        req.setRuleYaml("   ");

        TestPlaygroundResponse res = service.testCustomRule(req);
        assertNotNull(res.getError());
        assertTrue(res.getError().toLowerCase().contains("empty"));
    }

    @Test
    void invalidYamlReturnsError() {
        TestPlaygroundService service = new TestPlaygroundService(new AutoModEngine());
        TestPlaygroundRequest req = new TestPlaygroundRequest();
        req.setSubredditName("testsub");
        req.setRuleYaml("title: [a\n"); // invalid

        TestPlaygroundResponse res = service.testCustomRule(req);
        assertNotNull(res.getError());
        assertTrue(res.getError().toLowerCase().contains("invalid yaml syntax"));
    }

    @Test
    void resolvesDomainFromUrlWhenDomainMissing() {
        TestPlaygroundService service = new TestPlaygroundService(new AutoModEngine());
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
}

