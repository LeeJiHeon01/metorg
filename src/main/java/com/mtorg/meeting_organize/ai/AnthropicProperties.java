package com.mtorg.meeting_organize.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * application.properties 의 anthropic.* 설정 바인딩.
 */
@ConfigurationProperties(prefix = "anthropic")
public record AnthropicProperties(
        String apiKey,
        String baseUrl,
        String version,
        String model,
        Integer maxTokens) {

    public AnthropicProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://api.anthropic.com";
        }
        if (version == null || version.isBlank()) {
            version = "2023-06-01";
        }
        if (model == null || model.isBlank()) {
            model = "claude-haiku-4-5-20251001";
        }
        if (maxTokens == null) {
            maxTokens = 1500;
        }
    }
}
