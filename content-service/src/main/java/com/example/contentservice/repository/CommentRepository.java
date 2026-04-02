package com.example.contentservice.repository;

import com.example.contentservice.model.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, String> {
    Page<Comment> findByPostIdAndParentIdIsNull(String postId, Pageable pageable);
    List<Comment> findByPostIdAndParentIdIsNull(String postId);
    Page<Comment> findByPostId(String postId, Pageable pageable);
    List<Comment> findByPostId(String postId);
    List<Comment> findByParentId(String parentId);
    long countByPostId(String postId);
    void deleteByPostId(String postId);
    List<Comment> findByAuthor(String author);
}
