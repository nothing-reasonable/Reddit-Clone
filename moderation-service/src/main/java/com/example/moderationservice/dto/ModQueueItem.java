package com.example.moderationservice.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class ModQueueItem {
    private String id;
    private String postId; // For comments, this is the parent post ID
    private String type; // post, comment, user
    private String status; // pending, approved, removed
    private String flagReason;
    private int reportCount;
    private List<ReportDto> reports;
    
    // Additional helpful field for UI to display the flagged content
    private String contentTitle;
    private String contentBody;
    private String author;

    @Data
    @Builder
    public static class ReportDto {
        private String reporter;
        private String reason;
    }
}
