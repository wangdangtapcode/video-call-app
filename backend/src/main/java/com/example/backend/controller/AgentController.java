package com.example.backend.controller;

import com.example.backend.dto.response.TotalResponse;
import com.example.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agent")
public class AgentController {
    @Autowired
    private UserService userService;

    @GetMapping("/total")
    public ResponseEntity<TotalResponse> getTotalAgents(){
        return ResponseEntity.ok(userService.getTotalAgents());
    }

    @GetMapping("/call/total")
    public ResponseEntity<TotalResponse> getTotalCall(){
        return ResponseEntity.ok(userService.getTotalCall());
    }
}
