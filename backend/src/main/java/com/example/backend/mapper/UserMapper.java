package com.example.backend.mapper;

import com.example.backend.dto.request.AgentRequest;
import com.example.backend.model.Role;
import com.example.backend.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

//@Mapper(componentModel = "spring")
//public interface UserMapper {
//
//    @Mapping(target = "id", ignore = true)
//    @Mapping(target = "email", source = "agentRequest.fullName", qualifiedByName = "toEmail")
//    @Mapping(target = "password", constant = "123456")
//    @Mapping(target = "fullName", source = "agentRequest.fullName")
//    @Mapping(target = "status", constant = "active")
//    @Mapping(target = "role", source = "role")
//    User toUser(AgentRequest agentRequest, Role role);
//
//    @Named("toEmail")
//    default String toEmail(String fullName){
//        String normalized = Normalizer.normalize(fullName, Normalizer.Form.NFD);
//        String withoutDiacritics = Pattern.compile("\\p{M}").matcher(normalized).replaceAll("");
//        String clean = withoutDiacritics.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
//        return clean + "@example.com";
//    }
//}
