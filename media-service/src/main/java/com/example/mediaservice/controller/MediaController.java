package com.example.mediaservice.controller;

import com.example.mediaservice.model.MediaAsset;
import com.example.mediaservice.service.MediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaController {

    private final MediaService mediaService;

    // We'll emulate multipart file upload for simplicity and just require a body with type/url info (for testing)
    // Real implementation would accept MultipartFile and store it somewhere.
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MediaAsset uploadMedia(Principal principal) {
        // Placeholder implementation
        return mediaService.saveMediaAsset(principal.getName(), "image/png", "http://localhost:8083/placeholder.png");
    }

    @DeleteMapping("/{assetId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMedia(@PathVariable String assetId, Principal principal) {
        mediaService.deleteMediaAsset(assetId, principal.getName());
    }
}
