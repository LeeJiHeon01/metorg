package com.mtorg.meeting_organize.service;

import com.mtorg.meeting_organize.domain.Project;
import com.mtorg.meeting_organize.domain.ProjectMember;
import com.mtorg.meeting_organize.domain.Role;
import com.mtorg.meeting_organize.domain.User;
import com.mtorg.meeting_organize.dto.ProjectDtos;
import com.mtorg.meeting_organize.repository.ProjectMemberRepository;
import com.mtorg.meeting_organize.repository.ProjectRepository;
import com.mtorg.meeting_organize.repository.UserRepository;
import com.mtorg.meeting_organize.web.NotFoundException;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;

    public ProjectService(ProjectRepository projectRepository,
                          ProjectMemberRepository projectMemberRepository,
                          UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.userRepository = userRepository;
    }

    /**
     * 사용자별 프로젝트 목록.
     * - 관리자: 모든 프로젝트
     * - 일반 사용자: 자신이 생성했거나 팀원으로 포함된 프로젝트만
     * - userId 미지정: 안전하게 빈 목록
     */
    public List<Project> findAllForUser(Long userId) {
        List<Project> all = projectRepository.findAllByOrderByUpdatedAtDesc().stream()
                .filter(p -> !"Y".equals(p.getDeletedYn()))
                .toList();
        if (userId == null) {
            return List.of();
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user != null && user.getRole() == Role.ADMIN) {
            return all;
        }
        Set<Long> memberProjectIds = projectMemberRepository.findByUserId(userId).stream()
                .map(ProjectMember::getProjectId)
                .collect(Collectors.toSet());
        return all.stream()
                .filter(p -> userId.equals(p.getCreatedBy()) || memberProjectIds.contains(p.getId()))
                .toList();
    }

    public List<Project> findAll() {
        return projectRepository.findAllByOrderByUpdatedAtDesc();
    }

    public Project get(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("project not found: " + id));
    }

    @Transactional
    public Project create(ProjectDtos.CreateRequest req) {
        Project p = new Project();
        p.setProjectName(req.projectName());
        p.setDescription(req.description());
        p.setCreatedBy(req.createdBy());
        p.setLogo(req.logo());
        Project saved = projectRepository.save(p);

        // 생성자를 담당자로 자동 등록 (가시성 + 담당 지정용). 단, 관리자는 담당자가 아니므로 제외.
        if (req.createdBy() != null) {
            User creator = userRepository.findById(req.createdBy()).orElse(null);
            if (creator != null && creator.getRole() != Role.ADMIN
                    && !projectMemberRepository.existsByProjectIdAndUserId(saved.getId(), req.createdBy())) {
                projectMemberRepository.save(new ProjectMember(saved.getId(), req.createdBy()));
            }
        }
        return saved;
    }

    @Transactional
    public Project update(Long id, ProjectDtos.UpdateRequest req) {
        Project p = get(id);
        p.setProjectName(req.projectName());
        p.setDescription(req.description());
        if (req.logo() != null) {
            p.setLogo(req.logo());
        }
        return p;
    }

    @Transactional
    public void delete(Long id) {
        Project p = get(id);
        p.setDeletedYn("Y"); // 소프트 삭제
    }

    @Transactional
    public int bulkDelete(java.util.List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return 0;
        }
        int deleted = 0;
        for (Long id : ids) {
            Project p = projectRepository.findById(id).orElse(null);
            if (p != null && !"Y".equals(p.getDeletedYn())) {
                p.setDeletedYn("Y");
                deleted++;
            }
        }
        return deleted;
    }
}
