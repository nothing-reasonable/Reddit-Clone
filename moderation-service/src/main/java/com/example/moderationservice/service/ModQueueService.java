package com.example.moderationservice.service;

import com.example.moderationservice.dto.ModQueueActionRequest;
import com.example.moderationservice.dto.ModQueueItem;
import com.example.moderationservice.dto.PageResponse;
import com.example.moderationservice.dto.PostDto;
import com.example.moderationservice.dto.CommentDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ModQueueService {

    private final RestClient restClient;
    private final String contentServiceBaseUrl;

    public ModQueueService(RestClient restClient,
                           @Value("${services.content.base-url:http://localhost:8083}") String contentServiceBaseUrl) {
        this.restClient = restClient;
        this.contentServiceBaseUrl = contentServiceBaseUrl;
    }

    public PageResponse<ModQueueItem> getModQueue(String subreddit, int page, int limit) {
        // Fetch flagged posts from content-service
        ParameterizedTypeReference<PageResponse<PostDto>> postResponseType = new ParameterizedTypeReference<>() {};
        
        PageResponse<PostDto> postsPage = restClient.get()
                .uri(contentServiceBaseUrl + "/api/internal/posts/flagged?subreddit={subreddit}&page={page}&limit={limit}", 
                     subreddit, page, limit)
                .retrieve()
                .body(postResponseType);

        // Fetch flagged comments from content-service
        ParameterizedTypeReference<PageResponse<CommentDto>> commentResponseType = new ParameterizedTypeReference<>() {};
        
        PageResponse<CommentDto> commentsPage = restClient.get()
                .uri(contentServiceBaseUrl + "/api/internal/posts/flagged-comments?subreddit={subreddit}&page={page}&limit={limit}",
                     subreddit, page, limit)
                .retrieve()
                .body(commentResponseType);

        List<ModQueueItem> items = new ArrayList<>();

        if (postsPage != null && postsPage.getContent() != null) {
            items.addAll(postsPage.getContent().stream()
                    .map(post -> {
                        List<String> sortedReasons = parseAndSortReasons(post.getReportReasons());
                        String flagReason;

                        if (post.getReports() > 0 && !sortedReasons.isEmpty()) {
                            flagReason = sortedReasons.get(0);
                        } else {
                            flagReason = "Flagged by AutoMod";
                        }

                        return ModQueueItem.builder()
                                .id(post.getId())
                                .type("post")
                                .status("pending")
                                .flagReason(flagReason)
                                .reportCount(post.getReports())
                                .reportReasonsList(sortedReasons)
                                .contentTitle(post.getTitle())
                                .contentBody(post.getContent())
                                .author(post.getAuthor())
                                .build();
                    })
                    .collect(Collectors.toList()));
        }

        if (commentsPage != null && commentsPage.getContent() != null) {
            items.addAll(commentsPage.getContent().stream()
                    .map(comment -> {
                        List<String> sortedReasons = parseAndSortReasons(comment.getReportReasons());
                        String flagReason;

                        if (comment.getReports() > 0 && !sortedReasons.isEmpty()) {
                            flagReason = sortedReasons.get(0);
                        } else {
                            flagReason = "Flagged by AutoMod";
                        }

                        return ModQueueItem.builder()
                                .id(comment.getId())
                                .postId(comment.getPostId())
                                .type("comment")
                                .status("pending")
                                .flagReason(flagReason)
                                .reportCount(comment.getReports())
                                .reportReasonsList(sortedReasons)
                                .contentTitle("Comment by " + comment.getAuthor())
                                .contentBody(comment.getContent())
                                .author(comment.getAuthor())
                                .build();
                    })
                    .collect(Collectors.toList()));
        }

        PageResponse<ModQueueItem> response = new PageResponse<>();
        response.setContent(items);
        response.setTotalElements(
                (postsPage != null ? postsPage.getTotalElements() : 0) + 
                (commentsPage != null ? commentsPage.getTotalElements() : 0)
        );
        response.setTotalPages(Math.max(
                postsPage != null ? postsPage.getTotalPages() : 0,
                commentsPage != null ? commentsPage.getTotalPages() : 0
        ));
        response.setSize(items.size());
        response.setNumber(page);
        return response;
    }

    /**
     * Parse a JSON array of reason strings, count frequency, and return unique reasons
     * sorted by frequency descending (most reported reason first).
     */
    private List<String> parseAndSortReasons(String reportReasonsJson) {
        if (reportReasonsJson == null || reportReasonsJson.isEmpty()) {
            return List.of();
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode reasons = mapper.readTree(reportReasonsJson);
            if (!reasons.isArray() || reasons.size() == 0) {
                return List.of();
            }
            // Count frequency of each reason
            Map<String, Integer> freq = new LinkedHashMap<>();
            for (JsonNode node : reasons) {
                String reason = node.asText();
                freq.merge(reason, 1, Integer::sum);
            }
            // Sort by frequency descending, then return formatted strings
            return freq.entrySet().stream()
                    .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                    .map(e -> e.getValue() > 1 ? e.getKey() + " (" + e.getValue() + ")" : e.getKey())
                    .collect(Collectors.toList());
        } catch (Exception e) {
            return List.of();
        }
    }

    public Map<String, Integer> bulkModQueueAction(String subreddit, ModQueueActionRequest request) {
        ParameterizedTypeReference<Map<String, Integer>> responseType = new ParameterizedTypeReference<>() {};
        
        return restClient.patch()
                .uri(contentServiceBaseUrl + "/api/internal/posts/modqueue-action")
                .body(request)
                .retrieve()
                .body(responseType);
    }
}
