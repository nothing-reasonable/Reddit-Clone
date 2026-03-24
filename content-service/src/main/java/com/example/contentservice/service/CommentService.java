package com.example.contentservice.service;

import com.example.contentservice.client.SubredditClient;
import com.example.contentservice.dto.CommentCreateRequest;
import com.example.contentservice.dto.CommentDto;
import com.example.contentservice.exception.ResourceNotFoundException;
import com.example.contentservice.exception.UnauthorizedActionException;
import com.example.contentservice.model.Comment;
import com.example.contentservice.model.Post;
import com.example.contentservice.repository.CommentRepository;
import com.example.contentservice.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final SubredditClient subredditClient;

    @Transactional
    public CommentDto createComment(String postId, String author, CommentCreateRequest request) {
        log.info("Creating comment for post {} by author {}", postId, author);
        
        // Verify post exists
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> {
                    log.error("Post not found: {}", postId);
                    return new ResourceNotFoundException("Post not found: " + postId);
                });

        // Verify user is a member of the subreddit
        log.info("Checking if user {} is a member of r/{}", author, post.getSubreddit());
        boolean isMember = subredditClient.isMember(post.getSubreddit(), author);
        if (!isMember) {
            log.warn("User {} is not a member of r/{}", author, post.getSubreddit());
            throw new UnauthorizedActionException("You must be a member of r/" + post.getSubreddit() + " to comment");
        }

        // If parentId is provided, verify parent comment exists
        if (request.getParentId() != null && !request.getParentId().isEmpty()) {
            log.info("Creating nested reply to comment: {}", request.getParentId());
            Comment parentComment = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> {
                        log.error("Parent comment not found: {}", request.getParentId());
                        return new ResourceNotFoundException("Parent comment not found: " + request.getParentId());
                    });
            
            // Verify parent comment belongs to same post
            if (!parentComment.getPostId().equals(postId)) {
                log.error("Parent comment {} does not belong to post {}", request.getParentId(), postId);
                throw new IllegalArgumentException("Parent comment does not belong to this post");
            }
        }

        Comment comment = Comment.builder()
                .id(UUID.randomUUID().toString())
                .postId(postId)
                .parentId(request.getParentId())
                .author(author)
                .content(request.getContent())
                .upvotes(1)
                .score(1)
                .build();

        Comment savedComment = commentRepository.save(comment);
        
        // Update post comment count
        post.setCommentCount(post.getCommentCount() + 1);
        postRepository.save(post);

        log.info("Comment created successfully: {} by {} on post {}", savedComment.getId(), author, postId);
        return mapToDto(savedComment);
    }

    @Transactional
    public void deleteComment(String postId, String commentId, String username) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found: " + commentId));

        if (!comment.getPostId().equals(postId)) {
            throw new IllegalArgumentException("Comment does not belong to this post");
        }

        // Check if user is the author
        if (!comment.getAuthor().equals(username)) {
            throw new UnauthorizedActionException("You can only delete your own comments");
        }

        // Mark as removed instead of deleting to preserve comment structure
        comment.setRemoved(true);
        comment.setContent("[deleted]");
        commentRepository.save(comment);

        // Update post comment count
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));
        post.setCommentCount(Math.max(0, post.getCommentCount() - 1));
        postRepository.save(post);

        log.info("Comment deleted: {} on post {}", commentId, postId);
    }

    @Transactional(readOnly = true)
    public Page<CommentDto> getComments(String postId, Pageable pageable) {
        // Verify post exists
        postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));

        // Get all comments (both top-level and nested) - frontend will build tree structure
        return commentRepository.findByPostId(postId, pageable)
                .map(this::mapToDto);
    }

    @Transactional(readOnly = true)
    public List<CommentDto> getAllCommentsForPost(String postId) {
        // Verify post exists
        postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + postId));

        return commentRepository.findByPostId(postId).stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CommentDto> getReplies(String parentCommentId) {
        Comment parentComment = commentRepository.findById(parentCommentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found: " + parentCommentId));

        return commentRepository.findByParentId(parentCommentId).stream()
                .map(this::mapToDto)
                .toList();
    }

    private CommentDto mapToDto(Comment comment) {
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
                .build();
    }
}
