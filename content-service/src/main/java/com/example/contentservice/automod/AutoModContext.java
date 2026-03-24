package com.example.contentservice.automod;

import java.util.HashMap;
import java.util.Map;

/**
 * Context for AutoMod rule evaluation.
 * Contains submission/post data to be evaluated against AutoMod rules.
 */
public class AutoModContext {
    private String title;
    private String body;
    private String domain;
    private String author;
    private String authorAccountAge; // e.g., "5 days", "30 days"
    private int authorKarma;
    private String submissionType; // "submission" or "comment"
    private boolean isModerator = false;
    private String flairText;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public String getDomain() { return domain; }
    public void setDomain(String domain) { this.domain = domain; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public String getAuthorAccountAge() { return authorAccountAge; }
    public void setAuthorAccountAge(String authorAccountAge) { this.authorAccountAge = authorAccountAge; }

    public int getAuthorKarma() { return authorKarma; }
    public void setAuthorKarma(int authorKarma) { this.authorKarma = authorKarma; }

    public String getSubmissionType() { return submissionType; }
    public void setSubmissionType(String submissionType) { this.submissionType = submissionType; }

    public boolean getIsModerator() { return isModerator; }
    public void setIsModerator(boolean isModerator) { this.isModerator = isModerator; }

    public String getFlairText() { return flairText; }
    public void setFlairText(String flairText) { this.flairText = flairText; }

    /**
     * Convert to Map for sending to moderation-service internal API.
     */
    public Map<String, Object> toMap() {
        Map<String, Object> map = new HashMap<>();
        if (title != null)            map.put("title", title);
        if (body != null)             map.put("body", body);
        if (domain != null)           map.put("domain", domain);
        if (author != null)           map.put("author", author);
        // Send account age as integer days for consistent parsing
        if (authorAccountAge != null) {
            try {
                String[] parts = authorAccountAge.trim().split(" ");
                int days = Integer.parseInt(parts[0]);
                if (parts.length > 1 && parts[1].startsWith("month")) days *= 30;
                else if (parts.length > 1 && parts[1].startsWith("year")) days *= 365;
                else if (parts.length > 1 && parts[1].startsWith("week")) days *= 7;
                map.put("author_account_age", days);
            } catch (Exception e) {
                map.put("author_account_age", 30); // default
            }
        }
        if (authorKarma > 0)          map.put("author_karma", authorKarma);
        if (submissionType != null)   map.put("type", submissionType);
        if (flairText != null)        map.put("flair_text", flairText);
        map.put("is_moderator", isModerator);
        return map;
    }
}
