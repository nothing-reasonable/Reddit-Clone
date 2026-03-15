package com.example.subredditservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "subreddits")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Subreddit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 21)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(length = 1000)
    private String longDescription;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CommunityType type;

    private boolean isNsfw;

    private String bannerUrl;

    private String iconUrl;

    @Column(nullable = false)
    private String creatorUsername;

    @Column(nullable = false)
    private boolean archived;

    @OneToMany(mappedBy = "subreddit", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<SubredditRule> rules = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "subreddit_flairs", joinColumns = @JoinColumn(name = "subreddit_id"))
    @Column(name = "flair")
    @Builder.Default
    private List<String> flairs = new ArrayList<>();

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
