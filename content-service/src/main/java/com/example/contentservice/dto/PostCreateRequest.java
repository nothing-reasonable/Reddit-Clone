package com.example.contentservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class PostCreateRequest {
    
    @NotBlank
    @Size(min = 1, max = 300)
    private String title;
    
    private String content;
    
    @NotNull
    private String type;
    
    private String url;
    private String flair;
}
