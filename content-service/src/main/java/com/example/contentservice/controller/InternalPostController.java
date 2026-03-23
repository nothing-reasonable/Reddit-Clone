package com.example.contentservice.controller;

import com.example.contentservice.model.Post;
import com.example.contentservice.service.ContentService;
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

    @GetMapping("/flagged")
    public Page<Post> getFlaggedPosts(
            @RequestParam String subreddit,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int limit) {
        
        // Sorting by reports descending
        Sort sortOrder = Sort.by(Sort.Direction.DESC, "reports");
        return postService.getReportedPosts(subreddit, PageRequest.of(page, limit, sortOrder));
    }

    @PatchMapping("/modqueue-action")
    public ResponseEntity<Map<String, Integer>> bulkModQueueAction(
            @RequestBody ModQueueActionRequest request) {
        
        int processed = 0;
        int failed = 0;
        
        for (String id : request.getIds()) {
            try {
                Post post = postService.getPost(id);
                if ("approved".equalsIgnoreCase(request.getStatus())) {
                    post.setReports(0); // clear flags
                } else if ("removed".equalsIgnoreCase(request.getStatus())) {
                    post.setRemoved(true);
                }
                postService.savePostInternal(post);
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

    @Data
    public static class ModQueueActionRequest {
        private List<String> ids;
        private String status;
    }
}
