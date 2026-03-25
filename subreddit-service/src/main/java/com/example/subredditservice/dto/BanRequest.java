package com.example.subredditservice.dto;

import lombok.Data;

@Data
public class BanRequest {
    private String username;
    private String reason;
    private boolean permanent;
    private Integer durationDays; // used only when permanent = false
}
