package com.example.moderationservice.automod;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AutoModRuleHistoryRepository extends JpaRepository<AutoModRuleHistory, String> {
    List<AutoModRuleHistory> findBySubredditNameOrderByTimestampDesc(String subredditName);
}