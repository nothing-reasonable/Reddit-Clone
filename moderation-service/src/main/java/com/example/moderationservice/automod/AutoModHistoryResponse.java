package com.example.moderationservice.automod;

import java.util.List;

public record AutoModHistoryResponse(List<AutoModHistoryEntryResponse> data) {
}