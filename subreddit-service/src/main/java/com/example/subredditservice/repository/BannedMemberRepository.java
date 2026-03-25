package com.example.subredditservice.repository;

import com.example.subredditservice.model.BannedMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BannedMemberRepository extends JpaRepository<BannedMember, Long> {
    List<BannedMember> findBySubredditId(Long subredditId);
    Optional<BannedMember> findBySubredditIdAndUsername(Long subredditId, String username);
    boolean existsBySubredditIdAndUsername(Long subredditId, String username);
    void deleteBySubredditIdAndUsername(Long subredditId, String username);
}
