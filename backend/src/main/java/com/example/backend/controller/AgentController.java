package com.example.backend.controller;

import com.example.backend.dto.request.AgentRequest;
import com.example.backend.dto.response.AgentResponse;
import com.example.backend.service.AgentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agent")
public class AgentController {
    @Autowired
    private AgentService agentService;

    @PostMapping
    public ResponseEntity<AgentResponse> createAgent(@RequestBody AgentRequest agentRequest){
        return ResponseEntity.ok(agentService.createAgent(agentRequest));
    }
}
