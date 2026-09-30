package com.mtorg.meeting_organize.ai;

import org.springframework.stereotype.Service;

/**
 * AI 분석 골격 (기획서 5. AI 사용 범위).
 * 실제 JSON 파싱·작업 목록 반영 로직은 MVP 구현 단계에서 채운다.
 * 여기서는 Claude 호출과 토큰 최소화 프롬프트만 정의한다.
 */
@Service
public class AiAnalysisService {

    private final LlmClient llm;

    public AiAnalysisService(LlmClient llm) {
        this.llm = llm;
    }

    private static final String INIT_SYSTEM = """
            You extract WEBSITE/HOMEPAGE development & modification tasks from a meeting or RFP markdown,
            for a web-project change-management tool.

            SCOPE (very important):
            - Include ONLY work about building or modifying the website/homepage itself:
              pages, screens, UI, features, content, data, and their functions.
            - If the document has a website-changes section (e.g. "홈페이지 수정 사항"),
              extract ONLY from that scope and IGNORE unrelated sections.
            - EXCLUDE anything not part of the website software, e.g.:
              장비 설치·운영, 하드웨어, 운영 교육, 유지보수 인력, 계약/행정/예산, 일정만 있는 항목.
              Silently drop these — do not output them.

            QUALITY:
            - Be concrete and specific. Convert vague sentences into actionable dev tasks.
              Avoid abstract umbrella titles that carry no real meaning.
            - MERGE overlapping or duplicated items into ONE task. Do NOT restate a parent as its own child.
            - Use "children" ONLY for genuine sub-components (a real breakdown of the parent),
              never to repeat the same content one level deeper.

            OUTPUT:
            - Output ONLY one compact JSON object. No markdown, no comments, no explanation.
            - EXACTLY ONE key "tasks": an array of all top-level tasks. Never output "tasks" more than once.
            - Each task: {"title": string, "description": string, "children": [ ...tasks... ]}. "children" may be [].
            - Keep Korean text in Korean.
            Example: {"tasks":[{"title":"공지사항 게시판","description":"등록/수정/삭제, 목록 페이징, 상단 고정","children":[]}]}
            """;

    private static final String CHANGE_SYSTEM = """
            You compare the current task list with a new change request and decide the edits.
            Output ONLY one compact JSON object, no markdown, no comments, no explanation.
            The object MUST have EXACTLY ONE key "changes" whose value is an array of all edits.
            Never output the "changes" key more than once.
            Each edit: {"type":"ADD|UPDATE|REMOVE","taskId":int?,"parentTaskId":int?,"title":str,"before":str?,"after":str?,"description":str?}.
            Use taskId from CURRENT_TASKS for UPDATE/REMOVE. Keep Korean text in Korean.
            Example: {"changes":[{"type":"UPDATE","taskId":12,"before":"1개월","after":"3개월"}]}
            """;

    /** 최초 MD 분석 → 작업 트리 JSON(raw) */
    public String analyzeMeetingMarkdown(String markdown) {
        return llm.complete(INIT_SYSTEM, markdown);
    }

    /** 현재 작업 목록 + 새 수정사항 → 변경사항 JSON(raw) */
    public String analyzeChangeRequest(String currentTasksJson, String changeContent) {
        String user = "CURRENT_TASKS:\n" + currentTasksJson + "\n\nCHANGE_REQUEST:\n" + changeContent;
        return llm.complete(CHANGE_SYSTEM, user);
    }
}
