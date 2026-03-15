package com.example.subredditservice.repository;

import com.example.subredditservice.model.SubredditTakeoverRequest;
import com.example.subredditservice.model.TakeoverRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubredditTakeoverRequestRepository extends JpaRepository<SubredditTakeoverRequest, Long> {
    boolean existsBySubredditIdAndRequesterUsernameAndStatus(
            Long subredditId,
            String requesterUsername,
            TakeoverRequestStatus status
    );
}
