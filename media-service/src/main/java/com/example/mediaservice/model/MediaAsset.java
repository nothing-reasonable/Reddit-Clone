package com.example.mediaservice.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "media_assets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MediaAsset {

    @Id
    private String id;

    @Column(nullable = false)
    private String uploaderUsername;

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false)
    private String url;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
