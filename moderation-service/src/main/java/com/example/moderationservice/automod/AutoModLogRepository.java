package com.example.moderationservice.automod;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AutoModLogRepository extends JpaRepository<AutoModLog, String> {

    @Query("SELECT log FROM AutoModLog log " +
           "WHERE log.subredditName = :subreddit " +
           "AND (:action IS NULL OR log.action = :action) " +
           "ORDER BY log.timestamp DESC")
    List<AutoModLog> findBySubredditWithFilters(
        @Param("subreddit") String subreddit,
        @Param("action") String action
    );

    Page<AutoModLog> findBySubredditNameOrderByTimestampDesc(String subredditName, Pageable pageable);

    List<AutoModLog> findByRuleIdOrderByTimestampDesc(String ruleId);
}
