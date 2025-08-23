package com.example.backend.controller;

import com.example.backend.dto.request.UserRequest;
import com.example.backend.dto.response.DeleteResponse;
import com.example.backend.dto.response.TotalResponse;
import com.example.backend.dto.response.UserResponse;
import com.example.backend.enums.UserStatus;
import com.example.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserService userService;


    @PutMapping("/{userId}/status")
    public ResponseEntity<Void> updateUserStatus(@PathVariable Long userId, @RequestParam UserStatus status) {
        userService.updateUserStatus(userId, status);
        return ResponseEntity.ok().build();
    }

//
    @PostMapping
    public ResponseEntity<UserResponse> createUser(@RequestBody UserRequest userRequest){
        return ResponseEntity.ok(userService.createUser(userRequest));
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUser(
            @RequestParam(required = false) String q) { // query parameter tùy chọn
        List<UserResponse> users;
        if (q == null || q.isEmpty()) {
            users = userService.getAllUser(); // trả về tất cả user
        } else {
            users = userService.searchUser(q); // tìm kiếm user theo tên
        }
        return ResponseEntity.ok(users);
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
