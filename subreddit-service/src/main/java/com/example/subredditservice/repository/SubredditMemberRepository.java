package com.example.subredditservice.repository;

import com.example.subredditservice.model.MemberRole;
import com.example.subredditservice.model.SubredditMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubredditMemberRepository extends JpaRepository<SubredditMember, Long> {
    List<SubredditMember> findBySubredditId(Long subredditId);
    List<SubredditMember> findByUsername(String username);
    Optional<SubredditMember> findBySubredditIdAndUsername(Long subredditId, String username);
    long countBySubredditId(Long subredditId);
    long countBySubredditIdAndRole(Long subredditId, MemberRole role);
    boolean existsBySubredditIdAndUsername(Long subredditId, String username);
    boolean existsBySubredditIdAndUsernameIgnoreCase(Long subredditId, String username);
    List<SubredditMember> findBySubredditIdAndRole(Long subredditId, MemberRole role);
}
