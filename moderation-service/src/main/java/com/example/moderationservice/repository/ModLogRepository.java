package com.example.moderationservice.repository;

import com.example.moderationservice.model.ModAction;
import com.example.moderationservice.model.ModLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ModLogRepository extends JpaRepository<ModLog, String> {

    /**
     * Find mod logs for a subreddit with optional filtering by action and/or moderator.
     * Results are ordered by timestamp descending (most recent first).
     */
    @Query("SELECT m FROM ModLog m WHERE m.subreddit = :subreddit " +
           "AND (:action IS NULL OR m.action = :action) " +
           "AND (:moderator IS NULL OR m.moderator = :moderator) " +
           "ORDER BY m.timestamp DESC")
    Page<ModLog> findBySubredditWithFilters(
            @Param("subreddit") String subreddit,
            @Param("action") ModAction action,
            @Param("moderator") String moderator,
            Pageable pageable);

    /**
     * Find mod logs for a subreddit with optional filtering, using cursor-based pagination.
     * Only returns entries with timestamp before the cursor timestamp.
     */
    @Query("SELECT m FROM ModLog m WHERE m.subreddit = :subreddit " +
           "AND (:action IS NULL OR m.action = :action) " +
           "AND (:moderator IS NULL OR m.moderator = :moderator) " +
           "AND m.timestamp < :cursorTimestamp " +
           "ORDER BY m.timestamp DESC")
    Page<ModLog> findBySubredditWithFiltersAfterCursor(
            @Param("subreddit") String subreddit,
            @Param("action") ModAction action,
            @Param("moderator") String moderator,
            @Param("cursorTimestamp") java.time.LocalDateTime cursorTimestamp,
            Pageable pageable);

    /**
     * Find mod logs for a subreddit ordered by most recent first.
     */
    Page<ModLog> findBySubredditOrderByTimestampDesc(String subreddit, Pageable pageable);
}
