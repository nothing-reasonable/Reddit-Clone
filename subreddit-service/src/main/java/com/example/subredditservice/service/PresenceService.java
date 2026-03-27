package com.example.subredditservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class PresenceService {

    private final StringRedisTemplate redisTemplate;

    @Value("${presence.ttl-ms:180000}")
    private long ttlMs;

    @Value("${presence.key-prefix:presence:subreddit:}")
    private String keyPrefix;

    public long touch(String subredditName, String memberKey) {
        String subredditKey = toSubredditKey(subredditName);
        String presenceMember = toMemberKey(memberKey);
        long now = System.currentTimeMillis();

        try {
            redisTemplate.opsForZSet().add(subredditKey, presenceMember, now);
            pruneExpired(subredditKey, now);
            redisTemplate.expire(subredditKey, Duration.ofMillis(ttlMs * 2));

            Long size = redisTemplate.opsForZSet().zCard(subredditKey);
            return size != null ? size : 0;
        } catch (RuntimeException ex) {
            log.warn("Presence touch failed for key {}", subredditKey, ex);
            return 0;
        }
    }

    public long countOnline(String subredditName) {
        String subredditKey = toSubredditKey(subredditName);
        long now = System.currentTimeMillis();

        try {
            pruneExpired(subredditKey, now);
            Long size = redisTemplate.opsForZSet().zCard(subredditKey);
            return size != null ? size : 0;
        } catch (RuntimeException ex) {
            log.warn("Presence read failed for key {}", subredditKey, ex);
            return 0;
        }
    }

    public long remove(String subredditName, String memberKey) {
        String subredditKey = toSubredditKey(subredditName);
        String presenceMember = toMemberKey(memberKey);
        long now = System.currentTimeMillis();

        try {
            redisTemplate.opsForZSet().remove(subredditKey, presenceMember);
            pruneExpired(subredditKey, now);
            Long size = redisTemplate.opsForZSet().zCard(subredditKey);
            return size != null ? size : 0;
        } catch (RuntimeException ex) {
            log.warn("Presence remove failed for key {}", subredditKey, ex);
            return 0;
        }
    }

    private void pruneExpired(String subredditKey, long now) {
        double maxExpiredScore = now - ttlMs;
        redisTemplate.opsForZSet().removeRangeByScore(subredditKey, Double.NEGATIVE_INFINITY, maxExpiredScore);
    }

    private String toSubredditKey(String subredditName) {
        return keyPrefix + subredditName.toLowerCase(Locale.ROOT);
    }

    private String toMemberKey(String memberKey) {
        return memberKey.toLowerCase(Locale.ROOT);
    }
}
