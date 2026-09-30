package com.mtorg.meeting_organize.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * OpenAI Chat Completions API 최소 클라이언트.
 * 토큰 최소화: 저비용 모델(gpt-4o-mini) 기본, max_tokens 상한 낮게,
 * response_format=json_object 로 JSON 강제해 출력 토큰 절약.
 */
@Component
public class OpenAiClient implements LlmClient {

    private final RestClient restClient;
    private final OpenAiProperties props;
    private final ObjectMapper mapper;

    public OpenAiClient(OpenAiProperties props, ObjectMapper mapper) {
        this.props = props;
        this.mapper = mapper;
        this.restClient = RestClient.builder()
                .baseUrl(props.baseUrl())
                .defaultHeader("content-type", "application/json")
                .build();
    }

    @Override
    public String complete(String system, String user) {
        if (props.apiKey() == null || props.apiKey().isBlank()) {
            throw new IllegalStateException(
                    "OPENAI_API_KEY 가 설정되지 않았습니다. 환경변수로 API 키를 주입하세요.");
        }

        Map<String, Object> body = Map.of(
                "model", props.model(),
                "max_tokens", props.maxTokens(),
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "system", "content", system),
                        Map.of("role", "user", "content", user)));

        String raw = restClient.post()
                .uri("/v1/chat/completions")
                .header("Authorization", "Bearer " + props.apiKey())
                .body(body)
                .retrieve()
                .body(String.class);

        JsonNode res;
        try {
            res = mapper.readTree(raw == null ? "" : raw);
        } catch (Exception e) {
            throw new IllegalStateException("OpenAI 응답 파싱 실패: " + raw, e);
        }
        if (res == null || !res.has("choices") || res.get("choices").isEmpty()) {
            throw new IllegalStateException("OpenAI 응답이 비어 있습니다: " + raw);
        }
        return res.get("choices").get(0).path("message").path("content").asText();
    }

    @Override
    public String name() {
        return "openai";
    }
}
