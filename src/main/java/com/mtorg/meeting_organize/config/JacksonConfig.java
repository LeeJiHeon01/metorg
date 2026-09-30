package com.mtorg.meeting_organize.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring Boot 4 의 모듈형 스타터 구성에서 ObjectMapper 빈이 자동 등록되지 않아
 * 명시적으로 정의한다. findAndAddModules 로 jsr310(LocalDateTime) 등 모듈 자동 등록.
 */
@Configuration
public class JacksonConfig {

    @Bean
    @ConditionalOnMissingBean
    public ObjectMapper objectMapper() {
        return JsonMapper.builder()
                .findAndAddModules()
                .build();
    }
}
