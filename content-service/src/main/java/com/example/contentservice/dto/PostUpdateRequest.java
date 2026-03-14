package com.example.contentservice.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class PostUpdateRequest {
    
    @Size(min = 1, max = 300)
    private String title;
    
    private String content;
    private String flair;
}
