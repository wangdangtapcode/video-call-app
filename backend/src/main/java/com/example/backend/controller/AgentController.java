package com.example.backend.controller;

import com.example.backend.dto.response.*;
import com.example.backend.service.UserMetricsService;
import com.example.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/agent")
public class AgentController {
    @Autowired
    private UserService userService;

    @Autowired
    private UserMetricsService userMetricsService;
    @GetMapping
    public ResponseEntity<Page<AgentResponse>> getAllAgents(
            @RequestParam(value = "q", required = false) String keyword,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "sort", defaultValue = "id,asc") String sort
    ) {
        Page<AgentResponse> agents = userService.getAllAgent(keyword, page, size, sort);
        return ResponseEntity.ok(agents);
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

    @GetMapping("/top-rating")
    public ResponseEntity<AgentResponse> getTopByRating(){
        return ResponseEntity.ok(userService.getTopByRating());
    }

    @GetMapping("/top-total-calls")
    public ResponseEntity<AgentResponse> getTopByTotalCalls(){
        return ResponseEntity.ok(userService.getTopByTotalCalls());
    }

    @GetMapping("/top-total-call-times")
    public ResponseEntity<AgentResponse> getTopByTotalCallTimes(){
        return ResponseEntity.ok(userService.getTopByTotalCallTimes());
    }

    @GetMapping("/rating-stats")
    public ResponseEntity<Map<String, Long>> getRatingDistribution() {
        return ResponseEntity.ok(userMetricsService.getRatingDistribution());
    }

    @GetMapping("/top-efficiency")
    public ResponseEntity<List<TopEfficiencyAgentsResponse>> getTopEfficiency() {
        return ResponseEntity.ok(userMetricsService.getTopEfficiencyUsers(5));
    }
//    @GetMapping("/all")
//    public ResponseEntity<List<AgentResponse>> getAllDetailAgent(){
//        return ResponseEntity.ok(userService.getAllDetailAgent());
//    }
}
