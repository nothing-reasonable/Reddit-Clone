package com.example.moderationservice.auth;

import com.example.moderationservice.client.SubredditMemberDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Locale;
import java.util.Objects;

@Service
public class ModeratorAuthService {

    private final RestClient restClient;
    private final String subredditServiceBaseUrl;

    public ModeratorAuthService(RestClient restClient,
                                @Value("${services.subreddit.base-url}") String subredditServiceBaseUrl) {
        this.restClient = restClient;
        this.subredditServiceBaseUrl = subredditServiceBaseUrl;
    }

    public void requireModerator(String subredditName, String username) {
        if (username == null || username.isBlank()) {
            throw new AuthorizationException(401, "Authentication required");
        }
        if (subredditName == null || subredditName.isBlank()) {
            throw new IllegalArgumentException("subredditName is required");
        }

        SubredditMemberDto[] members;
        try {
            members = restClient.get()
                    .uri(subredditServiceBaseUrl + "/api/subreddits/{name}/members", subredditName)
                    .retrieve()
                    .body(SubredditMemberDto[].class);
        } catch (RestClientException ex) {
            throw new AuthorizationException(503, "Unable to verify moderator membership");
        }

        boolean moderator = members != null && java.util.Arrays.stream(members)
                .filter(Objects::nonNull)
                .anyMatch(member -> username.equalsIgnoreCase(member.getUsername())
                        && "MODERATOR".equalsIgnoreCase(normalize(member.getRole())));

        if (!moderator) {
            throw new AuthorizationException(403, "Moderator role required");
        }
    }

    private String normalize(String role) {
        return role == null ? "" : role.trim().toUpperCase(Locale.ROOT);
    }
}
