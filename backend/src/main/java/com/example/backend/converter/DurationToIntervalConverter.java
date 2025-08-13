package com.example.backend.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.time.Duration;

@Converter(autoApply = true)
public class DurationToIntervalConverter implements AttributeConverter<Duration, Long> {

    @Override
    public Long convertToDatabaseColumn(Duration duration) {
        if (duration == null) return 0L;
        return duration.getSeconds();
    }

    @Override
    public Duration convertToEntityAttribute(Long dbData) {
        if (dbData == null) return Duration.ZERO;
        return Duration.ofSeconds(dbData);
    }
}