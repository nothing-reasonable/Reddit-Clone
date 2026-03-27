package com.example.moderationservice.service;

import com.example.moderationservice.dto.CommentDto;
import com.example.moderationservice.dto.ModActionResponse;
import com.example.moderationservice.dto.PostDto;

import com.example.moderationservice.model.ModAction;
import com.example.moderationservice.model.ModLog;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;

@Slf4j
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

        // Log the post action to modlog
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

    public ModActionResponse executeCommentAction(String commentId, String postId, String action, String moderator, String subreddit) {
        String url = contentServiceBaseUrl + "/api/internal/posts/" + postId + "/comments/" + commentId + "/" + action;

        try {
            CommentDto updatedComment = restClient.patch()
                    .uri(url)
                    .retrieve()
                    .body(CommentDto.class);

            if (updatedComment != null) {
                // Log the action to modlog with comment-specific action
                logCommentModAction(action, moderator, subreddit, updatedComment);

                return ModActionResponse.builder()
                        .postId(postId)
                        .action(action)
                        .moderator(moderator)
                        .timestamp(LocalDateTime.now())
                        .success(true)
                        .postTitle("Comment by " + updatedComment.getAuthor())
                        .postAuthor(updatedComment.getAuthor())
                        .removed(updatedComment.isRemoved())
                        .build();
            }
        } catch (Exception e) {
            log.error("Failed to execute comment action: commentId={}, postId={}, action={}", commentId, postId, action, e);
        }

        return ModActionResponse.builder()
                .postId(postId)
                .action(action)
                .moderator(moderator)
                .timestamp(LocalDateTime.now())
                .success(false)
                .build();
    }

    /**
     * Log a post moderation action to the modlog database.
     */
    private void logModAction(String action, String moderator, String subreddit, PostDto post) {
        try {
            ModAction modAction = mapStringToModAction(action, false);
            ModLog savedLog = modLogService.logAction(
                    subreddit,
                    moderator,
                    modAction,
                    post.getAuthor(),
                    post.getTitle(),
                    null
            );
            log.info("ModLog saved successfully: id={}, action={}, subreddit={}, moderator={}",
                    savedLog.getId(), modAction, subreddit, moderator);
        } catch (Exception e) {
            log.error("Failed to log moderation action: action={}, subreddit={}, moderator={}",
                    action, subreddit, moderator, e);
        }
    }

    /**
     * Log a comment moderation action to the modlog database.
     */
    private void logCommentModAction(String action, String moderator, String subreddit, CommentDto comment) {
        try {
            ModAction modAction = mapStringToModAction(action, true);
            String targetContent = "Comment by " + comment.getAuthor() + ": " +
                    (comment.getContent() != null && comment.getContent().length() > 100
                            ? comment.getContent().substring(0, 100) + "..."
                            : comment.getContent());
            ModLog savedLog = modLogService.logAction(
                    subreddit,
                    moderator,
                    modAction,
                    comment.getAuthor(),
                    targetContent,
                    null
            );
            log.info("ModLog saved successfully: id={}, action={}, subreddit={}, moderator={}",
                    savedLog.getId(), modAction, subreddit, moderator);
        } catch (Exception e) {
            log.error("Failed to log comment moderation action: action={}, subreddit={}, moderator={}",
                    action, subreddit, moderator, e);
        }
    }

    /**
     * Map action string to ModAction enum.
     */
    private ModAction mapStringToModAction(String action, boolean isComment) {
        return switch (action.toLowerCase()) {
            case "remove" -> isComment ? ModAction.REMOVE_COMMENT : ModAction.REMOVE_POST;
            case "approve" -> isComment ? ModAction.APPROVE_COMMENT : ModAction.APPROVE_POST;
            case "lock" -> ModAction.LOCK_POST;
            case "unlock" -> ModAction.UNLOCK_POST;
            case "pin" -> ModAction.PIN_POST;
            case "unpin" -> ModAction.UNPIN_POST;
            default -> throw new IllegalArgumentException("Unknown action: " + action);
        };
    }
}

