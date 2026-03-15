package com.example.moderationservice.testplayground;

import com.example.moderationservice.auth.ModeratorAuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/moderation/tests")
public class TestPlaygroundController {

    private final TestPlaygroundService service;
    private final ModeratorAuthService moderatorAuthService;

    public TestPlaygroundController(TestPlaygroundService service, ModeratorAuthService moderatorAuthService) {
        this.service = service;
        this.moderatorAuthService = moderatorAuthService;
    }

    @PostMapping
    public ResponseEntity<TestPlaygroundResponse> testCustomRule(@Valid @RequestBody TestPlaygroundRequest request,
                                                                 Authentication authentication) {
        moderatorAuthService.requireModerator(request.getSubredditName(), authentication.getName());
        TestPlaygroundResponse response = service.testCustomRule(request);
        if (response.getError() != null) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }
}
