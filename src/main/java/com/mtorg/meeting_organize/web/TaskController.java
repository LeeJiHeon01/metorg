package com.mtorg.meeting_organize.web;

import com.mtorg.meeting_organize.dto.TaskDtos;
import com.mtorg.meeting_organize.service.TaskService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping("/projects/{projectId}/tasks")
    public List<TaskDtos.Response> list(@PathVariable Long projectId) {
        return taskService.findByProject(projectId).stream().map(TaskDtos.Response::from).toList();
    }

    @PostMapping("/projects/{projectId}/tasks")
    public TaskDtos.Response create(@PathVariable Long projectId,
                                    @Valid @RequestBody TaskDtos.CreateRequest req) {
        return TaskDtos.Response.from(taskService.create(projectId, req));
    }

    @PutMapping("/tasks/{id}")
    public TaskDtos.Response update(@PathVariable Long id,
                                    @Valid @RequestBody TaskDtos.UpdateRequest req) {
        return TaskDtos.Response.from(taskService.update(id, req));
    }

    @DeleteMapping("/tasks/{id}")
    public void delete(@PathVariable Long id) {
        taskService.delete(id);
    }

    /** 프로젝트 전체 작업 완료 처리 + 변경이력에 "수정본 완료" 스냅샷 기록 */
    @PostMapping("/projects/{projectId}/tasks/complete-all")
    public List<TaskDtos.Response> completeAll(@PathVariable Long projectId) {
        taskService.completeAll(projectId);
        return taskService.findByProject(projectId).stream().map(TaskDtos.Response::from).toList();
    }

    /** 최근 최종완료 취소(복구) */
    @PostMapping("/projects/{projectId}/tasks/undo-finalize")
    public Map<String, Integer> undoFinalize(@PathVariable Long projectId) {
        return Map.of("restored", taskService.undoFinalize(projectId));
    }

    /** 여러 작업에 담당자 일괄 지정 (assigneeId=null 이면 해제) */
    public record BulkAssignRequest(List<Long> taskIds, Long assigneeId) {}

    @PostMapping("/tasks/bulk-assign")
    public Map<String, Integer> bulkAssign(@RequestBody BulkAssignRequest req) {
        return Map.of("updated", taskService.bulkAssign(req.taskIds(), req.assigneeId()));
    }
}
