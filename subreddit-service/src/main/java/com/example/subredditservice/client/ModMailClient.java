package com.example.subredditservice.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Slf4j
@Service
public class ModMailClient {

    private final RestClient restClient;
    private final String modMailBaseUrl;

    public ModMailClient(RestClient restClient,
                         @Value("${services.modmail.base-url:http://localhost:8085}") String modMailBaseUrl) {
        this.restClient = restClient;
        this.modMailBaseUrl = modMailBaseUrl;
    }

    public void sendBanMessage(String subredditName, String username, String subject, String body) {
        try {
            restClient.post()
                    .uri(modMailBaseUrl + "/api/internal/modmail/ban")
                    .body(Map.of(
                            "subredditName", subredditName,
                            "username", username,
                            "subject", subject,
                            "body", body
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            log.warn("Failed to send ban modmail for u/{} in r/{}: {}", username, subredditName, ex.getMessage());
        }
    }
}
