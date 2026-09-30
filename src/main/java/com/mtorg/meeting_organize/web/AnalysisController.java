package com.mtorg.meeting_organize.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mtorg.meeting_organize.ai.AiAnalysisService;
import com.mtorg.meeting_organize.ai.AiDtos;
import com.mtorg.meeting_organize.ai.AiJson;
import com.mtorg.meeting_organize.domain.SourceType;
import com.mtorg.meeting_organize.domain.Task;
import com.mtorg.meeting_organize.dto.TaskDtos;
import com.mtorg.meeting_organize.service.ChangeApplyService;
import com.mtorg.meeting_organize.service.ProjectService;
import com.mtorg.meeting_organize.service.TaskImportService;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * 최초 MD 분석 → 작업 목록 자동 생성 (기획서 3·4).
 */
@RestController
@RequestMapping("/api/projects/{projectId}")
public class AnalysisController {

    private final ProjectService projectService;
    private final AiAnalysisService aiAnalysisService;
    private final TaskImportService taskImportService;
    private final ChangeApplyService changeApplyService;
    private final ObjectMapper objectMapper;

    public AnalysisController(ProjectService projectService,
                             AiAnalysisService aiAnalysisService,
                             TaskImportService taskImportService,
                             ChangeApplyService changeApplyService,
                             ObjectMapper objectMapper) {
        this.projectService = projectService;
        this.aiAnalysisService = aiAnalysisService;
        this.taskImportService = taskImportService;
        this.changeApplyService = changeApplyService;
        this.objectMapper = objectMapper;
    }

    /**
     * .md 파일 업로드 → Claude/GPT 분석 → 작업 트리 생성 (API 키 필요).
     * sourceType(회의/테스트/고객요청) 이 있으면 변경이력에 "추가"로 기록한다.
     */
    @PostMapping(value = "/tasks/import-md", consumes = "multipart/form-data")
    public List<TaskDtos.Response> importMarkdown(@PathVariable Long projectId,
                                                  @RequestParam("file") MultipartFile file,
                                                  @RequestParam(value = "sourceType", required = false) String sourceType,
                                                  @RequestParam(value = "createdBy", required = false) Long createdBy)
            throws IOException {
        projectService.get(projectId); // 존재 검증
        String markdown = new String(file.getBytes(), StandardCharsets.UTF_8);
        String raw = aiAnalysisService.analyzeMeetingMarkdown(markdown);
        AiDtos.TaskTree tree = AiJson.parse(raw, objectMapper, AiDtos.TaskTree.class);
        List<Task> created = taskImportService.importTree(projectId, tree);

        if (sourceType != null && !sourceType.isBlank()) {
            SourceType st = SourceType.valueOf(sourceType.trim().toUpperCase());
            String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "업로드 파일";
            changeApplyService.recordInitialImport(projectId, st, "최초 MD 분석: " + filename, createdBy, created);
        }
        return created.stream().map(TaskDtos.Response::from).toList();
    }

    /**
     * MD/TXT 파일을 AI로 분석만 하고 저장하지 않음 (미리보기용). 결과 트리를 반환.
     */
    @PostMapping(value = "/tasks/analyze-md", consumes = "multipart/form-data")
    public AiDtos.TaskTree analyzeMarkdown(@PathVariable Long projectId,
                                           @RequestParam("file") MultipartFile file) throws IOException {
        projectService.get(projectId);
        String markdown = new String(file.getBytes(), StandardCharsets.UTF_8);
        String raw = aiAnalysisService.analyzeMeetingMarkdown(markdown);
        return AiJson.parse(raw, objectMapper, AiDtos.TaskTree.class);
    }

    /** 확정된 작업 트리(JSON)를 저장. sourceType 지정 시 변경이력에 "추가"로 기록. */
    public record ImportTreeRequest(AiDtos.TaskTree tree, String sourceType, Long createdBy) {}

    @PostMapping("/tasks/import-tree")
    public List<TaskDtos.Response> importTree(@PathVariable Long projectId,
                                              @RequestBody ImportTreeRequest req) {
        projectService.get(projectId);
        List<Task> created = taskImportService.importTree(projectId, req.tree());
        if (req.sourceType() != null && !req.sourceType().isBlank()) {
            SourceType st = SourceType.valueOf(req.sourceType().trim().toUpperCase());
            changeApplyService.recordInitialImport(projectId, st, "회의록 분석 반영", req.createdBy(), created);
        }
        return created.stream().map(TaskDtos.Response::from).toList();
    }
}
