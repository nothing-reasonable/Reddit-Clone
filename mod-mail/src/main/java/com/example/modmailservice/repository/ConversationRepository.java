package com.example.modmailservice.repository;

import com.example.modmailservice.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    @Query("SELECT c FROM Conversation c WHERE (c.user1 = :u1 AND c.user2 = :u2) OR (c.user1 = :u2 AND c.user2 = :u1)")
    Optional<Conversation> findBetweenUsers(@Param("u1") String user1, @Param("u2") String user2);

    @Query("SELECT c FROM Conversation c WHERE c.user1 = :username OR c.user2 = :username ORDER BY c.updatedAt DESC")
    List<Conversation> findAllByParticipant(@Param("username") String username);

    @Query("SELECT c FROM Conversation c WHERE c.user1 IN :participants OR c.user2 IN :participants ORDER BY c.updatedAt DESC")
    List<Conversation> findAllByParticipants(@Param("participants") List<String> participants);
}
