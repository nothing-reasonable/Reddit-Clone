package com.example.contentservice.dto;

import lombok.Data;

@Data
public class VoteRequest {
    private int direction; // 1, -1, 0
}
