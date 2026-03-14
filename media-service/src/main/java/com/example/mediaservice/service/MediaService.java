package com.example.mediaservice.service;

import com.example.mediaservice.exception.ResourceNotFoundException;
import com.example.mediaservice.exception.UnauthorizedActionException;
import com.example.mediaservice.model.MediaAsset;
import com.example.mediaservice.repository.MediaAssetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MediaService {

    private final MediaAssetRepository mediaAssetRepository;

    public MediaAsset saveMediaAsset(String uploaderUsername, String contentType, String url) {
        MediaAsset asset = MediaAsset.builder()
                .id("asset-" + UUID.randomUUID().toString())
                .uploaderUsername(uploaderUsername)
                .contentType(contentType)
                .url(url)
                .build();
        return mediaAssetRepository.save(asset);
    }

    public void deleteMediaAsset(String assetId, String requesterUsername) {
        MediaAsset asset = mediaAssetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset not found"));

        if (!asset.getUploaderUsername().equals(requesterUsername)) {
            throw new UnauthorizedActionException("You can only delete your own assets");
        }
        mediaAssetRepository.delete(asset);
    }
}
