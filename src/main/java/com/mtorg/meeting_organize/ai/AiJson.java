package com.mtorg.meeting_organize.ai;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Claude 가 코드펜스(```json ... ```)나 설명을 덧붙여도 JSON 만 뽑아내는 헬퍼.
 */
public final class AiJson {

    private AiJson() {}

    /** 원문에서 첫 '{' ~ 마지막 '}' 구간만 추출 */
    public static String extract(String raw) {
        if (raw == null || raw.isBlank()) {
            return "{}";
        }
        String s = raw.trim();
        int start = s.indexOf('{');
        int end = s.lastIndexOf('}');
        if (start >= 0 && end >= start) {
            return s.substring(start, end + 1);
        }
        return s;
    }

    public static <T> T parse(String raw, ObjectMapper mapper, Class<T> type) {
        try {
            return mapper.readValue(extract(raw), type);
        } catch (Exception e) {
            throw new IllegalStateException("AI 응답 JSON 파싱 실패: " + raw, e);
        }
    }
}
