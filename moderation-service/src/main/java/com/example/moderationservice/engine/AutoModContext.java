package com.example.moderationservice.engine;

import java.util.Map;

public class AutoModContext {
    private String type;
    private String id;
    private String url;
    private String title;
    private String body;
    private String author;
    private String subreddit;
    private String permalink;
    private Integer karma;
    private Integer postKarma;
    private Integer commentKarma;
    private Integer accountAge;
    private String domain;
    private String flair;
    private String flairCssClass;
    private Integer reports;
    private Boolean isEdited;
    private Boolean isTopLevel;
    private Boolean isModerator;
    private Map<String, Object> parentSubmission;
    private Map<String, Object> mediaEmbed;
    private Map<String, Object> secureMediaEmbed;

    // Getters and Setters
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
    public String getSubreddit() { return subreddit; }
    public void setSubreddit(String subreddit) { this.subreddit = subreddit; }
    public String getPermalink() { return permalink; }
    public void setPermalink(String permalink) { this.permalink = permalink; }
    public Integer getKarma() { return karma; }
    public void setKarma(Integer karma) { this.karma = karma; }
    public Integer getPostKarma() { return postKarma; }
    public void setPostKarma(Integer postKarma) { this.postKarma = postKarma; }
    public Integer getCommentKarma() { return commentKarma; }
    public void setCommentKarma(Integer commentKarma) { this.commentKarma = commentKarma; }
    public Integer getAccountAge() { return accountAge; }
    public void setAccountAge(Integer accountAge) { this.accountAge = accountAge; }
    public String getDomain() { return domain; }
    public void setDomain(String domain) { this.domain = domain; }
    public String getFlair() { return flair; }
    public void setFlair(String flair) { this.flair = flair; }
    public String getFlairCssClass() { return flairCssClass; }
    public void setFlairCssClass(String flairCssClass) { this.flairCssClass = flairCssClass; }
    public Integer getReports() { return reports; }
    public void setReports(Integer reports) { this.reports = reports; }
    public Boolean getIsEdited() { return isEdited; }
    public void setIsEdited(Boolean isEdited) { this.isEdited = isEdited; }
    public Boolean getIsTopLevel() { return isTopLevel; }
    public void setIsTopLevel(Boolean isTopLevel) { this.isTopLevel = isTopLevel; }
    public Boolean getIsModerator() { return isModerator; }
    public void setIsModerator(Boolean isModerator) { this.isModerator = isModerator; }
    public Map<String, Object> getParentSubmission() { return parentSubmission; }
    public void setParentSubmission(Map<String, Object> parentSubmission) { this.parentSubmission = parentSubmission; }
    public Map<String, Object> getMediaEmbed() { return mediaEmbed; }
    public void setMediaEmbed(Map<String, Object> mediaEmbed) { this.mediaEmbed = mediaEmbed; }
    public Map<String, Object> getSecureMediaEmbed() { return secureMediaEmbed; }
    public void setSecureMediaEmbed(Map<String, Object> secureMediaEmbed) { this.secureMediaEmbed = secureMediaEmbed; }
}
