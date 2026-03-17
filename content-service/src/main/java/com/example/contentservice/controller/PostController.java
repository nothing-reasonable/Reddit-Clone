package com.example.contentservice.controller;

import com.example.contentservice.dto.PaginatedResponse;
import com.example.contentservice.dto.Pagination;
import com.example.contentservice.dto.PostCreateRequest;
import com.example.contentservice.dto.PostUpdateRequest;
import com.example.contentservice.dto.VoteRequest;
import com.example.contentservice.model.Post;
import com.example.contentservice.service.ContentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PostController {

    private final ContentService postService;

    @GetMapping("/posts")
    public PaginatedResponse<Post> getGlobalPosts(
            @RequestParam(defaultValue = "hot") String sort,
            @RequestParam(required = false) String t,
            @RequestParam(defaultValue = "25") int limit,
            @RequestParam(required = false) String after) {

        int pageNum = 0;
        if (after != null) {
            try {
                pageNum = Integer.parseInt(after);
            } catch (NumberFormatException ignored) {
            }
        }

        Sort sortOrder = Sort.by(Sort.Direction.DESC, "score");
        if ("new".equalsIgnoreCase(sort))
            sortOrder = Sort.by(Sort.Direction.DESC, "createdAt");

        Page<Post> page = postService.getGlobalPosts(PageRequest.of(pageNum, limit, sortOrder));

        return buildPaginatedResponse(page, pageNum);
    }

    @GetMapping("/r/{subreddit}/posts")
    public PaginatedResponse<Post> getSubredditPosts(
            @PathVariable String subreddit,
            @RequestParam(defaultValue = "hot") String sort,
            @RequestParam(required = false) String t,
            @RequestParam(defaultValue = "25") int limit,
            @RequestParam(required = false) String after) {

        int pageNum = 0;
        if (after != null) {
            try {
                pageNum = Integer.parseInt(after);
            } catch (NumberFormatException ignored) {
            }
        }

        Sort sortOrder = Sort.by(Sort.Direction.DESC, "score");
        if ("new".equalsIgnoreCase(sort))
            sortOrder = Sort.by(Sort.Direction.DESC, "createdAt");

        Page<Post> page = postService.getSubredditPosts(subreddit, PageRequest.of(pageNum, limit, sortOrder));

        return buildPaginatedResponse(page, pageNum);
    }

    @PostMapping("/r/{subreddit}/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public Post createPost(@PathVariable String subreddit, @Valid @RequestBody PostCreateRequest request,
            Principal principal) {
        return postService.createPost(subreddit, principal.getName(), request);
    }

    @GetMapping("/posts/{postId}")
    public Post getPost(@PathVariable String postId) {
        return postService.getPost(postId);
    }

    @PatchMapping("/posts/{postId}")
    public Post updatePost(@PathVariable String postId, @Valid @RequestBody PostUpdateRequest request,
            Principal principal) {
        return postService.updatePost(postId, principal.getName(), request);
    }

    @DeleteMapping("/posts/{postId}")
    public Post deletePost(@PathVariable String postId, Principal principal) {
        return postService.deletePost(postId, principal.getName());
    }

    @PutMapping("/posts/{postId}/votes")
    public Map<String, Integer> votePost(@PathVariable String postId, @RequestBody VoteRequest request,
            Principal principal) {
        int newScore = postService.vote(postId, principal.getName(), request.getDirection());
        return Collections.singletonMap("score", newScore);
    }

    @PutMapping("/posts/{postId}/saves")
    public void savePost(@PathVariable String postId, Principal principal) {
        postService.savePost(postId, principal.getName());
    }

    @DeleteMapping("/posts/{postId}/saves")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsavePost(@PathVariable String postId, Principal principal) {
        postService.unsavePost(postId, principal.getName());
    }

    @PostMapping("/posts/{postId}/reports")
    @ResponseStatus(HttpStatus.CREATED)
    public void reportPost(@PathVariable String postId) {
        postService.reportPost(postId);
    }

    private PaginatedResponse<Post> buildPaginatedResponse(Page<Post> page, int pageNum) {
        Pagination pagination = new Pagination(
                page.hasNext() ? String.valueOf(pageNum + 1) : null,
                page.getNumberOfElements(),
                page.hasNext());
        return new PaginatedResponse<>(page.getContent(), pagination);
    }
}
