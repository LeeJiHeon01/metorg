package com.mtorg.meeting_organize.service;

import com.mtorg.meeting_organize.domain.ProjectMember;
import com.mtorg.meeting_organize.domain.User;
import com.mtorg.meeting_organize.repository.ProjectMemberRepository;
import com.mtorg.meeting_organize.repository.UserRepository;
import com.mtorg.meeting_organize.web.NotFoundException;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 프로젝트별 팀원 관리. users 테이블의 기존 사용자를 프로젝트에 추가하거나,
 * 새 사용자를 만들어 바로 추가한다.
 */
@Service
@Transactional(readOnly = true)
public class MemberService {

    private final ProjectMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final ProjectService projectService;

    public MemberService(ProjectMemberRepository memberRepository,
                         UserRepository userRepository,
                         ProjectService projectService) {
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.projectService = projectService;
    }

    /** 해당 프로젝트의 팀원 목록 (추가된 순서) */
    public List<User> listMembers(Long projectId) {
        List<Long> userIds = memberRepository.findByProjectIdOrderByCreatedAtAsc(projectId)
                .stream().map(ProjectMember::getUserId).toList();
        // 순서 보존
        return userIds.stream()
                .map(id -> userRepository.findById(id).orElse(null))
                .filter(u -> u != null)
                .toList();
    }

    /** 기존 사용자를 프로젝트에 추가 (이미 있으면 무시) */
    @Transactional
    public User addExisting(Long projectId, Long userId) {
        projectService.get(projectId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("user not found: " + userId));
        if (!memberRepository.existsByProjectIdAndUserId(projectId, userId)) {
            memberRepository.save(new ProjectMember(projectId, userId));
        }
        return user;
    }

    /** 새 사용자를 만들어 프로젝트에 추가 */
    @Transactional
    public User addNew(Long projectId, String name) {
        projectService.get(projectId);
        User user = userRepository.save(new User(name));
        memberRepository.save(new ProjectMember(projectId, user.getId()));
        return user;
    }

    /** 프로젝트에서 팀원 제외 (사용자 자체는 삭제하지 않음) */
    @Transactional
    public void remove(Long projectId, Long userId) {
        memberRepository.deleteByProjectIdAndUserId(projectId, userId);
    }
}
