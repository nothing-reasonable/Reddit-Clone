package com.example.contentservice.repository;

import com.example.contentservice.model.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface PostRepository extends JpaRepository<Post, String> {
    Page<Post> findByRemovedFalse(Pageable pageable);
    Page<Post> findBySubredditAndRemovedFalse(String subreddit, Pageable pageable);
    
    // For sorting top posts by time range
    Page<Post> findByCreatedAtAfterAndRemovedFalse(LocalDateTime after, Pageable pageable);
    Page<Post> findBySubredditAndCreatedAtAfterAndRemovedFalse(String subreddit, LocalDateTime after, Pageable pageable);
    
    // For ModQueue
    Page<Post> findBySubredditAndReportsGreaterThanAndRemovedFalse(String subreddit, int reports, Pageable pageable);
}
