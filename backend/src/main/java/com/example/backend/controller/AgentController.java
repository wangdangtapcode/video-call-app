package com.example.backend.controller;

import com.example.backend.dto.response.AgentResponse;
import com.example.backend.dto.response.AgentStaticResponse;
import com.example.backend.dto.response.TotalResponse;
import com.example.backend.dto.response.UserResponse;
import com.example.backend.service.UserMetricsService;
import com.example.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/agent")
public class AgentController {
    @Autowired
    private UserService userService;

    @Autowired
    private UserMetricsService userMetricsService;
    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllAgents(){
        return ResponseEntity.ok(userService.getAllAgent());
    }
    @GetMapping("/total")
    public ResponseEntity<TotalResponse> getTotalAgents(){
        return ResponseEntity.ok(userService.getTotalAgents());
    }

    @GetMapping("/call/total")
    public ResponseEntity<TotalResponse> getTotalCall(){
        return ResponseEntity.ok(userService.getTotalCall());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AgentResponse> getDetailAgentById(@PathVariable Long id){
        return ResponseEntity.ok(userService.getDetailAgentById(id));
    }

    @GetMapping("/summary")
    public ResponseEntity<AgentStaticResponse> getStatic(){
        return ResponseEntity.ok(userMetricsService.getTotal());
    }

    @GetMapping("/all")
    public ResponseEntity<List<AgentResponse>> getAllDetailAgent(){
        return ResponseEntity.ok(userService.getAllDetailAgent());
    }
}
