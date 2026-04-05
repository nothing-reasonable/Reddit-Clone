package com.example.moderationservice.engine;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class AutoModEngineTest {

    private static AutoModContext baseContext() {
        AutoModContext ctx = new AutoModContext();
        ctx.setType("submission");
        ctx.setTitle("Hello world");
        ctx.setBody("This is a body with cats and DOGS.");
        ctx.setAuthor("TestUser");
        ctx.setKarma(100);
        ctx.setPostKarma(10);
        ctx.setCommentKarma(20);
        ctx.setAccountAge(30); // days
        ctx.setDomain("example.com");
        ctx.setUrl("https://example.com/x");
        ctx.setFlair("Discussion");
        ctx.setFlairCssClass("discussion");
        ctx.setReports(0);
        ctx.setIsEdited(false);
        ctx.setIsTopLevel(true);
        ctx.setIsModerator(false);
        ctx.setId("t3_abc123");
        ctx.setSubreddit("testsub");
        ctx.setPermalink("https://example.com/r/testsub/t3_abc123");
        return ctx;
    }

    @Test
    void moderatorsExempt_defaultsToBypassForMods() {
        AutoModEngine engine = new AutoModEngine();
        AutoModContext ctx = baseContext();
        ctx.setIsModerator(true);

        Map<String, Object> rule = Map.of(
                "title", List.of("hello"),
                "action", "remove"
        );

        AutoModResult res = engine.evaluateRule(rule, ctx);
        assertFalse(res.isTriggered());
    }

    @Test
    void moderatorsExempt_falseAllowsRuleToTrigger() {
        AutoModEngine engine = new AutoModEngine();
        AutoModContext ctx = baseContext();
        ctx.setIsModerator(true);

        Map<String, Object> rule = Map.of(
                "moderators_exempt", false,
                "title", List.of("hello"),
                "action", "remove"
        );

        AutoModResult res = engine.evaluateRule(rule, ctx);
        assertTrue(res.isTriggered());
        assertEquals("remove", res.getAction());
    }

    @Test
    void actionMapping_filterMapsToFlag_perGuideline() {
        AutoModEngine engine = new AutoModEngine();
        AutoModContext ctx = baseContext();

        Map<String, Object> rule = Map.of(
                "title", List.of("hello"),
                "action", "filter"
        );

        AutoModResult res = engine.evaluateRule(rule, ctx);
        assertTrue(res.isTriggered());
        assertEquals("flag", res.getAction());
    }

    @Test
    void messagePriority_messageThenCommentThenModmail() {
        AutoModEngine engine = new AutoModEngine();
        AutoModContext ctx = baseContext();

        Map<String, Object> rule = Map.of(
                "title", List.of("hello"),
                "action", "remove",
                "modmail", "modmail {{author}}",
                "comment", "comment {{author}}",
                "message", "message {{author}}"
        );

        AutoModResult res = engine.evaluateRule(rule, ctx);
        assertTrue(res.isTriggered());
        assertEquals("message TestUser", res.getMessage());
    }

        @Test
        void modmailSubject_isExposedWithPlaceholderReplacement() {
                AutoModEngine engine = new AutoModEngine();
                AutoModContext ctx = baseContext();

                Map<String, Object> rule = Map.of(
                                "title", List.of("hello"),
                                "action", "filter",
                                "modmail", "body for {{author}}",
                                "modmail_subject", "AutoMod Alert: {{title}}"
                );

                AutoModResult res = engine.evaluateRule(rule, ctx);
                assertTrue(res.isTriggered());
                assertEquals("AutoMod Alert: Hello world", res.getSubject());
        }

    @Test
    void placeholderReplacement_basicFields() {
        AutoModEngine engine = new AutoModEngine();
        AutoModContext ctx = baseContext();

        Map<String, Object> rule = Map.of(
                "title", List.of("hello"),
                "action", "remove",
                "message", "u/{{author}} in r/{{subreddit}}: {{title}} ({{domain}}) {{permalink}}"
        );

        AutoModResult res = engine.evaluateRule(rule, ctx);
        assertTrue(res.isTriggered());
        assertEquals("u/TestUser in r/testsub: Hello world (example.com) https://example.com/r/testsub/t3_abc123", res.getMessage());
    }

    @Test
    void defaultIncludesWord_matchesWordBoundary() {
        AutoModEngine engine = new AutoModEngine();
        AutoModContext ctx = baseContext();
        ctx.setTitle("category");

        Map<String, Object> rule = Map.of(
                "title", List.of("cat"),
                "action", "remove"
        );

        AutoModResult res = engine.evaluateRule(rule, ctx);
        assertFalse(res.isTriggered(), "includes-word should not match inside 'category'");
    }

    @Test
    void includesModifier_allowsSubstringMatch() {
        AutoModEngine engine = new AutoModEngine();
        AutoModContext ctx = baseContext();
        ctx.setTitle("category");

        Map<String, Object> rule = Map.of(
                "title(includes)", List.of("cat"),
                "action", "remove"
        );

        AutoModResult res = engine.evaluateRule(rule, ctx);
        assertTrue(res.isTriggered());
    }

    @Test
    void regexModifier_worksAndIsCaseInsensitiveByDefault() {
        AutoModEngine engine = new AutoModEngine();
        AutoModContext ctx = baseContext();

        Map<String, Object> rule = Map.of(
                "body(regex)", List.of("dogs"),
                "action", "remove"
        );

        AutoModResult res = engine.evaluateRule(rule, ctx);
        assertTrue(res.isTriggered());
    }

    @Test
    void caseSensitiveModifier_enforced() {
        AutoModEngine engine = new AutoModEngine();
        AutoModContext ctx = baseContext();

        Map<String, Object> rule = Map.of(
                "body(case-sensitive, includes)", List.of("dogs"),
                "action", "remove"
        );

        AutoModResult res = engine.evaluateRule(rule, ctx);
        assertFalse(res.isTriggered(), "Body contains 'DOGS' not 'dogs' with case-sensitive match");
    }

    @Test
    void negationKey_invertsMatch() {
        AutoModEngine engine = new AutoModEngine();
        AutoModContext ctx = baseContext();

        Map<String, Object> rule = Map.of(
                "~title", List.of("hello"),
                "action", "remove"
        );

        AutoModResult res = engine.evaluateRule(rule, ctx);
        assertFalse(res.isTriggered(), "Negated match should fail when title matches");
    }

    @Test
    void numericThresholds_workForReportsAndKarma() {
        AutoModEngine engine = new AutoModEngine();
        AutoModContext ctx = baseContext();
        ctx.setReports(5);
        ctx.setCommentKarma(9);

        Map<String, Object> rule = Map.of(
                "reports", 5,
                "author", Map.of("comment_karma", "< 10"),
                "action", "remove"
        );

        AutoModResult res = engine.evaluateRule(rule, ctx);
        assertTrue(res.isTriggered());
    }

    @Test
    void authorSatisfyAnyThreshold_trueRequiresAtLeastOneThresholdMatch() {
        AutoModEngine engine = new AutoModEngine();
        AutoModContext ctx = baseContext();
        ctx.setAccountAge(100);
        ctx.setCommentKarma(100);

        Map<String, Object> rule = Map.of(
                "author", Map.of(
                        "satisfy_any_threshold", true,
                        "account_age", "< 7 days",
                        "comment_karma", "< 10"
                ),
                "action", "remove"
        );

        AutoModResult res = engine.evaluateRule(rule, ctx);
        assertFalse(res.isTriggered(), "No thresholds matched, so author block should fail");
    }

    @Test
    void typeCondition_linkSubmission_requiresUrl() {
        AutoModEngine engine = new AutoModEngine();
        AutoModContext ctx = baseContext();
        ctx.setType("submission");
        ctx.setUrl("");

        Map<String, Object> rule = Map.of(
                "type", "link submission",
                "title", List.of("hello"),
                "action", "remove"
        );

        AutoModResult res = engine.evaluateRule(rule, ctx);
        assertFalse(res.isTriggered());
    }

    @Test
    void ignoreBlockquotes_excludesQuotedLinesFromLength() {
        AutoModEngine engine = new AutoModEngine();
        AutoModContext ctx = baseContext();
        ctx.setBody("> quoted line only");

        Map<String, Object> rule = Map.of(
                "ignore_blockquotes", true,
                "body_longer_than", 5,
                "action", "remove"
        );

        AutoModResult res = engine.evaluateRule(rule, ctx);
        assertFalse(res.isTriggered(), "Ignoring blockquotes should make effective body length 0");
    }

    @Test
    void parentSubmission_conditionsMatchAgainstParentFields() {
        AutoModEngine engine = new AutoModEngine();
        AutoModContext ctx = baseContext();
        ctx.setType("comment");
        ctx.setParentSubmission(Map.of(
                "title", "Parent Hello Post",
                "domain", "example.com"
        ));

        Map<String, Object> rule = Map.of(
                "type", "comment",
                "parent_submission", Map.of(
                        "title", List.of("hello"),
                        "domain", List.of("example.com")
                ),
                "action", "remove"
        );

        AutoModResult res = engine.evaluateRule(rule, ctx);
        assertTrue(res.isTriggered());
    }

    @Test
    void mediaFields_supportChecksAndPlaceholders() {
        AutoModEngine engine = new AutoModEngine();
        AutoModContext ctx = baseContext();
        ctx.setMediaAuthor("VideoUser");
        ctx.setMediaAuthorUrl("https://videos.example.com/u/VideoUser");
        ctx.setMediaTitle("My Great Video");
        ctx.setMediaDescription("Some description");

        Map<String, Object> rule = Map.of(
                "media_author", List.of("VideoUser"),
                "media_title", List.of("great"),
                "media_author_url(includes)", List.of("videos.example.com"),
                "action", "approve",
                "message", "Author: {{media_author}} / {{media_author_url}} / {{media_title}}"
        );

        AutoModResult res = engine.evaluateRule(rule, ctx);
        assertTrue(res.isTriggered());
        assertEquals("Author: VideoUser / https://videos.example.com/u/VideoUser / My Great Video", res.getMessage());
    }

    @Test
    void authorFlags_isContributorSubmitterGold_respected() {
        AutoModEngine engine = new AutoModEngine();
        AutoModContext ctx = baseContext();
        ctx.setIsContributor(true);
        ctx.setIsSubmitter(true);
        ctx.setIsGold(true);

        Map<String, Object> rule = Map.of(
                "author", Map.of(
                        "is_contributor", true,
                        "is_submitter", true,
                        "is_gold", true
                ),
                "action", "approve"
        );

        AutoModResult res = engine.evaluateRule(rule, ctx);
        assertTrue(res.isTriggered());
        assertEquals("approve", res.getAction());
    }
}

