package com.example.backend.service;

import com.example.backend.dto.request.UserRequest;
import com.example.backend.dto.response.UserResponse;
import com.example.backend.enums.UserStatus;
//import com.example.backend.mapper.UserMapper;
import com.example.backend.exception.BusinessException;
import com.example.backend.mapper.UserMapper;
import com.example.backend.model.User;
import com.example.backend.model.UserMetric;
import com.example.backend.repository.UserMetricRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {
    @Autowired
    private UserMapper userMapper;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private WebSocketBroadcastService webSocketBroadcastService;
    @Autowired
    private UserMetricRepository userMetricRepository;

    @Transactional
    public void updateUserStatus(Long userId, UserStatus status) {
        Optional<User> userOpt = userRepository.findById(userId);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            UserStatus oldStatus = user.getStatus();

            if (oldStatus != status) {
                user.setStatus(status);
                userRepository.save(user);

                webSocketBroadcastService.broadcastUserStatusChange(userId, status);
            }
        }
    }

    public UserStatus getUserStatus(Long userId) {
        return userRepository.findById(userId)
                .map(User::getStatus)
                .orElse(UserStatus.OFFLINE);
    }
//
    public UserResponse createUser(UserRequest userRequest){

        User user = userMapper.toEntity(userRequest);

        String uniqueEmail = generateUniqueEmail(user.getEmail());
        user.setEmail(uniqueEmail);



        User savedUser = userRepository.save(user);

        if ("AGENT".equalsIgnoreCase(userRequest.getRole())) {
            UserMetric userMetric = new UserMetric();
            userMetric.setUser(savedUser);
            userMetricRepository.save(userMetric);
        }

        return userMapper.toResponse(savedUser);
    }

    public List<UserResponse> getAllUser() {
        List<User> listUser = userRepository.findAll();
        return listUser.stream()
                .sorted((a, b) -> a.getId().compareTo(b.getId())) // sort tăng dần theo id
                .map(userMapper::toResponse)
                .toList();
    }

    public List<UserResponse> searchUser(String keyword) {
        List<User> listUser = userRepository.findByFullNameContainingIgnoreCase(keyword);
        return listUser.stream()
                .sorted((a, b) -> a.getId().compareTo(b.getId())) // sort tăng dần theo id
                .map(userMapper::toResponse)
                .toList();
    }

    //
    public UserResponse getUserById(Long id){
        User user = userRepository.findById(id)
                .orElseThrow(() -> BusinessException.userNotFound(id));

        return userMapper.toResponse(user);
    }

    public UserResponse blockUserById(Long id){
        User user = userRepository.findById(id)
                .orElseThrow(() -> BusinessException.userNotFound(id));
        user.setActive(false);
        User savedUser = userRepository.save(user);
        webSocketBroadcastService.broadcastBlockUserMessage(id);
        return userMapper.toResponse(savedUser);
    }

    public UserResponse unBlockUserById(Long id){
        User user = userRepository.findById(id)
                .orElseThrow(() -> BusinessException.userNotFound(id));
        user.setActive(true);
        User savedUser = userRepository.save(user);
        return userMapper.toResponse(savedUser);
    }

//    public UserResponse updateUserById(Long id, UserRequest userRequest){
//        User user = userRepository.findById(id)
//                .orElseThrow(() -> BusinessException.userNotFound(id));
//
//        userMapper.updateUserFromRequest(userRequest, user);
//        User savedUser = userRepository.save(user);
//
//        return userMapper.toResponse(savedUser);
//
//    }
//
    public void deleteUserById(Long id){
        User user = userRepository.findById(id)
                .orElseThrow(() -> BusinessException.userNotFound(id));

        userRepository.delete(user);
    }
//
//
    private String generateUniqueEmail(String baseEmail) {
        String localPart = baseEmail.substring(0, baseEmail.indexOf("@"));
        String domain = baseEmail.substring(baseEmail.indexOf("@"));

        String email = baseEmail;
        int counter = 1;
        while (userRepository.existsByEmail(email)) {
            email = localPart + counter + domain;
            counter++;
        }
        return email;
    }

}
