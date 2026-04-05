package com.example.contentservice.service;

import com.example.contentservice.automod.AutoModContext;
import com.example.contentservice.client.ModerationService;
import com.example.contentservice.client.ModMailClient;
import com.example.contentservice.dto.PostCreateRequest;
import com.example.contentservice.dto.PostUpdateRequest;
import com.example.contentservice.exception.ResourceNotFoundException;
import com.example.contentservice.exception.UnauthorizedActionException;
import com.example.contentservice.client.SubredditClient;
import com.example.contentservice.model.*;
import com.example.contentservice.repository.PostRepository;
import com.example.contentservice.repository.SavedPostRepository;
import com.example.contentservice.repository.VoteRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContentService {

    private final PostRepository postRepository;
    private final VoteRepository voteRepository;
    private final SavedPostRepository savedPostRepository;
    private final SubredditClient subredditClient;
    private final ModerationService moderationService;
    private final ModMailClient modMailClient;

    public Page<Post> getGlobalPosts(Pageable pageable) {
        return postRepository.findByRemovedFalseExcludingAutoModFlaggedOnly(pageable);
    }

    public Page<Post> getSubredditPosts(String subreddit, Pageable pageable) {
        return postRepository.findBySubredditAndRemovedFalseExcludingAutoModFlaggedOnly(subreddit, pageable);
    }

    @Transactional
    public Post createPost(String subreddit, String author, PostCreateRequest request) {
        subredditClient.assertSubredditExists(subreddit);
        
        // Check if user is banned from the subreddit
        if (subredditClient.isBanned(subreddit, author)) {
            log.warn("Banned user {} attempted to post in r/{}", author, subreddit);
            throw new UnauthorizedActionException("You are banned from r/" + subreddit + " and cannot post.");
        }

        // Verify user is a member of the subreddit
        log.info("Checking if user {} is a member of r/{}", author, subreddit);
        boolean isMember = subredditClient.isMember(subreddit, author);
        if (!isMember) {
            log.warn("User {} is not a member of r/{}", author, subreddit);
            throw new IllegalArgumentException("You must be a member of r/" + subreddit + " to post");
        }

        PostType postType;
        try {
            postType = PostType.valueOf(request.getType().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid post type: " + request.getType());
        }

        Post post = Post.builder()
                .id(UUID.randomUUID().toString())
                .subreddit(subreddit)
                .author(author)
                .title(request.getTitle())
                .content(request.getContent())
                .type(postType)
                .url(request.getUrl())
                .flair(request.getFlair())
                .upvotes(1)
                .score(1)
                .build();

        Post savedPost = postRepository.save(post);

        // Apply AutoMod rules - errors are non-fatal
        try {
            applyAutoModRules(savedPost, subreddit);
        } catch (Exception e) {
            log.warn("Error applying AutoMod rules to post {}: {}", savedPost.getId(), e.getMessage());
        }

        // Reddit-style behavior: creator has an initial upvote from themselves.
        Vote initialAuthorVote = Vote.builder()
            .postId(savedPost.getId())
            .username(author)
            .direction(1)
            .build();
        voteRepository.save(initialAuthorVote);

        return savedPost;
    }

    /**
     * Apply enabled AutoMod rules to a post.
     * Rules may flag or remove the post based on conditions.
     */
    private void applyAutoModRules(Post post, String subreddit) {
        log.info("Applying AutoMod rules to post {} in r/{}", post.getId(), subreddit);
        List<ModerationService.RuleDto> rules = moderationService.getRulesForSubreddit(subreddit);
        log.info("Found {} AutoMod rules for r/{}", rules.size(), subreddit);
        if (rules.isEmpty()) return;

        AutoModContext context = buildAutoModContext(post);

        for (ModerationService.RuleDto rule : rules) {
            if (rule == null || rule.getYamlContent() == null) continue;

            ModerationService.AutoModEvaluationResponse result =
                    moderationService.evaluateRule(rule.getYamlContent(), context.toMap(), 
                                                   rule.getId(), rule.getName(), subreddit);

            if (result.isTriggered()) {
                String action = result.getAction();
                log.info("AutoMod rule '{}' triggered on post {} — action: {}", rule.getName(), post.getId(), action);

                if (shouldNotifyUser(action, result.getMessage())) {
                    String subject = (result.getSubject() != null && !result.getSubject().isBlank())
                            ? result.getSubject().trim()
                            : "AutoMod action on your post in r/" + subreddit;
                    modMailClient.sendAutomodMessage(subreddit, post.getAuthor(), subject, result.getMessage().trim());
                }

                if ("remove".equals(action)) {
                    post.setRemoved(true);
                    log.info("Post {} removed by AutoMod", post.getId());
                } else if ("flag".equals(action) || "filter".equals(action)) {
                    post.setFlagged(true);
                    log.info("Post {} flagged by AutoMod", post.getId());
                }
            }
        }
        postRepository.save(post);
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
     * Build AutoModContext from a Post for rule evaluation.
     */
    private AutoModContext buildAutoModContext(Post post) {
        AutoModContext context = new AutoModContext();
        context.setTitle(post.getTitle());
        context.setBody(post.getContent());
        context.setAuthor(post.getAuthor());
        // context.setId(post.getId());
        context.setSubmissionType(post.getType().name().toLowerCase());
        context.setFlairText(post.getFlair());

        if (post.getUrl() != null && !post.getUrl().isEmpty()) {
            try {
                java.net.URL url = java.net.URI.create(post.getUrl()).toURL();
                String host = url.getHost();
                if (host != null && host.startsWith("www.")) host = host.substring(4);
                context.setDomain(host);
            } catch (Exception e) {
                log.debug("Could not parse domain from URL: {}", post.getUrl());
            }
        }

        // Default values — real values would require user-service integration
        context.setAuthorAccountAge("30 days");
        context.setAuthorKarma(100);
        // Do NOT set isModerator=true — that would cause moderators_exempt to bypass all rules.
        // Rules are evaluated for all users by default; use moderators_exempt: false in YAML to enforce on mods too.
        context.setIsModerator(false);
        return context;
    }



    public Post getPost(String postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
        if (post.isDeleted()) {
            throw new ResourceNotFoundException("Post not found");
        }
        return post;
    }

    public Post updatePost(String postId, String requesterUsername, PostUpdateRequest request) {
        Post post = getPost(postId);
        if (!post.getAuthor().equals(requesterUsername)) {
            throw new UnauthorizedActionException("You can only edit your own posts.");
        }
        if (post.isRemoved() || post.isLocked()) {
            throw new UnauthorizedActionException("Post is locked or removed.");
        }

        if (request.getTitle() != null) post.setTitle(request.getTitle());
        if (request.getContent() != null) post.setContent(request.getContent());
        if (request.getFlair() != null) post.setFlair(request.getFlair());

        post.setEditedAt(LocalDateTime.now());
        return postRepository.save(post);
    }

    public Post deletePost(String postId, String requesterUsername) {
        Post post = getPost(postId);
        if (!post.getAuthor().equals(requesterUsername)) {
            throw new UnauthorizedActionException("You can only delete your own posts.");
        }
        post.setTitle("[deleted]");
        post.setContent("[deleted]");
        post.setAuthor("[deleted]");
        post.setDeleted(true);
        return postRepository.save(post);
    }

    @Transactional
    public int vote(String postId, String requesterUsername, int direction) {
        if (direction < -1 || direction > 1) {
            throw new IllegalArgumentException("Vote direction must be -1, 0, or 1");
        }

        Post post = getPost(postId);
        Vote vote = voteRepository.findByPostIdAndUsername(postId, requesterUsername).orElse(null);

        int previousDirection = vote != null ? vote.getDirection() : 0;

        int previousUpvoteDelta = previousDirection == 1 ? 1 : 0;
        int previousDownvoteDelta = previousDirection == -1 ? 1 : 0;
        int nextUpvoteDelta = direction == 1 ? 1 : 0;
        int nextDownvoteDelta = direction == -1 ? 1 : 0;

        if (vote != null) {
            post.setScore(post.getScore() - previousDirection + direction);
            vote.setDirection(direction);
            if (direction == 0) {
                voteRepository.delete(vote);
            } else {
                voteRepository.save(vote);
            }
        } else if (direction != 0) {
            vote = Vote.builder()
                    .postId(postId)
                    .username(requesterUsername)
                    .direction(direction)
                    .build();
            voteRepository.save(vote);
            post.setScore(post.getScore() - previousDirection + direction);
        } else {
            post.setScore(post.getScore() - previousDirection);
        }

        int nextUpvotes = post.getUpvotes() - previousUpvoteDelta + nextUpvoteDelta;
        int nextDownvotes = post.getDownvotes() - previousDownvoteDelta + nextDownvoteDelta;
        post.setUpvotes(Math.max(0, nextUpvotes));
        post.setDownvotes(Math.max(0, nextDownvotes));
        // Keep score consistent with counters even if legacy data had drift.
        post.setScore(post.getUpvotes() - post.getDownvotes());

        postRepository.save(post);
        return post.getScore();
    }

    public void savePost(String postId, String requesterUsername) {
        getPost(postId);

        if (!savedPostRepository.findByPostIdAndUsername(postId, requesterUsername).isPresent()) {
            SavedPost saved = SavedPost.builder()
                    .postId(postId)
                    .username(requesterUsername)
                    .build();
            savedPostRepository.save(saved);
        }
    }

    public void unsavePost(String postId, String requesterUsername) {
        savedPostRepository.findByPostIdAndUsername(postId, requesterUsername)
                .ifPresent(savedPostRepository::delete);
    }

    @Transactional
    public void reportPost(String postId, String reason) {
        Post post = getPost(postId);
        
        try {
            ObjectMapper mapper = new ObjectMapper();
            ArrayNode reasons = (ArrayNode) mapper.readTree(post.getReportReasons() == null ? "[]" : post.getReportReasons());
            reasons.add(reason != null ? reason : "Reported");
            post.setReportReasons(mapper.writeValueAsString(reasons));
        } catch (Exception e) {
            log.error("Error parsing report reasons", e);
            post.setReportReasons("[]");
        }
        
        post.setReports(post.getReports() + 1);
        post.setFlagged(true);
        postRepository.save(post);
    }

    public Page<Post> getReportedPosts(String subreddit, Pageable pageable) {
        // Fetch posts that have at least 1 report and are not yet removed
        return postRepository.findBySubredditAndReportsGreaterThanAndRemovedFalse(subreddit, 0, pageable);
    }

    public Page<Post> getFlaggedPosts(String subreddit, Pageable pageable) {
        // Fetch posts flagged by AutoMod OR reported by users (not removed)
        return postRepository.findBySubredditAndFlaggedOrReportedAndNotRemoved(subreddit, pageable);
    }

    @Transactional
    public void savePostInternal(Post post) {
        postRepository.save(post);
    }

    // ── Individual Mod Actions ──────────────────────────────────────────

    @Transactional
    public Post approvePost(String postId) {
        Post post = getPost(postId);
        post.setReports(0);
        post.setReportReasons("[]");
        post.setFlagged(false);
        post.setRemoved(false);
        return postRepository.save(post);
    }

    @Transactional
    public Post removePostAsMod(String postId) {
        Post post = getPost(postId);
        post.setRemoved(true);
        return postRepository.save(post);
    }

    @Transactional
    public Post lockPost(String postId) {
        Post post = getPost(postId);
        post.setLocked(true);
        return postRepository.save(post);
    }

    @Transactional
    public Post unlockPost(String postId) {
        Post post = getPost(postId);
        post.setLocked(false);
        return postRepository.save(post);
    }

    @Transactional
    public Post pinPost(String postId) {
        Post post = getPost(postId);
        post.setPinned(true);
        return postRepository.save(post);
    }

    @Transactional
    public Post unpinPost(String postId) {
        Post post = getPost(postId);
        post.setPinned(false);
        return postRepository.save(post);
    }
}
