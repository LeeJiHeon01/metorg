package com.mtorg.meeting_organize.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Anthropic Messages API 최소 클라이언트.
 * 토큰 최소화 전략:
 *  - 기본 모델은 Haiku (application.properties 에서 변경 가능)
 *  - max_tokens 상한을 낮게 설정
 *  - system 프롬프트에서 "JSON 만, 설명 금지"를 강제해 출력 토큰 절약
 */
@Component
public class ClaudeClient implements LlmClient {

    private final RestClient restClient;
    private final AnthropicProperties props;
    private final ObjectMapper mapper;

    public ClaudeClient(AnthropicProperties props, ObjectMapper mapper) {
        this.props = props;
        this.mapper = mapper;
        this.restClient = RestClient.builder()
                .baseUrl(props.baseUrl())
                .defaultHeader("anthropic-version", props.version())
                .defaultHeader("content-type", "application/json")
                .build();
    }

    /**
     * 단일 턴 메시지 전송. 응답 텍스트(content[0].text)를 그대로 반환한다.
     *
     * @param system     시스템 지시문 (JSON 강제 등)
     * @param userText   사용자 입력 (MD 원문 / 수정사항 등)
     */
    public String send(String system, String userText) {
        if (props.apiKey() == null || props.apiKey().isBlank()) {
            throw new IllegalStateException(
                    "ANTHROPIC_API_KEY 가 설정되지 않았습니다. 환경변수로 API 키를 주입하세요.");
        }

        Map<String, Object> body = Map.of(
                "model", props.model(),
                "max_tokens", props.maxTokens(),
                "system", system,
                "messages", List.of(Map.of("role", "user", "content", userText)));

        String raw = restClient.post()
                .uri("/v1/messages")
                .header("x-api-key", props.apiKey())
                .body(body)
                .retrieve()
                .body(String.class);

        JsonNode res;
        try {
            res = mapper.readTree(raw == null ? "" : raw);
        } catch (Exception e) {
            throw new IllegalStateException("Claude 응답 파싱 실패: " + raw, e);
        }
        if (res == null || !res.has("content") || res.get("content").isEmpty()) {
            throw new IllegalStateException("Claude 응답이 비어 있습니다: " + raw);
        }
        return res.get("content").get(0).path("text").asText();
    }

    @Override
    public String complete(String system, String user) {
        return send(system, user);
    }

    @Override
    public String name() {
        return "anthropic";
    }
}
