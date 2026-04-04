package com.example.modmailservice.controller;

import com.example.modmailservice.dto.CreateModMailThreadRequest;
import com.example.modmailservice.dto.ModMailThreadDto;
import com.example.modmailservice.dto.MessageDto;
import com.example.modmailservice.dto.SendModMailMessageRequest;
import com.example.modmailservice.service.ModMailService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/modmail")
public class ModMailController {

    private final ModMailService modMailService;

    public ModMailController(ModMailService modMailService) {
        this.modMailService = modMailService;
    }

    @PostMapping("/threads")
    public ResponseEntity<ModMailThreadDto> createThread(@Valid @RequestBody CreateModMailThreadRequest request,
                                                         Authentication auth) {
        ModMailThreadDto dto = modMailService.createThread(
                auth.getName(),
                request.getSubredditName(),
                request.getUsername(),
                request.getSubject(),
                request.getBody()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping("/users/threads")
    public ResponseEntity<List<ModMailThreadDto>> getUserThreads(Authentication auth) {
        return ResponseEntity.ok(modMailService.getThreadsForUser(auth.getName()));
    }

    @GetMapping("/subreddits/{subredditName}/threads")
    public ResponseEntity<List<ModMailThreadDto>> getSubredditThreads(@PathVariable String subredditName,
                                                                       Authentication auth) {
        return ResponseEntity.ok(modMailService.getThreadsForSubreddit(subredditName, auth.getName()));
    }

    @GetMapping("/threads/{threadId}/messages")
    public ResponseEntity<List<MessageDto>> getThreadMessages(@PathVariable Long threadId,
                                                              Authentication auth) {
        return ResponseEntity.ok(modMailService.getThreadMessages(threadId, auth.getName()));
    }

    @PostMapping("/threads/{threadId}/messages")
    public ResponseEntity<MessageDto> sendThreadMessage(@PathVariable Long threadId,
                                                        @Valid @RequestBody SendModMailMessageRequest request,
                                                        Authentication auth) {
        MessageDto dto = modMailService.sendThreadMessage(threadId, auth.getName(), request.getBody());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PutMapping("/threads/{threadId}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long threadId, Authentication auth) {
        modMailService.markThreadRead(threadId, auth.getName());
        return ResponseEntity.ok().build();
    }
}
