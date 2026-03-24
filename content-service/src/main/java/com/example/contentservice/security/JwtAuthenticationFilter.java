package com.example.contentservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;
        
        System.out.println("[DEBUG] Request - Path: " + request.getRequestURI() + ", Method: " + request.getMethod() + ", AuthHeader: " + (authHeader != null ? "present" : "MISSING"));

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            System.out.println("[DEBUG] No Bearer token found");
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        System.out.println("[DEBUG] JWT extracted: " + jwt.substring(0, Math.min(20, jwt.length())) + "...");

        try {
            username = jwtUtil.extractUsername(jwt);
            System.out.println("[DEBUG JwtAuthFilter] extracted username: " + username);
        } catch (Exception e) {
            System.out.println("[DEBUG JwtAuthFilter] extractUsername threw exception: " + e.getMessage());
            e.printStackTrace();
            filterChain.doFilter(request, response);
            return;
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            boolean valid = jwtUtil.isTokenValid(jwt);
            System.out.println("[DEBUG JwtAuthFilter] isTokenValid: " + valid);
            if (valid) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        username,
                        null,
                        Collections.emptyList()
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
                System.out.println("[DEBUG JwtAuthFilter] Successfully authenticated User: " + username);
            } else {
                System.out.println("[DEBUG JwtAuthFilter] Token is invalid");
            }
        } else {
            System.out.println("[DEBUG JwtAuthFilter] Username is null or authentication already exists");
        }
        filterChain.doFilter(request, response);
    }
}
