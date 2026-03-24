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
    
    // For ModQueue - user reported posts
    Page<Post> findBySubredditAndReportsGreaterThanAndRemovedFalse(String subreddit, int reports, Pageable pageable);

    // For ModQueue - AutoMod flagged posts (flagged=true, not removed)
    Page<Post> findBySubredditAndFlaggedTrueAndRemovedFalse(String subreddit, Pageable pageable);

    // For ModQueue - combined: flagged by AutoMod OR reported by users
    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM Post p WHERE p.subreddit = :subreddit AND p.removed = false AND (p.flagged = true OR p.reports > 0)")
    Page<Post> findBySubredditAndFlaggedOrReportedAndNotRemoved(
        @org.springframework.data.repository.query.Param("subreddit") String subreddit,
        Pageable pageable);
}
