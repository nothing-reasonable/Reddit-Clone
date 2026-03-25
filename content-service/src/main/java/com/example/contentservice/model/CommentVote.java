package com.example.contentservice.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "comment_votes", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"comment_id", "username"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "comment_id", nullable = false)
    private String commentId;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private int direction; // 1 for upvote, -1 for downvote
}
