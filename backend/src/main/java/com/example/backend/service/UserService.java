package com.example.backend.service;

import com.example.backend.dto.request.UserRequest;
import com.example.backend.dto.response.UserResponse;
import com.example.backend.exception.BusinessException;
import com.example.backend.mapper.UserMapper;
import com.example.backend.model.Role;
import com.example.backend.model.User;
import com.example.backend.repository.RoleRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {
    @Autowired
    private UserMapper userMapper;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RoleRepository roleRepository;

    public UserResponse createUser(UserRequest userRequest){

        User user = userMapper.toEntity(userRequest);
        Role role = roleRepository.findByName(userRequest.getRole());
        user.setRole(role);

        String uniqueEmail = generateUniqueEmail(user.getEmail());
        user.setEmail(uniqueEmail);

        User savedUser = userRepository.save(user);
        return userMapper.toResponse(savedUser);
    }

    public List<UserResponse> getAllUser(){
        List<User> listUser = userRepository.findAllByStatus("active");
        return listUser.stream()
                .map(userMapper::toResponse)
                .toList();
    }

    public List<UserResponse> searchUser(String keyword){
        List<User> listUser = userRepository.findByFullNameContainingIgnoreCase(keyword);
        return listUser.stream()
                .map(userMapper::toResponse)
                .toList();
    }

    public UserResponse getUserById(Long id){
        User user = userRepository.findById(id)
                .orElseThrow(() -> BusinessException.userNotFound(id));

        return userMapper.toResponse(user);
    }

    public UserResponse updateUserById(Long id, UserRequest userRequest){
        User user = userRepository.findById(id)
                .orElseThrow(() -> BusinessException.userNotFound(id));

        userMapper.updateUserFromRequest(userRequest, user);
        User savedUser = userRepository.save(user);

        return userMapper.toResponse(savedUser);

    }

    public UserResponse deleteUserById(Long id){
        User user = userRepository.findById(id)
                .orElseThrow(() -> BusinessException.userNotFound(id));

        user.setStatus("Deleted");
        User savedUser = userRepository.save(user);

        return userMapper.toResponse(savedUser);
    }


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
