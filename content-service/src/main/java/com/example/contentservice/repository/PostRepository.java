package com.example.contentservice.repository;

import com.example.contentservice.model.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface PostRepository extends JpaRepository<Post, String> {
    // Feed queries - Hide AutoMod flagged posts ONLY (flagged=true AND reports=0)
    // But show user-reported posts (reports > 0) even if flagged by AutoMod
    // Also exclude user-deleted posts
    @Query("SELECT p FROM Post p WHERE p.removed = false AND p.deleted = false AND (p.reports > 0 OR p.flagged = false)")
    Page<Post> findByRemovedFalseExcludingAutoModFlaggedOnly(Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.subreddit = :subreddit AND p.removed = false AND p.deleted = false AND (p.reports > 0 OR p.flagged = false)")
    Page<Post> findBySubredditAndRemovedFalseExcludingAutoModFlaggedOnly(
        @Param("subreddit") String subreddit,
        Pageable pageable);
    
    // Original queries kept for backward compatibility - also exclude deleted
    @Query("SELECT p FROM Post p WHERE p.removed = false AND p.deleted = false")
    Page<Post> findByRemovedFalse(Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.subreddit = :subreddit AND p.removed = false AND p.deleted = false")
    Page<Post> findBySubredditAndRemovedFalse(@Param("subreddit") String subreddit, Pageable pageable);
    
    // For sorting top posts by time range - also exclude deleted
    @Query("SELECT p FROM Post p WHERE p.createdAt > :after AND p.removed = false AND p.deleted = false")
    Page<Post> findByCreatedAtAfterAndRemovedFalse(@Param("after") LocalDateTime after, Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.subreddit = :subreddit AND p.createdAt > :after AND p.removed = false AND p.deleted = false")
    Page<Post> findBySubredditAndCreatedAtAfterAndRemovedFalse(@Param("subreddit") String subreddit, @Param("after") LocalDateTime after, Pageable pageable);
    
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
