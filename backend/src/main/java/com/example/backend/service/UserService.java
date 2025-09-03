package com.example.backend.service;

import com.example.backend.dto.request.UserRequest;
import com.example.backend.dto.response.AgentResponse;
import com.example.backend.dto.response.TotalResponse;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
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

                webSocketBroadcastService.broadcastUserStatusChange(user, status);
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

//    public List<UserResponse> getAllUser() {
//        List<User> listUser = userRepository.findAll();
//        return listUser.stream()
//                .sorted((a, b) -> a.getId().compareTo(b.getId())) // sort tăng dần theo id
//                .map(userMapper::toResponse)
//                .toList();
//    }
//
//    public List<UserResponse> searchUser(String keyword) {
//        List<User> listUser = userRepository.findByFullNameContainingIgnoreCase(keyword);
//        return listUser.stream()
//                .sorted((a, b) -> a.getId().compareTo(b.getId())) // sort tăng dần theo id
//                .map(userMapper::toResponse)
//                .toList();
//    }

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
        webSocketBroadcastService.broadcastBlockUserMessage(id, "Bạn đã bị admin block");
        return userMapper.toResponse(savedUser);
    }

    public UserResponse unBlockUserById(Long id){
        User user = userRepository.findById(id)
                .orElseThrow(() -> BusinessException.userNotFound(id));
        user.setActive(true);
        User savedUser = userRepository.save(user);
        return userMapper.toResponse(savedUser);
    }

    public TotalResponse getTotalUsers(){
        Long totalUser = userRepository.countByRoleAndStatusNot("USER", UserStatus.OFFLINE);

        return new TotalResponse(totalUser);

    }

    public TotalResponse getTotalAgents(){
        Long totalUser = userRepository.countByRoleAndStatusNot("AGENT", UserStatus.OFFLINE);

        return new TotalResponse(totalUser);
    }

    public TotalResponse getTotalCall(){
        Long totalUser = userRepository.countByRoleAndStatus("AGENT", UserStatus.CALLING);
        return new TotalResponse(totalUser);
    }

    public Page<AgentResponse> getAllAgent(String keyword, int page, int size, String sort) {
        String[] sortParts = sort != null ? sort.split(",") : new String[]{"id", "asc"};
        String field = sortParts[0];
        Sort.Direction direction = sortParts.length > 1 && sortParts[1].equalsIgnoreCase("desc")
                ? Sort.Direction.DESC : Sort.Direction.ASC;

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, field));

        Page<User> agentPage;
        if (keyword == null || keyword.isEmpty()) {
            // không search → lấy toàn bộ agent
            agentPage = userRepository.findByRoleIn(Arrays.asList("AGENT"), pageable);
        } else {
            // search theo fullName
            agentPage = userRepository.findByRoleInAndFullNameContainingIgnoreCase(Arrays.asList("AGENT"), keyword, pageable);
        }

        return agentPage.map(user -> {
            UserMetric metric = userMetricRepository.findByUserId(user.getId())
                    .orElseThrow(() -> BusinessException.userNotFound(user.getId()));
            return userMapper.toAgentResponse(metric);
        });
    }

    public Page<UserResponse> getAllUser(String keyword, int page, int size, String sort) {
        String[] sortParts = sort != null ? sort.split(",") : new String[]{"id", "asc"};
        String field = sortParts[0];
        Sort.Direction direction = sortParts.length > 1 && sortParts[1].equalsIgnoreCase("desc")
                ? Sort.Direction.DESC : Sort.Direction.ASC;

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, field));

        Page<User> userPage;
        if (keyword == null || keyword.isEmpty()) {
            // không search → lấy toàn bộ agent
            userPage = userRepository.findByRoleIn(Arrays.asList("USER", "ADMIN"), pageable);
        } else {
            // search theo fullName
            userPage = userRepository.findByRoleInAndFullNameContainingIgnoreCase(Arrays.asList("USER", "ADMIN"), keyword, pageable);
        }

        return userPage.map(userMapper::toResponse);
    }


    public AgentResponse getDetailAgentById(Long id){
        User user = userRepository.findByIdAndRole(id, "AGENT")
                .orElseThrow(() -> BusinessException.userNotFound(id));
        UserMetric userMetric = userMetricRepository.findByUserId(user.getId())
                .orElseThrow(() -> BusinessException.userNotFound(id));

        return userMapper.toAgentResponse(userMetric);
    }

    public AgentResponse getTopByRating(){
        UserMetric userMetric = userMetricRepository.findTopByOrderByRatingDesc();
        return userMapper.toAgentResponse(userMetric);
    }

    public AgentResponse getTopByTotalCalls(){
        UserMetric userMetric = userMetricRepository.findTopByOrderByTotalCallsDesc();
        return userMapper.toAgentResponse(userMetric);
    }

    public AgentResponse getTopByTotalCallTimes(){
        UserMetric userMetric = userMetricRepository.findTopByOrderByTotalCallTimeDesc();
        return userMapper.toAgentResponse(userMetric);
    }

//    public List<AgentResponse> getAllDetailAgent(){
//        List<UserMetric> userMetric = userMetricRepository.findAll();
//        return userMetric.stream()
//                .map(userMapper:: toAgentResponse)
//                .toList();
//    }
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

    public UserResponse updateUserRole(Long id, String role){
        User user = userRepository.findById(id)
                .orElseThrow(() -> BusinessException.userNotFound(id));

        user.setRole(role);

        if (role.equals("AGENT")) {
            if (!userMetricRepository.existsByUserId(user.getId())) {
                UserMetric userMetric = new UserMetric();
                userMetric.setUser(user);
                userMetricRepository.save(userMetric);
            }
        }
        webSocketBroadcastService.broadcastBlockUserMessage(id, "Bạn được đổi role! Hãy đăng nhập lại");
        return userMapper.toResponse(userRepository.save(user));
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
