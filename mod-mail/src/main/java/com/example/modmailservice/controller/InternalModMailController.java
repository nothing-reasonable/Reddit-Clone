package com.example.modmailservice.controller;

import com.example.modmailservice.dto.CreateSystemModMailRequest;
import com.example.modmailservice.dto.ModMailThreadDto;
import com.example.modmailservice.model.ModMailSenderType;
import com.example.modmailservice.service.ModMailService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/internal/modmail")
public class InternalModMailController {

    private final ModMailService modMailService;

    public InternalModMailController(ModMailService modMailService) {
        this.modMailService = modMailService;
    }

    @PostMapping("/automod")
    public ResponseEntity<ModMailThreadDto> createAutomodThread(@Valid @RequestBody CreateSystemModMailRequest request) {
        ModMailThreadDto dto = modMailService.createSystemThread(
                request.getSubredditName(),
                request.getUsername(),
                request.getSubject(),
                request.getBody(),
                ModMailSenderType.AUTOMOD
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PostMapping("/ban")
    public ResponseEntity<ModMailThreadDto> createBanThread(@Valid @RequestBody CreateSystemModMailRequest request) {
        ModMailThreadDto dto = modMailService.createSystemThread(
                request.getSubredditName(),
                request.getUsername(),
                request.getSubject(),
                request.getBody(),
                ModMailSenderType.MODERATOR
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }
}
