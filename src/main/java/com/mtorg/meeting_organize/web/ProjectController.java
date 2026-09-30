package com.mtorg.meeting_organize.web;

import com.mtorg.meeting_organize.dto.ProjectDtos;
import com.mtorg.meeting_organize.service.ProjectService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public List<ProjectDtos.Response> list(@RequestParam(required = false) Long userId) {
        return projectService.findAllForUser(userId).stream().map(ProjectDtos.Response::from).toList();
    }

    @GetMapping("/{id}")
    public ProjectDtos.Response get(@PathVariable Long id) {
        return ProjectDtos.Response.from(projectService.get(id));
    }

    @PostMapping
    public ProjectDtos.Response create(@Valid @RequestBody ProjectDtos.CreateRequest req) {
        return ProjectDtos.Response.from(projectService.create(req));
    }

    @PutMapping("/{id}")
    public ProjectDtos.Response update(@PathVariable Long id,
                                       @Valid @RequestBody ProjectDtos.UpdateRequest req) {
        return ProjectDtos.Response.from(projectService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        projectService.delete(id);
    }

    /** 여러 프로젝트 일괄 삭제 (소프트) */
    public record BulkDeleteRequest(List<Long> ids) {}

    @PostMapping("/bulk-delete")
    public Map<String, Integer> bulkDelete(@RequestBody BulkDeleteRequest req) {
        return Map.of("deleted", projectService.bulkDelete(req.ids()));
    }
}
