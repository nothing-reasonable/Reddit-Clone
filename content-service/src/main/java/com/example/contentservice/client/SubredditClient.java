package com.example.contentservice.client;

import com.example.contentservice.exception.DownstreamServiceException;
import com.example.contentservice.exception.ResourceNotFoundException;
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
            restClient.get()
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
                    .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 404) {
                throw new ResourceNotFoundException("Subreddit not found: r/" + subredditName);
            }
            throw new DownstreamServiceException("Unable to validate subreddit right now", ex);
        } catch (RestClientException ex) {
            throw new DownstreamServiceException("Unable to validate subreddit right now", ex);
        }
    }
}
