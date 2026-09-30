package com.mtorg.meeting_organize.web;

import com.mtorg.meeting_organize.dto.UserDtos;
import com.mtorg.meeting_organize.service.MemberService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

/**
 * 프로젝트별 팀원 API.
 */
@RestController
@RequestMapping("/api/projects/{projectId}/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    /** 요청 본문: 기존 사용자면 userId, 새로 만들면 name */
    public record AddRequest(Long userId, String name) {}

    @GetMapping
    public List<UserDtos.Response> list(@PathVariable Long projectId) {
        return memberService.listMembers(projectId).stream().map(UserDtos.Response::from).toList();
    }

    @PostMapping
    public UserDtos.Response add(@PathVariable Long projectId, @RequestBody AddRequest req) {
        if (req.userId() != null) {
            return UserDtos.Response.from(memberService.addExisting(projectId, req.userId()));
        }
        if (req.name() != null && !req.name().isBlank()) {
            return UserDtos.Response.from(memberService.addNew(projectId, req.name().trim()));
        }
        throw new IllegalArgumentException("userId 또는 name 중 하나는 필요합니다.");
    }

    @DeleteMapping("/{userId}")
    public void remove(@PathVariable Long projectId, @PathVariable Long userId) {
        memberService.remove(projectId, userId);
    }
}
