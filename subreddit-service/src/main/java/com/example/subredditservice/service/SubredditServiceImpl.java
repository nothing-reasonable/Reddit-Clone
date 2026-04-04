package com.example.subredditservice.service;

import com.example.subredditservice.client.ModMailClient;
import com.example.subredditservice.dto.*;
import com.example.subredditservice.exception.ResourceNotFoundException;
import com.example.subredditservice.exception.SubredditAlreadyExistsException;
import com.example.subredditservice.model.*;
import com.example.subredditservice.repository.BannedMemberRepository;
import com.example.subredditservice.repository.SubredditMemberRepository;
import com.example.subredditservice.repository.SubredditRepository;
import com.example.subredditservice.repository.SubredditRuleRepository;
import com.example.subredditservice.repository.SubredditTakeoverRequestRepository;
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
    private final SubredditTakeoverRequestRepository takeoverRequestRepository;
    private final BannedMemberRepository bannedMemberRepository;
    private final PresenceService presenceService;
    private final ModMailClient modMailClient;

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
            .archived(false)
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
    public SubredditDto updateSubreddit(String name, UpdateSubredditRequest request, String username) {
        Subreddit subreddit = subredditRepository.findByName(name)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + name));

        SubredditMember member = memberRepository.findBySubredditIdAndUsername(subreddit.getId(), username)
                .orElseThrow(() -> new IllegalStateException("Not a member of r/" + name));
        if (member.getRole() != MemberRole.MODERATOR) {
            throw new IllegalStateException("You are not a moderator of r/" + name);
        }

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
    public void deleteSubreddit(String name, String username) {
        Subreddit subreddit = subredditRepository.findByName(name)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + name));

        SubredditMember member = memberRepository.findBySubredditIdAndUsername(subreddit.getId(), username)
                .orElseThrow(() -> new IllegalStateException("Not a member of r/" + name));
        if (member.getRole() != MemberRole.MODERATOR) {
            throw new IllegalStateException("You are not a moderator of r/" + name);
        }

        subredditRepository.delete(subreddit);
    }

    // ───── Membership ─────

    @Override
    @Transactional
    public SubredditMemberDto joinSubreddit(String subredditName, String username) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        if (subreddit.isArchived()) {
            throw new IllegalStateException("r/" + subredditName + " is archived and cannot be joined.");
        }

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

        if (member.getRole() == MemberRole.MODERATOR) {
            long moderatorCount = memberRepository.countBySubredditIdAndRole(subreddit.getId(), MemberRole.MODERATOR);
            if (moderatorCount <= 1) {
                throw new IllegalStateException(
                        "You are the only moderator of r/" + subredditName +
                                ". Leave the moderator role first, then leave the community."
                );
            }
        }

        memberRepository.delete(member);

        long moderatorsRemaining = memberRepository.countBySubredditIdAndRole(subreddit.getId(), MemberRole.MODERATOR);
        if (moderatorsRemaining == 0 && !subreddit.isArchived()) {
            subreddit.setArchived(true);
            subreddit.setUpdatedAt(LocalDateTime.now());
            subredditRepository.save(subreddit);
        }
    }

    @Override
    @Transactional
    public void resignModeratorRole(String subredditName, String username) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        SubredditMember member = memberRepository.findBySubredditIdAndUsername(subreddit.getId(), username)
                .orElseThrow(() -> new IllegalStateException("Not a member of r/" + subredditName));

        if (member.getRole() != MemberRole.MODERATOR) {
            throw new IllegalStateException("You are not a moderator of r/" + subredditName);
        }

        member.setRole(MemberRole.MEMBER);
        memberRepository.save(member);

        long moderatorsRemaining = memberRepository.countBySubredditIdAndRole(subreddit.getId(), MemberRole.MODERATOR);
        if (moderatorsRemaining == 0 && !subreddit.isArchived()) {
            subreddit.setArchived(true);
            subreddit.setUpdatedAt(LocalDateTime.now());
            subredditRepository.save(subreddit);
        }
    }

    @Override
    @Transactional
    public void requestTakeover(String subredditName, String username) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        if (!subreddit.isArchived()) {
            throw new IllegalStateException("Takeover requests are only allowed for archived communities.");
        }

        boolean alreadyPending = takeoverRequestRepository
                .existsBySubredditIdAndRequesterUsernameAndStatus(
                        subreddit.getId(),
                        username,
                        TakeoverRequestStatus.PENDING
                );

        if (alreadyPending) {
            throw new IllegalStateException("You already have a pending takeover request for r/" + subredditName);
        }

        SubredditTakeoverRequest request = SubredditTakeoverRequest.builder()
                .subredditId(subreddit.getId())
                .requesterUsername(username)
                .status(TakeoverRequestStatus.PENDING)
                .requestedAt(LocalDateTime.now())
                .build();

        takeoverRequestRepository.save(request);
    }

    @Override
    @Transactional
    public void requestModeratorApplication(String subredditName, String username) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        SubredditMember member = memberRepository.findBySubredditIdAndUsername(subreddit.getId(), username)
                .orElseThrow(() -> new IllegalStateException("You must join r/" + subredditName + " before applying."));

        if (member.getRole() == MemberRole.MODERATOR) {
            throw new IllegalStateException("You are already a moderator of r/" + subredditName);
        }

        boolean alreadyPending = takeoverRequestRepository
                .existsBySubredditIdAndRequesterUsernameAndStatus(
                        subreddit.getId(),
                        username,
                        TakeoverRequestStatus.PENDING
                );

        if (alreadyPending) {
            throw new IllegalStateException("You already have a pending moderator application for r/" + subredditName);
        }

        SubredditTakeoverRequest request = SubredditTakeoverRequest.builder()
                .subredditId(subreddit.getId())
                .requesterUsername(username)
                .status(TakeoverRequestStatus.PENDING)
                .requestedAt(LocalDateTime.now())
                .build();

        takeoverRequestRepository.save(request);
    }

    @Override
    public boolean hasPendingModeratorApplication(String subredditName, String username) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        return takeoverRequestRepository.existsBySubredditIdAndRequesterUsernameAndStatus(
                subreddit.getId(),
                username,
                TakeoverRequestStatus.PENDING
        );
    }

    @Override
    public List<ModeratorApplicationDto> getPendingModeratorApplications(String subredditName, String moderatorUsername) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        assertModeratorPermission(subreddit, moderatorUsername);

        return takeoverRequestRepository
                .findBySubredditIdAndStatusOrderByRequestedAtAsc(subreddit.getId(), TakeoverRequestStatus.PENDING)
                .stream()
                .map(this::mapModeratorApplicationToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ModeratorApplicationDto resolveModeratorApplication(String subredditName, Long requestId, boolean approve, String moderatorUsername) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        assertModeratorPermission(subreddit, moderatorUsername);

        SubredditTakeoverRequest request = takeoverRequestRepository.findByIdAndSubredditId(requestId, subreddit.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Moderator application not found: " + requestId));

        if (request.getStatus() != TakeoverRequestStatus.PENDING) {
            throw new IllegalStateException("Moderator application is already resolved.");
        }

        if (approve) {
            SubredditMember member = memberRepository.findBySubredditIdAndUsername(subreddit.getId(), request.getRequesterUsername())
                    .orElseGet(() -> SubredditMember.builder()
                            .subredditId(subreddit.getId())
                            .username(request.getRequesterUsername())
                            .joinedAt(LocalDateTime.now())
                            .build());

            member.setRole(MemberRole.MODERATOR);
            if (member.getJoinedAt() == null) {
                member.setJoinedAt(LocalDateTime.now());
            }
            memberRepository.save(member);

            if (subreddit.isArchived()) {
                subreddit.setArchived(false);
                subreddit.setUpdatedAt(LocalDateTime.now());
                subredditRepository.save(subreddit);
            }

            request.setStatus(TakeoverRequestStatus.APPROVED);
        } else {
            request.setStatus(TakeoverRequestStatus.REJECTED);
        }

        SubredditTakeoverRequest saved = takeoverRequestRepository.save(request);
        return mapModeratorApplicationToDto(saved);
    }

    @Override
    public List<SubredditMemberDto> getMembers(String subredditName) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        return memberRepository.findBySubredditId(subreddit.getId()).stream()
                .map(this::mapMemberToDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<SubredditMemberDto> getUserCommunities(String username) {
        return memberRepository.findByUsername(username).stream()
                .map(this::mapMemberToDto)
                .collect(Collectors.toList());
    }

    @Override
    public boolean isMember(String subredditName, String username) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));
        return memberRepository.existsBySubredditIdAndUsername(subreddit.getId(), username);
    }

    @Override
    public long heartbeatPresence(String subredditName, String username, String clientSessionId) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        boolean isMember = memberRepository.existsBySubredditIdAndUsernameIgnoreCase(subreddit.getId(), username);
        if (!isMember) {
            return presenceService.countOnline(subreddit.getName());
        }

        String presenceMemberKey = buildPresenceMemberKey(username, clientSessionId);

        return presenceService.touch(subreddit.getName(), presenceMemberKey);
    }

    @Override
    public long leavePresence(String subredditName, String username, String clientSessionId) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        boolean isMember = memberRepository.existsBySubredditIdAndUsernameIgnoreCase(subreddit.getId(), username);
        if (!isMember) {
            return presenceService.countOnline(subreddit.getName());
        }

        String presenceMemberKey = buildPresenceMemberKey(username, clientSessionId);
        return presenceService.remove(subreddit.getName(), presenceMemberKey);
    }

    private String buildPresenceMemberKey(String username, String clientSessionId) {
        if (clientSessionId == null || clientSessionId.isBlank()) {
            return username;
        }
        return username + ":" + clientSessionId;
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
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        SubredditRule rule = ruleRepository.findByIdAndSubredditId(ruleId, subreddit.getId())
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
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        SubredditRule rule = ruleRepository.findByIdAndSubredditId(ruleId, subreddit.getId())
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

    // ───── Bans ─────

    @Override
    @Transactional
    public BannedMemberDto banUser(String subredditName, BanRequest request, String moderatorUsername) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        // Remove any existing ban first (re-ban with updated terms)
        bannedMemberRepository.findBySubredditIdAndUsername(subreddit.getId(), request.getUsername())
                .ifPresent(bannedMemberRepository::delete);

        LocalDateTime expiresAt = null;
        if (!request.isPermanent() && request.getDurationDays() != null && request.getDurationDays() > 0) {
            expiresAt = LocalDateTime.now().plusDays(request.getDurationDays());
        }

        BannedMember ban = BannedMember.builder()
                .subredditId(subreddit.getId())
                .username(request.getUsername())
                .bannedBy(moderatorUsername)
                .reason(request.getReason())
                .permanent(request.isPermanent())
                .expiresAt(expiresAt)
                .bannedAt(LocalDateTime.now())
                .build();

        BannedMember saved = bannedMemberRepository.save(ban);

        String reason = request.getReason() == null || request.getReason().isBlank()
            ? "No reason provided"
            : request.getReason();
        String subject = "You have been banned from r/" + subredditName;
        String body = "You were banned from r/" + subredditName + " by moderator u/" + moderatorUsername + ".\n\n"
            + "Reason: " + reason + "\n\n"
            + (request.isPermanent() ? "Duration: Permanent" : "Duration: " + request.getDurationDays() + " day(s)");
        modMailClient.sendBanMessage(subredditName, request.getUsername(), subject, body);

        return mapBanToDto(saved);
    }

    @Override
    @Transactional
    public void unbanUser(String subredditName, String username) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        if (!bannedMemberRepository.existsBySubredditIdAndUsername(subreddit.getId(), username)) {
            throw new ResourceNotFoundException("User is not banned from r/" + subredditName);
        }
        bannedMemberRepository.deleteBySubredditIdAndUsername(subreddit.getId(), username);
    }

    @Override
    public List<BannedMemberDto> getBannedUsers(String subredditName) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        return bannedMemberRepository.findBySubredditId(subreddit.getId()).stream()
                .map(this::mapBanToDto)
                .collect(Collectors.toList());
    }

    @Override
    public boolean isBanned(String subredditName, String username) {
        Subreddit subreddit = subredditRepository.findByName(subredditName)
                .orElseThrow(() -> new ResourceNotFoundException("Subreddit not found: r/" + subredditName));

        return bannedMemberRepository.findBySubredditIdAndUsername(subreddit.getId(), username)
                .map(ban -> {
                    // Permanent ban always applies
                    if (ban.isPermanent()) return true;
                    // Temporary ban: check if still active
                    return ban.getExpiresAt() != null && ban.getExpiresAt().isAfter(LocalDateTime.now());
                })
                .orElse(false);
    }

    // ───── Mapping helpers ─────

    private SubredditDto mapToDto(Subreddit subreddit) {
        long memberCount = memberRepository.countBySubredditId(subreddit.getId());
        long onlineCount = presenceService.countOnline(subreddit.getName());

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
                .archived(subreddit.isArchived())
                .memberCount(memberCount)
                .onlineCount(onlineCount)
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

    private BannedMemberDto mapBanToDto(BannedMember ban) {
        return BannedMemberDto.builder()
                .id(ban.getId())
                .username(ban.getUsername())
                .bannedBy(ban.getBannedBy())
                .reason(ban.getReason())
                .permanent(ban.isPermanent())
                .expiresAt(ban.getExpiresAt())
                .bannedAt(ban.getBannedAt())
                .build();
    }

    private void assertModeratorPermission(Subreddit subreddit, String username) {
        SubredditMember moderatorMember = memberRepository.findBySubredditIdAndUsername(subreddit.getId(), username)
                .orElseThrow(() -> new IllegalStateException("You are not a member of r/" + subreddit.getName()));

        if (moderatorMember.getRole() != MemberRole.MODERATOR) {
            throw new IllegalStateException("You are not a moderator of r/" + subreddit.getName());
        }
    }

    private ModeratorApplicationDto mapModeratorApplicationToDto(SubredditTakeoverRequest request) {
        return ModeratorApplicationDto.builder()
                .id(request.getId())
                .requesterUsername(request.getRequesterUsername())
                .status(request.getStatus().name())
                .requestedAt(request.getRequestedAt())
                .build();
    }
}
