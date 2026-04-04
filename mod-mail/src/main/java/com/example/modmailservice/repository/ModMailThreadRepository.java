package com.example.modmailservice.repository;

import com.example.modmailservice.model.ModMailThread;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModMailThreadRepository extends JpaRepository<ModMailThread, Long> {
    List<ModMailThread> findBySubredditNameOrderByUpdatedAtDesc(String subredditName);
    List<ModMailThread> findByUsernameOrderByUpdatedAtDesc(String username);
}
