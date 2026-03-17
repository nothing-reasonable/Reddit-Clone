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
            System.out.println("[ModeratorAuth] Fetching from: " + subredditServiceBaseUrl + "/api/subreddits/{name}/members : " + subredditName);
            members = restClient.get()
                    .uri(subredditServiceBaseUrl + "/api/subreddits/{name}/members", subredditName)
                    .retrieve()
                    .body(SubredditMemberDto[].class);
            System.out.println("[ModeratorAuth] Fetched members count: " + (members == null ? 0 : members.length));
        } catch (RestClientException ex) {
            System.out.println("[ModeratorAuth] RestClientException thrown: " + ex.getMessage());
            ex.printStackTrace();
            throw new AuthorizationException(503, "Unable to verify moderator membership");
        }

        boolean moderator = members != null && java.util.Arrays.stream(members)
                .filter(Objects::nonNull)
                .anyMatch(member -> {
                    System.out.println("[ModeratorAuth] Checking username " + username + " against member " + member.getUsername() + " with role " + member.getRole());
                    return username.equalsIgnoreCase(member.getUsername())
                        && "MODERATOR".equalsIgnoreCase(normalize(member.getRole()));
                });

        if (!moderator) {
            System.out.println("[ModeratorAuth] REJECTING user " + username + " from mod actions on " + subredditName);
            throw new AuthorizationException(403, "Moderator role required");
        }
        System.out.println("[ModeratorAuth] SUCCESS. " + username + " is verified as moderator for " + subredditName);
    }

    private String normalize(String role) {
        return role == null ? "" : role.trim().toUpperCase(Locale.ROOT);
    }
}
