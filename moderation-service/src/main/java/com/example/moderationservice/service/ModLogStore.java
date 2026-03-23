package com.example.moderationservice.service;

import com.example.moderationservice.dto.ModLogEntry;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@Component
public class ModLogStore {

    private final CopyOnWriteArrayList<ModLogEntry> entries = new CopyOnWriteArrayList<>();

    public void add(ModLogEntry entry) {
        entries.add(0, entry);
    }

    public List<ModLogEntry> getBySubreddit(String subreddit) {
        return entries.stream()
                .filter(e -> subreddit.equalsIgnoreCase(e.getSubreddit()))
                .collect(Collectors.toList());
    }
}
