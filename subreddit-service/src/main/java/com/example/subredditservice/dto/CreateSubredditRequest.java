package com.example.subredditservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateSubredditRequest {

    @NotBlank(message = "Community name cannot be empty")
    @Size(min = 3, max = 21, message = "Community name must be between 3 and 21 characters")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Only letters, numbers, and underscores are allowed")
    private String name;

    @Size(max = 500, message = "Description must be 500 characters or less")
    private String description;

    private String type; // PUBLIC, RESTRICTED, PRIVATE

    private boolean isNsfw;
}
