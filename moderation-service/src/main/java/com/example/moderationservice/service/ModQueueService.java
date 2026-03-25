package com.example.moderationservice.service;

import com.example.moderationservice.dto.ModQueueActionRequest;
import com.example.moderationservice.dto.ModQueueItem;
import com.example.moderationservice.dto.PageResponse;
import com.example.moderationservice.dto.PostDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
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
        ParameterizedTypeReference<PageResponse<PostDto>> responseType = new ParameterizedTypeReference<>() {};
        
        PageResponse<PostDto> postsPage = restClient.get()
                .uri(contentServiceBaseUrl + "/api/internal/posts/flagged?subreddit={subreddit}&page={page}&limit={limit}", 
                     subreddit, page, limit)
                .retrieve()
                .body(responseType);

        if (postsPage == null) {
            return new PageResponse<>();
        }

        List<ModQueueItem> items = postsPage.getContent().stream()
                .map(post -> ModQueueItem.builder()
                        .id(post.getId())
                        .type("post")
                        .status("pending")
                        .flagReason("User reported") // Default reason
                        .reportCount(post.getReports())
                        .contentTitle(post.getTitle())
                        .contentBody(post.getContent())
                        .author(post.getAuthor())
                        .build())
                .collect(Collectors.toList());

        PageResponse<ModQueueItem> response = new PageResponse<>();
        response.setContent(items);
        response.setTotalElements(postsPage.getTotalElements());
        response.setTotalPages(postsPage.getTotalPages());
        response.setSize(postsPage.getSize());
        response.setNumber(postsPage.getNumber());
        return response;
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
