package com.example.modmailservice.dto;

import java.time.LocalDateTime;

public class ConversationDto {

    private Long id;
    private String otherUser;
    private String username;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String lastMessagePreview;
    private boolean unread;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOtherUser() { return otherUser; }
    public void setOtherUser(String otherUser) { this.otherUser = otherUser; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getLastMessagePreview() { return lastMessagePreview; }
    public void setLastMessagePreview(String lastMessagePreview) { this.lastMessagePreview = lastMessagePreview; }

    public boolean isUnread() { return unread; }
    public void setUnread(boolean unread) { this.unread = unread; }
}
