package com.example.moderationservice.testplayground;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/moderation/tests")
public class TestPlaygroundController {

    private final TestPlaygroundService service;

    public TestPlaygroundController(TestPlaygroundService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<TestPlaygroundResponse> testCustomRule(@RequestBody TestPlaygroundRequest request) {
        TestPlaygroundResponse response = service.testCustomRule(request);
        if (response.getError() != null) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }
}
