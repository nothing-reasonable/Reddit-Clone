package com.example.moderationservice.dto;

import lombok.Data;
import java.util.List;

@Data
public class ModQueueActionRequest {
    private List<String> ids;
    private String status;
}
