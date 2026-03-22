package com.example.moderationservice.service;

import com.example.moderationservice.dto.ModActionResponse;
import com.example.moderationservice.dto.PostDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;

@Service
public class ModActionService {

    private final RestClient restClient;
    private final String contentServiceBaseUrl;

    public ModActionService(RestClient restClient,
                            @Value("${services.content.base-url:http://localhost:8083}") String contentServiceBaseUrl) {
        this.restClient = restClient;
        this.contentServiceBaseUrl = contentServiceBaseUrl;
    }

    public ModActionResponse executeAction(String postId, String action, String moderator) {
        String url = contentServiceBaseUrl + "/api/internal/posts/" + postId + "/" + action;

        PostDto updatedPost = restClient.patch()
                .uri(url)
                .retrieve()
                .body(PostDto.class);

        if (updatedPost == null) {
            return ModActionResponse.builder()
                    .postId(postId)
                    .action(action)
                    .moderator(moderator)
                    .timestamp(LocalDateTime.now())
                    .success(false)
                    .build();
        }

        return ModActionResponse.builder()
                .postId(updatedPost.getId())
                .action(action)
                .moderator(moderator)
                .timestamp(LocalDateTime.now())
                .success(true)
                .postTitle(updatedPost.getTitle())
                .postAuthor(updatedPost.getAuthor())
                .removed(updatedPost.isRemoved())
                .locked(updatedPost.isLocked())
                .pinned(updatedPost.isPinned())
                .build();
    }
}
