package com.example.modmailservice.repository;

import com.example.modmailservice.model.ModMailMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ModMailMessageRepository extends JpaRepository<ModMailMessage, Long> {
    List<ModMailMessage> findByThreadIdOrderByCreatedAtAsc(Long threadId);
    ModMailMessage findTopByThreadIdOrderByCreatedAtDesc(Long threadId);
}
