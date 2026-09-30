package com.mtorg.meeting_organize.web;

import com.mtorg.meeting_organize.dto.UserDtos;
import com.mtorg.meeting_organize.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserDtos.Response> list() {
        return userService.findAll().stream().map(UserDtos.Response::from).toList();
    }

    @PostMapping
    public UserDtos.Response create(@Valid @RequestBody UserDtos.CreateRequest req) {
        return UserDtos.Response.from(userService.create(req.name()));
    }

    /** 관리자: 사용자 역할 변경 (USER / ADMIN) */
    public record RoleRequest(String role) {}

    @PutMapping("/{id}/role")
    public UserDtos.Response updateRole(@PathVariable Long id, @RequestBody RoleRequest req) {
        return UserDtos.Response.from(
                userService.updateRole(id, com.mtorg.meeting_organize.domain.Role.valueOf(req.role().trim().toUpperCase())));
    }
}
