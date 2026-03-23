package com.example.moderationservice.service;

import com.example.moderationservice.dto.ModActionResponse;
import com.example.moderationservice.dto.ModLogEntry;
import com.example.moderationservice.dto.PostDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class ModActionService {

    private final RestClient restClient;
    private final String contentServiceBaseUrl;
    private final ModLogStore modLogStore;

    public ModActionService(RestClient restClient,
                            @Value("${services.content.base-url:http://localhost:8083}") String contentServiceBaseUrl,
                            ModLogStore modLogStore) {
        this.restClient = restClient;
        this.contentServiceBaseUrl = contentServiceBaseUrl;
        this.modLogStore = modLogStore;
    }

    public ModActionResponse executeAction(String postId, String action, String moderator, String subreddit) {
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

        modLogStore.add(ModLogEntry.builder()
                .id(UUID.randomUUID().toString())
                .subreddit(subreddit)
                .moderator(moderator)
                .action(action + "_post")
                .targetContent(updatedPost.getTitle())
                .targetUser(updatedPost.getAuthor())
                .timestamp(LocalDateTime.now())
                .build());

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
