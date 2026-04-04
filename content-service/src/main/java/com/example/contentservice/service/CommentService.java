package com.example.contentservice.service;

import com.example.contentservice.automod.AutoModContext;
import com.example.contentservice.client.ModerationService;
import com.example.contentservice.client.ModMailClient;
import com.example.contentservice.client.SubredditClient;
import com.example.contentservice.dto.CommentCreateRequest;
import com.example.contentservice.dto.CommentDto;
import com.example.contentservice.exception.ResourceNotFoundException;
import com.example.contentservice.exception.UnauthorizedActionException;
import com.example.contentservice.model.Comment;
import com.example.contentservice.model.CommentVote;
import com.example.contentservice.model.Post;
import com.example.contentservice.repository.CommentVoteRepository;
import com.example.contentservice.repository.CommentRepository;
import com.example.contentservice.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CommentService {

    private final CommentRepository commentRepository;
    private final CommentVoteRepository commentVoteRepository;
    private final PostRepository postRepository;
    private final SubredditClient subredditClient;
    private final ModerationService moderationService;
    private final ModMailClient modMailClient;

    @Transactional
    public CommentDto createComment(String postId, String author, CommentCreateRequest request) {
        log.info("Creating comment for post {} by author {}", postId, author);
        
        // Verify post exists
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> {
                    log.error("Post not found: {}", postId);
                    return new ResourceNotFoundException("Post not found: " + postId);
                });

        // Reject comments on locked posts
        if (post.isLocked()) {
            throw new UnauthorizedActionException("Post is locked. New comments are not allowed.");
        }

        // Check if user is banned from the subreddit
        if (subredditClient.isBanned(post.getSubreddit(), author)) {
            log.warn("Banned user {} attempted to comment in r/{}", author, post.getSubreddit());
            throw new UnauthorizedActionException("You are banned from r/" + post.getSubreddit() + " and cannot comment.");
        }

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
                .subreddit(post.getSubreddit())
                .parentId(request.getParentId())
                .author(author)
                .content(request.getContent())
                .upvotes(1)
                .score(1)
                .build();

        Comment savedComment = commentRepository.save(comment);

        // Apply AutoMod rules - errors are non-fatal
        try {
            applyAutoModRules(savedComment, post);
        } catch (Exception e) {
            log.warn("Error applying AutoMod rules to comment {}: {}", savedComment.getId(), e.getMessage());
        }

        // Reddit-style behavior: author has an initial upvote persisted.
        CommentVote initialAuthorVote = CommentVote.builder()
            .commentId(savedComment.getId())
            .username(author)
            .direction(1)
            .build();
        commentVoteRepository.save(initialAuthorVote);
        
        // Update post comment count
        post.setCommentCount(post.getCommentCount() + 1);
        postRepository.save(post);

        log.info("Comment created successfully: {} by {} on post {}", savedComment.getId(), author, postId);
        return mapToDto(savedComment);
    }

    /**
     * Apply enabled AutoMod rules to a comment.
     * Rules may flag or remove the comment based on conditions.
     */
    private void applyAutoModRules(Comment comment, Post post) {
        String subreddit = post.getSubreddit();
        log.info("Applying AutoMod rules to comment {} in r/{}", comment.getId(), subreddit);
        List<ModerationService.RuleDto> rules = moderationService.getRulesForSubreddit(subreddit);
        log.info("Found {} AutoMod rules for r/{}", rules.size(), subreddit);
        if (rules.isEmpty()) return;

        AutoModContext context = buildAutoModContext(comment);

        for (ModerationService.RuleDto rule : rules) {
            if (rule == null || rule.getYamlContent() == null) continue;

            ModerationService.AutoModEvaluationResponse result =
                    moderationService.evaluateRule(rule.getYamlContent(), context.toMap(),
                                                   rule.getId(), rule.getName(), subreddit);

            if (result.isTriggered()) {
                String action = result.getAction();
                log.info("AutoMod rule '{}' triggered on comment {} - action: {}", rule.getName(), comment.getId(), action);

                if (shouldNotifyUser(action, result.getMessage())) {
                    String subject = "AutoMod action on your comment in r/" + subreddit;
                    modMailClient.sendAutomodMessage(subreddit, comment.getAuthor(), subject, result.getMessage().trim());
                }

                if ("remove".equals(action)) {
                    comment.setRemoved(true);
                    log.info("Comment {} removed by AutoMod", comment.getId());
                } else if ("flag".equals(action) || "filter".equals(action)) {
                    comment.setFlagged(true);
                    log.info("Comment {} flagged by AutoMod", comment.getId());
                }
            }
        }
        commentRepository.save(comment);
    }

    private boolean shouldNotifyUser(String action, String message) {
        if (action == null || message == null || message.isBlank()) {
            return false;
        }
        String normalized = action.toLowerCase();
        return normalized.equals("remove")
                || normalized.equals("flag")
                || normalized.equals("filter")
                || normalized.equals("send_modmail");
    }

    /**
     * Build AutoModContext from a Comment for rule evaluation.
     */
    private AutoModContext buildAutoModContext(Comment comment) {
        AutoModContext context = new AutoModContext();
        context.setBody(comment.getContent());
        context.setAuthor(comment.getAuthor());
        context.setSubmissionType("comment");

        // Default values - real values would require user-service integration
        context.setAuthorAccountAge("30 days");
        context.setAuthorKarma(100);
        // Evaluate rules for all users by default.
        context.setIsModerator(false);
        return context;
    }

    @Transactional
    public int voteComment(String postId, String commentId, String requesterUsername, int direction) {
        if (direction < -1 || direction > 1) {
            throw new IllegalArgumentException("Vote direction must be -1, 0, or 1");
        }

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found: " + commentId));

        if (!comment.getPostId().equals(postId)) {
            throw new IllegalArgumentException("Comment does not belong to this post");
        }

        CommentVote vote = commentVoteRepository.findByCommentIdAndUsername(commentId, requesterUsername).orElse(null);
        int previousDirection = vote != null ? vote.getDirection() : 0;

        int previousUpvoteDelta = previousDirection == 1 ? 1 : 0;
        int previousDownvoteDelta = previousDirection == -1 ? 1 : 0;
        int nextUpvoteDelta = direction == 1 ? 1 : 0;
        int nextDownvoteDelta = direction == -1 ? 1 : 0;

        if (vote != null) {
            vote.setDirection(direction);
            if (direction == 0) {
                commentVoteRepository.delete(vote);
            } else {
                commentVoteRepository.save(vote);
            }
        } else if (direction != 0) {
            CommentVote newVote = CommentVote.builder()
                    .commentId(commentId)
                    .username(requesterUsername)
                    .direction(direction)
                    .build();
            commentVoteRepository.save(newVote);
        }

        int nextUpvotes = comment.getUpvotes() - previousUpvoteDelta + nextUpvoteDelta;
        int nextDownvotes = comment.getDownvotes() - previousDownvoteDelta + nextDownvoteDelta;
        comment.setUpvotes(Math.max(0, nextUpvotes));
        comment.setDownvotes(Math.max(0, nextDownvotes));
        comment.setScore(comment.getUpvotes() - comment.getDownvotes());
        commentRepository.save(comment);
        return comment.getScore();
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

    @Transactional
    public void reportComment(String postId, String commentId, String reason) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found: " + commentId));

        if (!comment.getPostId().equals(postId)) {
            throw new IllegalArgumentException("Comment does not belong to this post");
        }

        try {
            ObjectMapper mapper = new ObjectMapper();
            ArrayNode reasons = (ArrayNode) mapper.readTree(comment.getReportReasons() == null ? "[]" : comment.getReportReasons());
            reasons.add(reason != null ? reason : "Reported");
            comment.setReportReasons(mapper.writeValueAsString(reasons));
        } catch (Exception e) {
            log.error("Error parsing report reasons", e);
            comment.setReportReasons("[]");
        }

        comment.setReports(comment.getReports() + 1);
        comment.setFlagged(true);
        commentRepository.save(comment);
        log.info("Comment reported: {} on post {} with reason: {} (total reports: {})", commentId, postId, reason, comment.getReports());
    }

    @Transactional(readOnly = true)
    public Page<CommentDto> getFlaggedComments(String subreddit, Pageable pageable) {
        log.info("Fetching flagged comments for subreddit: {}", subreddit);
        return commentRepository.findBySubredditAndFlaggedTrueAndRemovedFalse(subreddit, pageable)
                .map(this::mapToDto);
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
                .reports(comment.getReports())
                .reportReasons(comment.getReportReasons())
                .build();
    }

    public Comment getCommentById(String commentId) {
        return commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found: " + commentId));
    }

    @Transactional
    public void saveCommentInternal(Comment comment) {
        commentRepository.save(comment);
    }

    @Transactional
    public Comment approveComment(String commentId) {
        Comment comment = getCommentById(commentId);
        comment.setReports(0);
        comment.setReportReasons("[]");
        comment.setFlagged(false);
        comment.setRemoved(false);
        return commentRepository.save(comment);
    }

    @Transactional
    public Comment removeComment(String commentId) {
        Comment comment = getCommentById(commentId);
        comment.setRemoved(true);
        comment.setContent("[removed by moderator]");
        commentRepository.save(comment);

        Post post = postRepository.findById(comment.getPostId())
                .orElseThrow(() -> new ResourceNotFoundException("Post not found: " + comment.getPostId()));
        post.setCommentCount(Math.max(0, post.getCommentCount() - 1));
        postRepository.save(post);

        return comment;
    }
}
