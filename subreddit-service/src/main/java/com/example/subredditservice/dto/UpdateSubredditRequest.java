package com.example.subredditservice.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateSubredditRequest {

    @Size(max = 200, message = "Short description must be 200 characters or less")
    private String description;

    @Size(max = 1000, message = "Full description must be 1000 characters or less")
    private String longDescription;

    private String bannerUrl;

    private String iconUrl;
}
