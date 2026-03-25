package com.example.contentservice.client;

import com.example.contentservice.exception.DownstreamServiceException;
import com.example.contentservice.exception.ResourceNotFoundException;
import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Component
public class SubredditClient {

    private final RestClient restClient;

    public SubredditClient(@Value("${subreddit.service.base-url:http://localhost:8082}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    public void assertSubredditExists(String subredditName) {
        try {
            SubredditLookupResponse subreddit = restClient.get()
                    .uri("/api/subreddits/{name}", subredditName)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, response) -> {
                        throw new RestClientResponseException(
                                "Subreddit lookup failed",
                                response.getStatusCode().value(),
                                response.getStatusText(),
                                response.getHeaders(),
                                null,
                                null);
                    })
                    .body(SubredditLookupResponse.class);

            if (subreddit != null && Boolean.TRUE.equals(subreddit.getArchived())) {
                throw new IllegalStateException("r/" + subredditName + " is archived. Posting is disabled.");
            }
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 404) {
                throw new ResourceNotFoundException("Subreddit not found: r/" + subredditName);
            }
            throw new DownstreamServiceException("Unable to validate subreddit right now", ex);
        } catch (RestClientException ex) {
            throw new DownstreamServiceException("Unable to validate subreddit right now", ex);
        }
    }

    /**
     * Check if a user is a moderator of the given subreddit.
     * Returns false if the check fails (non-fatal).
     */
    public boolean isModerator(String subredditName, String username) {
        try {
            ModeratorCheckResponse response = restClient.get()
                    .uri("/api/subreddits/{name}/is-moderator/{username}", subredditName, username)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, response2) -> {})
                    .body(ModeratorCheckResponse.class);
            return response != null && Boolean.TRUE.equals(response.getModerator());
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Check if a user is a member of the given subreddit.
     * Throws exception if subreddit doesn't exist or user is not a member.
     */
    public boolean isMember(String subredditName, String username) {
        try {
            MemberCheckResponse response = restClient.get()
                    .uri("/api/subreddits/{name}/is-member/{username}", subredditName, username)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, response2) -> {
                        throw new RestClientResponseException(
                                "Member check failed",
                                response2.getStatusCode().value(),
                                response2.getStatusText(),
                                response2.getHeaders(),
                                null,
                                null);
                    })
                    .body(MemberCheckResponse.class);
            return response != null && response.isMember();
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 404) {
                throw new ResourceNotFoundException("Subreddit not found: r/" + subredditName);
            }
            throw new DownstreamServiceException("Unable to validate subreddit membership", ex);
        } catch (RestClientException ex) {
            throw new DownstreamServiceException("Unable to validate subreddit membership", ex);
        }
    }

    /**
     * Check if a user is banned from the given subreddit.
     * Returns false if the check fails (non-fatal — fail open, ban check is best-effort).
     */
    public boolean isBanned(String subredditName, String username) {
        try {
            BannedCheckResponse response = restClient.get()
                    .uri("/api/subreddits/{name}/is-banned/{username}", subredditName, username)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, response2) -> {})
                    .body(BannedCheckResponse.class);
            return response != null && Boolean.TRUE.equals(response.getBanned());
        } catch (Exception e) {
            return false;
        }
    }

    @Data
    private static class SubredditLookupResponse {
        private Boolean archived;
    }

    @Data
    private static class ModeratorCheckResponse {
        private Boolean moderator;
    }

    @Data
    private static class BannedCheckResponse {
        private Boolean banned;
    }
}
