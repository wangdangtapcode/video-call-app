package com.example.backend.mapper;

import com.example.backend.dto.response.RecordingResponse;
import com.example.backend.model.Recording;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface RecordingMapper {

    @Mapping(source = "status", target = "status")
    @Mapping(source = "rating", target = "rating")
    @Mapping(target = "agentFullName", ignore = true)
    @Mapping(target = "userFullName", ignore = true)
    RecordingResponse toResponse(Recording recording);

}
