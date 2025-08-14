package com.example.backend.mapper;

import com.example.backend.dto.response.AgentResponse;
import com.example.backend.model.Agent;
import com.example.backend.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AgentMapper {

    @Mapping(target = "status", constant = "offline")
    @Mapping(target = "rating", constant = "0.0")
    @Mapping(target = "totalCalls", constant = "0")
    @Mapping(target = "totalCallTime", constant = "0L") // OK
    @Mapping(target = "user", source = "user")
    Agent toEntity(User user);

    @Mapping(target = "id", source = "id")
    @Mapping(target = "fullName", source = "user.fullName")
    @Mapping(target = "email", source = "user.email")
    AgentResponse toResponse(Agent agent);
}
    