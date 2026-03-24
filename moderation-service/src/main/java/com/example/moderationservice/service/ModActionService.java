package com.example.moderationservice.service;

import com.example.moderationservice.dto.ModActionResponse;
import com.example.moderationservice.dto.PostDto;
import com.example.moderationservice.model.ModAction;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;

@Service
public class ModActionService {

    private final RestClient restClient;
    private final String contentServiceBaseUrl;
    private final ModLogService modLogService;

    public ModActionService(RestClient restClient,
                            ModLogService modLogService,
                            @Value("${services.content.base-url:http://localhost:8083}") String contentServiceBaseUrl) {
        this.restClient = restClient;
        this.modLogService = modLogService;
        this.contentServiceBaseUrl = contentServiceBaseUrl;
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

        // Log the action to modlog
        logModAction(action, moderator, subreddit, updatedPost);

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

    /**
     * Log the moderation action to the modlog database.
     */
    private void logModAction(String action, String moderator, String subreddit, PostDto post) {
        try {
            ModAction modAction = mapStringToModAction(action);
            modLogService.logAction(
                    subreddit,
                    moderator,
                    modAction,
                    post.getAuthor(),  // target user
                    post.getId(),       // target content
                    null                // reason (caller can add via API)
            );
        } catch (IllegalArgumentException ignored) {
            // If action doesn't map to valid ModAction enum, skip logging
        }
    }

    /**
     * Map action string to ModAction enum.
     */
    private ModAction mapStringToModAction(String action) {
        return switch (action.toLowerCase()) {
            case "remove" -> ModAction.REMOVE_POST;
            case "approve" -> ModAction.APPROVE_POST;
            case "lock", "unlock" -> ModAction.LOCK_POST;
            case "pin" -> ModAction.PIN_POST;
            case "unpin" -> ModAction.UNPIN_POST;
            default -> throw new IllegalArgumentException("Unknown action: " + action);
        };
    }
}

