package com.example.subredditservice.service;

import com.example.subredditservice.dto.*;

import java.util.List;

public interface SubredditService {

    // Subreddit CRUD
    SubredditDto createSubreddit(CreateSubredditRequest request, String creatorUsername);
    SubredditDto getSubredditByName(String name);
    SubredditDto getSubredditById(Long id);
    List<SubredditDto> getAllSubreddits();
    List<SubredditDto> searchSubreddits(String query);
    SubredditDto updateSubreddit(String name, UpdateSubredditRequest request);
    void deleteSubreddit(String name);

    // Membership
    SubredditMemberDto joinSubreddit(String subredditName, String username);
    void leaveSubreddit(String subredditName, String username);
    void resignModeratorRole(String subredditName, String username);
    void requestTakeover(String subredditName, String username);
    List<SubredditMemberDto> getMembers(String subredditName);
    List<SubredditMemberDto> getUserCommunities(String username);
    boolean isMember(String subredditName, String username);

    // Rules
    SubredditRuleDto addRule(String subredditName, SubredditRuleDto ruleDto);
    SubredditRuleDto updateRule(String subredditName, Long ruleId, SubredditRuleDto ruleDto);
    void deleteRule(String subredditName, Long ruleId);

    // Flairs
    SubredditDto addFlair(String subredditName, String flair);
    SubredditDto removeFlair(String subredditName, String flair);
}
