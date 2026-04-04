package com.example.contentservice.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ModMailClient {

    @Value("${services.modmail.base-url:http://localhost:8085}")
    private String modMailBaseUrl;

    private final RestTemplate restTemplate;

    public void sendAutomodMessage(String subredditName, String username, String subject, String body) {
        String url = modMailBaseUrl + "/api/internal/modmail/automod";
        send(url, subredditName, username, subject, body);
    }

    private void send(String url, String subredditName, String username, String subject, String body) {
        try {
            Map<String, String> payload = new HashMap<>();
            payload.put("subredditName", subredditName);
            payload.put("username", username);
            payload.put("subject", subject);
            payload.put("body", body);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            restTemplate.postForEntity(url, new HttpEntity<>(payload, headers), Void.class);
        } catch (RestClientException ex) {
            log.warn("Failed to send modmail notification for u/{} in r/{}: {}", username, subredditName, ex.getMessage());
        }
    }
}
