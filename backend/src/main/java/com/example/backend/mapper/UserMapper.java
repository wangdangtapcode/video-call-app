package com.example.backend.mapper;

import com.example.backend.dto.request.AgentRequest;
import com.example.backend.dto.request.UserRequest;
import com.example.backend.dto.response.UserResponse;
import com.example.backend.model.Role;
import com.example.backend.model.User;
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
    @Mapping(target = "status", constant = "active")
    @Mapping(target = "role", ignore = true)
    User toEntity(UserRequest userRequest);

    @Mapping(target = "role", source = "role.name")
    UserResponse toResponse(User user);


    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "email", ignore = true)
    @Mapping(target = "password", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "fullName", source = "fullName")
    void updateUserFromRequest(UserRequest userRequest, @MappingTarget User user);

    @Named("toEmail")
    default String toEmail(String fullName){
        String normalized = Normalizer.normalize(fullName, Normalizer.Form.NFD);
        String withoutDiacritics = Pattern.compile("\\p{M}").matcher(normalized).replaceAll("");
        String clean = withoutDiacritics.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
        return clean + "@example.com";
    }


}
