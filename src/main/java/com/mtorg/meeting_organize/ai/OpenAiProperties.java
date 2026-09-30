package com.mtorg.meeting_organize.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * application.properties 의 openai.* 설정 바인딩.
 */
@ConfigurationProperties(prefix = "openai")
public record OpenAiProperties(
        String apiKey,
        String baseUrl,
        String model,
        Integer maxTokens) {

    public OpenAiProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://api.openai.com";
        }
        if (model == null || model.isBlank()) {
            model = "gpt-4o-mini";
        }
        if (maxTokens == null) {
            maxTokens = 1500;
        }
    }
}
