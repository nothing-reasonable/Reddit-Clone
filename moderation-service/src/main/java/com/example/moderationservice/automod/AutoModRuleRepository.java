package com.example.moderationservice.automod;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AutoModRuleRepository extends JpaRepository<AutoModRule, String> {
    List<AutoModRule> findBySubredditNameOrderByPriorityAsc(String subredditName);
}
