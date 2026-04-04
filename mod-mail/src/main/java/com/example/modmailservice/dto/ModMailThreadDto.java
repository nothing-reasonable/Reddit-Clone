package com.example.modmailservice.dto;

import java.time.OffsetDateTime;

public class ModMailThreadDto {

    private Long id;
    private String subredditName;
    private String username;
    private String subject;
    private String status;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private boolean unread;
    private String lastMessagePreview;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSubredditName() { return subredditName; }
    public void setSubredditName(String subredditName) { this.subredditName = subredditName; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public boolean isUnread() { return unread; }
    public void setUnread(boolean unread) { this.unread = unread; }

    public String getLastMessagePreview() { return lastMessagePreview; }
    public void setLastMessagePreview(String lastMessagePreview) { this.lastMessagePreview = lastMessagePreview; }
}
