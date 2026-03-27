package com.example.contentservice.repository;

import com.example.contentservice.model.CommentVote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CommentVoteRepository extends JpaRepository<CommentVote, Long> {
    Optional<CommentVote> findByCommentIdAndUsername(String commentId, String username);
}
