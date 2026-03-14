package com.example.subredditservice.repository;

import com.example.subredditservice.model.SubredditRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubredditRuleRepository extends JpaRepository<SubredditRule, Long> {
    List<SubredditRule> findBySubredditIdOrderByOrderIndexAsc(Long subredditId);
    Optional<SubredditRule> findByIdAndSubredditId(Long ruleId, Long subredditId);
    void deleteBySubredditId(Long subredditId);
}
