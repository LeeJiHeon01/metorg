package com.mtorg.meeting_organize.ai;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * ai.provider (openai | anthropic) 설정에 따라 사용할 LlmClient 를 선택한다.
 */
@Configuration
public class AiConfig {

    @Bean
    @Primary
    public LlmClient llmClient(List<LlmClient> clients,
                               @Value("${ai.provider:openai}") String provider) {
        return clients.stream()
                .filter(c -> provider.equalsIgnoreCase(c.name()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "알 수 없는 ai.provider=" + provider + " (openai 또는 anthropic)"));
    }
}
