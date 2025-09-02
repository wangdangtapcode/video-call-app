package com.example.backend.mapper;

import com.example.backend.dto.request.UserRequest;
import com.example.backend.dto.response.AgentResponse;
import com.example.backend.dto.response.UserResponse;
import com.example.backend.model.User;
import com.example.backend.model.UserMetric;
import org.mapstruct.*;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "email", source = "fullName", qualifiedByName = "toEmail")
    @Mapping(target = "password", constant = "123456")
    @Mapping(target = "fullName", source = "fullName")
    @Mapping(target = "status", constant = "OFFLINE")
    @Mapping(target = "active", expression = "java(true)")   // ✅ sửa chỗ này
    @Mapping(target = "role", source = "role")
    User toEntity(UserRequest userRequest);

    UserResponse toResponse(User user);

    @Mapping(source = "user.id", target = "id")
    @Mapping(source = "user.fullName", target = "fullName")
    @Mapping(source = "user.email", target = "email")
    @Mapping(source = "user.status", target = "status")
    @Mapping(source = "user.role", target = "role")
    @Mapping(source = "user.active", target = "active")
    @Mapping(source = "rating", target = "rating")
    @Mapping(source = "totalCalls", target = "totalCall")
    @Mapping(source = "totalCallTime", target = "totalCallTime")
    AgentResponse toAgentResponse(UserMetric userMetric);
//    void updateUserFromRequest(UserRequest userRequest, @MappingTarget User user);

    @Named("toEmail")
    default String toEmail(String fullName){
        String normalized = Normalizer.normalize(fullName, Normalizer.Form.NFD);
        String withoutDiacritics = Pattern.compile("\\p{M}")
                .matcher(normalized)
                .replaceAll("");

        String replaced = withoutDiacritics.replace("đ", "d").replace("Đ", "D");

        String clean = replaced.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
        return clean + "@example.com";
    }



}
