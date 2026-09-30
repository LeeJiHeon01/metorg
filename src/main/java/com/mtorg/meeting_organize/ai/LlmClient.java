package com.mtorg.meeting_organize.ai;

/**
 * LLM 제공자 추상화. 구현: ClaudeClient(anthropic), OpenAiClient(openai).
 * 실제 사용 구현은 application.properties 의 ai.provider 로 선택 (AiConfig).
 */
public interface LlmClient {

    /** system 지시문 + user 입력 → 응답 텍스트 */
    String complete(String system, String user);

    /** 제공자 식별자 (ai.provider 값과 매칭) */
    String name();
}
