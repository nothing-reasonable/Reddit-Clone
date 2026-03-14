package com.example.subredditservice.service;

import com.example.subredditservice.dto.*;
import com.example.subredditservice.exception.ResourceNotFoundException;
import com.example.subredditservice.exception.SubredditAlreadyExistsException;
import com.example.subredditservice.model.*;
import com.example.subredditservice.repository.SubredditMemberRepository;
import com.example.subredditservice.repository.SubredditRepository;
import com.example.subredditservice.repository.SubredditRuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubredditServiceImpl implements SubredditService {

    private final SubredditRepository subredditRepository;
    private final SubredditRuleRepository ruleRepository;
    private final SubredditMemberRepository memberRepository;

    // ───── Subreddit CRUD ─────

    @Override
    @Transactional
    public SubredditDto createSubreddit(CreateSubredditRequest request, String creatorUsername) {
        if (subredditRepository.existsByName(request.getName())) {
            throw new SubredditAlreadyExistsException("Community r/" + request.getName() + " already exists");
        }

        CommunityType communityType = CommunityType.PUBLIC;
        if (request.getType() != null) {
            try {
                communityType = CommunityType.valueOf(request.getType().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // default to PUBLIC
            }
        }

        Subreddit subreddit = Subreddit.builder()
                .name(request.getName())
                .description(request.getDescription())
                .type(communityType)
                .isNsfw(request.isNsfw())
                .creatorUsername(creatorUsername)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Subreddit saved = subredditRepository.save(subreddit);

        // Creator automatically joins as MODERATOR
        SubredditMember creatorMember = SubredditMember.builder()
                .subredditId(saved.getId())
                .username(creatorUsername)
                .role(MemberRole.MODERATOR)
                .joinedAt(LocalDateTime.now())
                .build();
        memberRepository.save(creatorMember);

        return mapToDto(saved);
    }

    @Override
    public SubredditDto getSubredditByName(String name) {
        Subreddit subreddit = subredditRepository.findByName(name)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + name));
        return mapToDto(subreddit);
    }

    @Override
    public SubredditDto getSubredditById(Long id) {
        Subreddit subreddit = subredditRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found with id: " + id));
        return mapToDto(subreddit);
    }

    @Override
    public List<SubredditDto> getAllSubreddits() {
        return subredditRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SubredditDto> searchSubreddits(String query) {
        return subredditRepository.search(query).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public SubredditDto updateSubreddit(String name, UpdateSubredditRequest request) {
        Subreddit subreddit = subredditRepository.findByName(name)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + name));

        if (request.getDescription() != null) {
            subreddit.setDescription(request.getDescription());
        }
        if (request.getLongDescription() != null) {
            subreddit.setLongDescription(request.getLongDescription());
        }
        if (request.getBannerUrl() != null) {
            subreddit.setBannerUrl(request.getBannerUrl());
        }
        if (request.getIconUrl() != null) {
            subreddit.setIconUrl(request.getIconUrl());
        }
        subreddit.setUpdatedAt(LocalDateTime.now());

        Subreddit updated = subredditRepository.save(subreddit);
        return mapToDto(updated);
    }

    @Override
    @Transactional
    public void deleteSubreddit(String name) {
        Subreddit subreddit = subredditRepository.findByName(name)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + name));
        subredditRepository.delete(subreddit);
    }

    // ───── Membership ─────

    @Override
    @Transactional
    public SubredditMemberDto joinSubreddit(String subredditName, String username) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        if (memberRepository.existsBySubredditIdAndUsername(subreddit.getId(), username)) {
            throw new IllegalStateException("Already a member of r/" + subredditName);
        }

        SubredditMember member = SubredditMember.builder()
                .subredditId(subreddit.getId())
                .username(username)
                .role(MemberRole.MEMBER)
                .joinedAt(LocalDateTime.now())
                .build();

        SubredditMember saved = memberRepository.save(member);
        return mapMemberToDto(saved);
    }

    @Override
    @Transactional
    public void leaveSubreddit(String subredditName, String username) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        SubredditMember member = memberRepository.findBySubredditIdAndUsername(subreddit.getId(), username)
                .orElseThrow(() -> new IllegalStateException("Not a member of r/" + subredditName));

        memberRepository.delete(member);
    }

    @Override
    public List<SubredditMemberDto> getMembers(String subredditName) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        return memberRepository.findBySubredditId(subreddit.getId()).stream()
                .map(this::mapMemberToDto)
                .collect(Collectors.toList());
    }

    // ───── Rules ─────

    @Override
    @Transactional
    public SubredditRuleDto addRule(String subredditName, SubredditRuleDto ruleDto) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        int nextOrder = subreddit.getRules().size();

        SubredditRule rule = SubredditRule.builder()
                .title(ruleDto.getTitle())
                .description(ruleDto.getDescription())
                .orderIndex(nextOrder)
                .subreddit(subreddit)
                .build();

        SubredditRule saved = ruleRepository.save(rule);
        return mapRuleToDto(saved);
    }

    @Override
    @Transactional
    public SubredditRuleDto updateRule(String subredditName, Long ruleId, SubredditRuleDto ruleDto) {
        // Validate subreddit exists
        subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        SubredditRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Rule not found with id: " + ruleId));

        if (ruleDto.getTitle() != null) {
            rule.setTitle(ruleDto.getTitle());
        }
        if (ruleDto.getDescription() != null) {
            rule.setDescription(ruleDto.getDescription());
        }

        SubredditRule updated = ruleRepository.save(rule);
        return mapRuleToDto(updated);
    }

    @Override
    @Transactional
    public void deleteRule(String subredditName, Long ruleId) {
        subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        SubredditRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Rule not found with id: " + ruleId));

        ruleRepository.delete(rule);
    }

    // ───── Flairs ─────

    @Override
    @Transactional
    public SubredditDto addFlair(String subredditName, String flair) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        if (subreddit.getFlairs().contains(flair)) {
            throw new IllegalStateException("Flair already exists: " + flair);
        }

        subreddit.getFlairs().add(flair);
        subreddit.setUpdatedAt(LocalDateTime.now());
        Subreddit updated = subredditRepository.save(subreddit);
        return mapToDto(updated);
    }

    @Override
    @Transactional
    public SubredditDto removeFlair(String subredditName, String flair) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        if (!subreddit.getFlairs().remove(flair)) {
            throw new ResourceNotFoundException("Flair not found: " + flair);
        }

        subreddit.setUpdatedAt(LocalDateTime.now());
        Subreddit updated = subredditRepository.save(subreddit);
        return mapToDto(updated);
    }

    // ───── Mapping helpers ─────

    private SubredditDto mapToDto(Subreddit subreddit) {
        long memberCount = memberRepository.countBySubredditId(subreddit.getId());

        List<String> moderators = memberRepository
                .findBySubredditIdAndRole(subreddit.getId(), MemberRole.MODERATOR)
                .stream()
                .map(SubredditMember::getUsername)
                .collect(Collectors.toList());

        List<SubredditRuleDto> ruleDtos = subreddit.getRules().stream()
                .map(this::mapRuleToDto)
                .collect(Collectors.toList());

        return SubredditDto.builder()
                .id(subreddit.getId())
                .name(subreddit.getName())
                .description(subreddit.getDescription())
                .longDescription(subreddit.getLongDescription())
                .type(subreddit.getType().name())
                .isNsfw(subreddit.isNsfw())
                .bannerUrl(subreddit.getBannerUrl())
                .iconUrl(subreddit.getIconUrl())
                .creatorUsername(subreddit.getCreatorUsername())
                .memberCount(memberCount)
                .rules(ruleDtos)
                .flairs(subreddit.getFlairs())
                .moderators(moderators)
                .createdAt(subreddit.getCreatedAt())
                .build();
    }

    private SubredditRuleDto mapRuleToDto(SubredditRule rule) {
        return SubredditRuleDto.builder()
                .id(rule.getId())
                .title(rule.getTitle())
                .description(rule.getDescription())
                .build();
    }

    private SubredditMemberDto mapMemberToDto(SubredditMember member) {
        return SubredditMemberDto.builder()
                .username(member.getUsername())
                .role(member.getRole().name())
                .joinedAt(member.getJoinedAt())
                .build();
    }
}
