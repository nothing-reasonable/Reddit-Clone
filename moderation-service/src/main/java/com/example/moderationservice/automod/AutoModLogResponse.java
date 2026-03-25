package com.example.moderationservice.automod;

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
public class AutoModLogResponse {

    @JsonProperty("data")
    private List<AutoModLogEntryDto> data;

    @JsonProperty("count")
    private int count;
}
