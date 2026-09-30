package com.mtorg.meeting_organize.service;

import com.mtorg.meeting_organize.domain.Role;
import com.mtorg.meeting_organize.domain.User;
import com.mtorg.meeting_organize.repository.UserRepository;
import com.mtorg.meeting_organize.web.NotFoundException;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }

    @Transactional
    public User create(String name) {
        return userRepository.save(new User(name));
    }

    @Transactional
    public User updateRole(Long id, Role role) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("user not found: " + id));
        u.setRole(role);
        return u;
    }
}
