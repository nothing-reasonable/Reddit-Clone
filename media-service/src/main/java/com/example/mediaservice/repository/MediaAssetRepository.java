package com.example.mediaservice.repository;

import com.example.mediaservice.model.MediaAsset;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MediaAssetRepository extends JpaRepository<MediaAsset, String> {
}
