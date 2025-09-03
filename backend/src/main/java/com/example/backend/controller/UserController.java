package com.example.backend.controller;

import com.example.backend.dto.request.RoleRequest;
import com.example.backend.dto.request.UserRequest;
import com.example.backend.dto.response.AgentResponse;
import com.example.backend.dto.response.DeleteResponse;
import com.example.backend.dto.response.TotalResponse;
import com.example.backend.dto.response.UserResponse;
import com.example.backend.enums.UserStatus;
import com.example.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserService userService;


    @PutMapping("/{userId}/status")
    public ResponseEntity<Map<String, String>> updateUserStatus(@PathVariable Long userId, @RequestParam UserStatus status) {
        userService.updateUserStatus(userId, status);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Status updated successfully");
        response.put("status", status.toString());

        return ResponseEntity.ok(response);
    }
//
    @PostMapping
    public ResponseEntity<UserResponse> createUser(@RequestBody UserRequest userRequest){
        return ResponseEntity.ok(userService.createUser(userRequest));
    }

    @GetMapping
    public ResponseEntity<Page<UserResponse>> getAllAgents(
            @RequestParam(value = "q", required = false) String keyword,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "sort", defaultValue = "id,asc") String sort
    ) {
        Page<UserResponse> users = userService.getAllUser(keyword, page, size, sort);
        return ResponseEntity.ok(users);
    }

    @PutMapping("/{id}/update-role")
    public ResponseEntity<UserResponse> updateRole(@PathVariable Long id, @RequestBody RoleRequest roleRequest){
        String role = roleRequest.getRole();
        return ResponseEntity.ok(userService.updateUserRole(id, role));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id){
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PutMapping("/{id}/block")
    public ResponseEntity<UserResponse> blockUserById(@PathVariable Long id){
        return ResponseEntity.ok(userService.blockUserById(id));
    }

    @PutMapping("/{id}/unblock")
    public ResponseEntity<UserResponse> unBlockUserById(@PathVariable Long id){
        return ResponseEntity.ok(userService.unBlockUserById(id));
    }

    @GetMapping("/total")
    public ResponseEntity<TotalResponse> getTotalUser(){
        return ResponseEntity.ok(userService.getTotalUsers());
    }
//
//    @PutMapping("/{id}")
//    public ResponseEntity<UserResponse> updateUserById(@PathVariable Long id, @RequestBody UserRequest userRequest){
//        return ResponseEntity.ok(userService.updateUserById(id, userRequest));
//    }
//
    @DeleteMapping("/{id}")
    public ResponseEntity<DeleteResponse> deleteUserById(@PathVariable Long id){
        userService.deleteUserById(id);

        DeleteResponse deleteResponse = new DeleteResponse("Delete successfully!");
        return ResponseEntity.ok(deleteResponse);
    }
}
