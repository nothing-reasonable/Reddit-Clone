package com.example.contentservice.repository;

import com.example.contentservice.model.SavedPost;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface SavedPostRepository extends JpaRepository<SavedPost, Long> {
    Optional<SavedPost> findByPostIdAndUsername(String postId, String username);
}
