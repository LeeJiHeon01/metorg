package com.mtorg.meeting_organize.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mtorg.meeting_organize.ai.AiAnalysisService;
import com.mtorg.meeting_organize.ai.AiDtos;
import com.mtorg.meeting_organize.ai.AiJson;
import com.mtorg.meeting_organize.domain.Task;
import com.mtorg.meeting_organize.dto.ChangeDtos;
import com.mtorg.meeting_organize.repository.ChangeHistoryRepository;
import com.mtorg.meeting_organize.repository.ChangeRequestRepository;
import com.mtorg.meeting_organize.repository.TaskRepository;
import com.mtorg.meeting_organize.repository.UserRepository;
import com.mtorg.meeting_organize.service.ChangeApplyService;
import com.mtorg.meeting_organize.service.ProjectService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.*;

/**
 * 추가 수정사항 입력 → 기존 작업 비교 → 반영 → 변경 이력 (기획서 5·6·7·10).
 */
@RestController
@RequestMapping("/api/projects/{projectId}")
public class ChangeController {

    private final ProjectService projectService;
    private final AiAnalysisService aiAnalysisService;
    private final ChangeApplyService changeApplyService;
    private final TaskRepository taskRepository;
    private final ChangeRequestRepository changeRequestRepository;
    private final ChangeHistoryRepository changeHistoryRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public ChangeController(ProjectService projectService,
                            AiAnalysisService aiAnalysisService,
                            ChangeApplyService changeApplyService,
                            TaskRepository taskRepository,
                            ChangeRequestRepository changeRequestRepository,
                            ChangeHistoryRepository changeHistoryRepository,
                            UserRepository userRepository,
                            ObjectMapper objectMapper) {
        this.projectService = projectService;
        this.aiAnalysisService = aiAnalysisService;
        this.changeApplyService = changeApplyService;
        this.taskRepository = taskRepository;
        this.changeRequestRepository = changeRequestRepository;
        this.changeHistoryRepository = changeHistoryRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    /** 수정내용 → Claude 가 기존 작업과 비교 → 자동 반영 (ANTHROPIC_API_KEY 필요) */
    @PostMapping("/change-requests")
    public ChangeDtos.ApplyResult analyzeAndApply(@PathVariable Long projectId,
                                                  @Valid @RequestBody ChangeDtos.CreateRequest req) {
        projectService.get(projectId);
        String currentTasksJson = buildCurrentTasksJson(projectId);
        String raw = aiAnalysisService.analyzeChangeRequest(currentTasksJson, req.content());
        AiDtos.ChangeSet set = AiJson.parse(raw, objectMapper, AiDtos.ChangeSet.class);
        return changeApplyService.apply(projectId, req.sourceType(), req.content(),
                req.createdBy(), set.changes());
    }

    /** 확정된 변경목록을 그대로 반영 — AI 초안 확정 / 키 없이 테스트 */
    @PostMapping("/change-requests/apply")
    public ChangeDtos.ApplyResult applyManual(@PathVariable Long projectId,
                                              @Valid @RequestBody ChangeDtos.ApplyRequest req) {
        projectService.get(projectId);
        return changeApplyService.apply(projectId, req.sourceType(), req.content(),
                req.createdBy(), req.changes());
    }

    @GetMapping("/change-requests")
    public List<ChangeDtos.RequestResponse> listRequests(@PathVariable Long projectId) {
        return changeRequestRepository.findByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .map(ChangeDtos.RequestResponse::from).toList();
    }

    @GetMapping("/change-history")
    public List<ChangeDtos.HistoryResponse> listHistory(@PathVariable Long projectId) {
        return changeHistoryRepository.findByProjectIdOrderByCreatedAtDesc(projectId).stream()
                .map(h -> {
                    String taskTitle = null;
                    if (h.getTaskId() != null) {
                        Task t = taskRepository.findById(h.getTaskId()).orElse(null);
                        if (t != null) {
                            taskTitle = t.getTitle();
                        }
                    }
                    // 이력의 "담당"은 작업의 현재 담당자가 아니라, 이 수정사항을 등록한 로그인 계정으로 고정한다.
                    // (담당자가 나중에 바뀌어도 이력에 기록된 등록자는 유지)
                    String registrantName = null;
                    com.mtorg.meeting_organize.domain.SourceType sourceType = null;
                    if (h.getChangeId() != null) {
                        var cr = changeRequestRepository.findById(h.getChangeId()).orElse(null);
                        if (cr != null) {
                            sourceType = cr.getSourceType();
                            if (cr.getCreatedBy() != null) {
                                registrantName = userRepository.findById(cr.getCreatedBy())
                                        .map(u -> u.getName()).orElse(null);
                            }
                        }
                    }
                    return ChangeDtos.HistoryResponse.from(h, taskTitle, registrantName, sourceType);
                })
                .toList();
    }

    /** 현재 작업 목록을 AI 전달용 최소 필드 JSON 으로 직렬화 (토큰 절약) */
    private String buildCurrentTasksJson(Long projectId) {
        List<Map<String, Object>> compact = taskRepository
                .findByProjectIdAndDeletedYnOrderBySortOrderAscIdAsc(projectId, "N")
                .stream()
                .map(this::compact)
                .collect(Collectors.toList());
        try {
            return objectMapper.writeValueAsString(Map.of("tasks", compact));
        } catch (Exception e) {
            throw new IllegalStateException("작업 목록 직렬화 실패", e);
        }
    }

    private Map<String, Object> compact(Task t) {
        java.util.HashMap<String, Object> m = new java.util.HashMap<>();
        m.put("taskId", t.getId());
        m.put("parentTaskId", t.getParentTaskId());
        m.put("title", t.getTitle());
        m.put("description", t.getDescription());
        return m;
    }
}
