package com.example.backend.service;

import com.example.backend.dto.request.AgentRequest;
import com.example.backend.dto.response.AgentResponse;
//import com.example.backend.mapper.AgentMapper;
//import com.example.backend.mapper.UserMapper;
import com.example.backend.model.Role;
import com.example.backend.model.User;
import com.example.backend.repository.RoleRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AgentService {
//    @Autowired
//    private AgentRepository agentRepository;
//    @Autowired
//    private UserRepository userRepository;
//    @Autowired
//    private RoleRepository roleRepository;
//    @Autowired
//    private AgentMapper agentMapper;
//    @Autowired
//    private UserMapper userMapper;
//
//    public AgentResponse createAgent(AgentRequest agentRequest){
//        Role role = roleRepository.findByName("AGENT");
//
//        User user = userMapper.toUser(agentRequest, role);
//        String uniqueEmail = generateUniqueEmail(user.getEmail());
//        user.setEmail(uniqueEmail);
//
//        Agent agent = agentMapper.toEntity(user);
//
//        User savedUser = userRepository.save(user);
//        Agent savedAgent = agentRepository.save(agent);
//
//        return agentMapper.toResponse(savedAgent);
//    }
//
//    private String generateUniqueEmail(String baseEmail) {
//        String localPart = baseEmail.substring(0, baseEmail.indexOf("@"));
//        String domain = baseEmail.substring(baseEmail.indexOf("@"));
//
//        String email = baseEmail;
//        int counter = 1;
//        while (userRepository.existsByEmail(email)) {
//            email = localPart + counter + domain;
//            counter++;
//        }
//        return email;
//    }

}
