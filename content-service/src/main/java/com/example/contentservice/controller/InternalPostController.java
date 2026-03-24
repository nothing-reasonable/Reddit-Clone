package com.example.contentservice.controller;

import com.example.contentservice.model.Post;
import com.example.contentservice.model.Comment;
import com.example.contentservice.service.ContentService;
import com.example.contentservice.service.CommentService;
import com.example.contentservice.dto.CommentDto;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/internal/posts")
@RequiredArgsConstructor
public class InternalPostController {

    private final ContentService postService;
    private final CommentService commentService;

    @GetMapping("/flagged")
    public Page<Post> getFlaggedPosts(
            @RequestParam String subreddit,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int limit) {

        // Return flagged posts (flagged by AutoMod) sorted by creation time descending
        Sort sortOrder = Sort.by(Sort.Direction.DESC, "createdAt");
        return postService.getFlaggedPosts(subreddit, PageRequest.of(page, limit, sortOrder));
    }

    @GetMapping("/flagged-comments")
    public Page<CommentDto> getFlaggedComments(
            @RequestParam String subreddit,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int limit) {

        Sort sortOrder = Sort.by(Sort.Direction.DESC, "createdAt");
        return commentService.getFlaggedComments(subreddit, PageRequest.of(page, limit, sortOrder));
    }

    @PatchMapping("/modqueue-action")
    public ResponseEntity<Map<String, Integer>> bulkModQueueAction(
            @RequestBody ModQueueActionRequest request) {
        
        int processed = 0;
        int failed = 0;
        
        for (String id : request.getIds()) {
            try {
                if ("post".equalsIgnoreCase(request.getType())) {
                    // Handle post approval/removal
                    Post post = postService.getPost(id);
                    if ("approved".equalsIgnoreCase(request.getStatus())) {
                        post.setReports(0); // clear report count
                        post.setFlagged(false); // clear flagged status
                        post.setReportReasons("[]"); // clear report reasons
                    } else if ("removed".equalsIgnoreCase(request.getStatus())) {
                        post.setRemoved(true);
                    }
                    postService.savePostInternal(post);
                } else if ("comment".equalsIgnoreCase(request.getType())) {
                    // Handle comment approval/removal
                    Comment comment = commentService.getCommentById(id);
                    if ("approved".equalsIgnoreCase(request.getStatus())) {
                        comment.setReports(0); // clear report count
                        comment.setFlagged(false); // clear flagged status
                        comment.setReportReasons("[]"); // clear report reasons
                    } else if ("removed".equalsIgnoreCase(request.getStatus())) {
                        comment.setRemoved(true);
                    }
                    commentService.saveCommentInternal(comment);
                }
                processed++;
            } catch (Exception e) {
                failed++;
            }
        }
        
        return ResponseEntity.ok(Map.of("processed", processed, "failed", failed));
    }

    // ── Individual Mod Action Endpoints ────────────────────────────────

    @PatchMapping("/{postId}/approve")
    public Post approvePost(@PathVariable String postId) {
        return postService.approvePost(postId);
    }

    @PatchMapping("/{postId}/remove")
    public Post removePost(@PathVariable String postId) {
        return postService.removePostAsMod(postId);
    }

    @PatchMapping("/{postId}/lock")
    public Post lockPost(@PathVariable String postId) {
        return postService.lockPost(postId);
    }

    @PatchMapping("/{postId}/unlock")
    public Post unlockPost(@PathVariable String postId) {
        return postService.unlockPost(postId);
    }

    @PatchMapping("/{postId}/pin")
    public Post pinPost(@PathVariable String postId) {
        return postService.pinPost(postId);
    }

    @PatchMapping("/{postId}/unpin")
    public Post unpinPost(@PathVariable String postId) {
        return postService.unpinPost(postId);
    }

    // ── Comment Mod Action Endpoints ────────────────────────────────

    @PatchMapping("/{postId}/comments/{commentId}/approve")
    public CommentDto approveComment(@PathVariable String postId, @PathVariable String commentId) {
        Comment comment = commentService.approveComment(commentId);
        return mapCommentToDto(comment);
    }

    @PatchMapping("/{postId}/comments/{commentId}/remove")
    public CommentDto removeComment(@PathVariable String postId, @PathVariable String commentId) {
        Comment comment = commentService.removeComment(commentId);
        return mapCommentToDto(comment);
    }

    private CommentDto mapCommentToDto(Comment comment) {
        return CommentDto.builder()
                .id(comment.getId())
                .postId(comment.getPostId())
                .parentId(comment.getParentId())
                .author(comment.getAuthor())
                .content(comment.getContent())
                .upvotes(comment.getUpvotes())
                .downvotes(comment.getDownvotes())
                .score(comment.getScore())
                .createdAt(comment.getCreatedAt())
                .editedAt(comment.getEditedAt())
                .removed(comment.isRemoved())
                .flagged(comment.isFlagged())
                .reports(comment.getReports())
                .build();
    }

    @Data
    public static class ModQueueActionRequest {
        private List<String> ids;
        private String status;
        private String type; // "post" or "comment"
    }
}
