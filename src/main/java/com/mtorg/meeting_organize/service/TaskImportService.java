package com.mtorg.meeting_organize.service;

import com.mtorg.meeting_organize.ai.AiDtos;
import com.mtorg.meeting_organize.domain.Task;
import com.mtorg.meeting_organize.repository.TaskRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * AI(또는 사용자 확정) 작업 트리를 Task 엔티티 계층으로 저장한다.
 * parentTaskId 로 기능 → 요구사항 → 세부사항 계층을 표현.
 */
@Service
public class TaskImportService {

    private final TaskRepository taskRepository;

    public TaskImportService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @Transactional
    public List<Task> importTree(Long projectId, AiDtos.TaskTree tree) {
        List<Task> created = new ArrayList<>();
        if (tree == null || tree.tasks() == null) {
            return created;
        }
        int[] order = {0};
        for (AiDtos.TaskNode node : tree.tasks()) {
            importNode(projectId, null, node, order, created);
        }
        return created;
    }

    private void importNode(Long projectId, Long parentId, AiDtos.TaskNode node,
                            int[] order, List<Task> created) {
        if (node == null) {
            return;
        }
        Task t = new Task();
        t.setProjectId(projectId);
        t.setParentTaskId(parentId);
        t.setTitle(node.title() != null && !node.title().isBlank() ? node.title() : "(제목 없음)");
        t.setDescription(node.description());
        t.setSortOrder(order[0]++);
        t.setDueDate(LocalDate.now().plusDays(7)); // 등록 기준 마감일 기본값 = 1주일 뒤
        Task saved = taskRepository.save(t);
        created.add(saved);

        if (node.children() != null) {
            for (AiDtos.TaskNode child : node.children()) {
                importNode(projectId, saved.getId(), child, order, created);
            }
        }
    }
}
