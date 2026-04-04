package com.example.subredditservice.repository;

import com.example.subredditservice.model.SubredditTakeoverRequest;
import com.example.subredditservice.model.TakeoverRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubredditTakeoverRequestRepository extends JpaRepository<SubredditTakeoverRequest, Long> {
    boolean existsBySubredditIdAndRequesterUsernameAndStatus(
            Long subredditId,
            String requesterUsername,
            TakeoverRequestStatus status
    );

    List<SubredditTakeoverRequest> findBySubredditIdAndStatusOrderByRequestedAtAsc(
            Long subredditId,
            TakeoverRequestStatus status
    );

    Optional<SubredditTakeoverRequest> findByIdAndSubredditId(Long id, Long subredditId);
}
