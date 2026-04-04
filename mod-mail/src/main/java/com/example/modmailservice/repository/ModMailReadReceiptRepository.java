package com.example.modmailservice.repository;

import com.example.modmailservice.model.ModMailReadReceipt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ModMailReadReceiptRepository extends JpaRepository<ModMailReadReceipt, Long> {
    Optional<ModMailReadReceipt> findByThreadIdAndModeratorUsername(Long threadId, String moderatorUsername);
    List<ModMailReadReceipt> findByThreadId(Long threadId);
}
