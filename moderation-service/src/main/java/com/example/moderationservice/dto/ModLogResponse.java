package com.example.moderationservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModLogResponse {
    @JsonProperty("data")
    private List<ModLogEntryDto> data;
    
    @JsonProperty("pagination")
    private PaginationInfo pagination;
}
