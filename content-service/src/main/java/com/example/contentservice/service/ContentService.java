package com.example.contentservice.service;

import com.example.contentservice.dto.PostCreateRequest;
import com.example.contentservice.dto.PostUpdateRequest;
import com.example.contentservice.exception.ResourceNotFoundException;
import com.example.contentservice.exception.UnauthorizedActionException;
import com.example.contentservice.model.*;
import com.example.contentservice.repository.PostRepository;
import com.example.contentservice.repository.SavedPostRepository;
import com.example.contentservice.repository.VoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ContentService {

    private final PostRepository postRepository;
    private final VoteRepository voteRepository;
    private final SavedPostRepository savedPostRepository;

    public Page<Post> getGlobalPosts(Pageable pageable) {
        return postRepository.findAll(pageable);
    }

    public Page<Post> getSubredditPosts(String subreddit, Pageable pageable) {
        return postRepository.findBySubreddit(subreddit, pageable);
    }

    public Post createPost(String subreddit, String author, PostCreateRequest request) {
        Post post = Post.builder()
                .id(UUID.randomUUID().toString())
                .subreddit(subreddit)
                .author(author)
                .title(request.getTitle())
                .content(request.getContent())
                .type(PostType.valueOf(request.getType().toUpperCase()))
                .url(request.getUrl())
                .flair(request.getFlair())
                .upvotes(1)
                .score(1)
                .build();
        return postRepository.save(post);
    }

    public Post getPost(String postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
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
        return postRepository.save(post);
    }

    public int vote(String postId, String requesterUsername, int direction) {
        Post post = getPost(postId);
        Vote vote = voteRepository.findByPostIdAndUsername(postId, requesterUsername).orElse(null);

        if (vote != null) {
            post.setScore(post.getScore() - vote.getDirection() + direction);
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
            post.setScore(post.getScore() + direction);
        }
        postRepository.save(post);
        return post.getScore();
    }

    public void savePost(String postId, String requesterUsername) {
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
}
