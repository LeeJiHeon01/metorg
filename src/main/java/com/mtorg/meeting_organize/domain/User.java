package com.mtorg.meeting_organize.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    /** 로그인 아이디. 로그인 계정이 아닌 담당자용 사용자는 null 일 수 있음 */
    @Column(unique = true, length = 50)
    private String username;

    /** BCrypt 해시. 로그인 계정만 값이 있음 */
    @Column(length = 100)
    private String password;

    /** 표시 이름 */
    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role = Role.USER;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /** 담당자용(로그인 불가) 사용자 생성 */
    public User(String name) {
        this.name = name;
    }

    /** 로그인 계정 생성 */
    public User(String username, String password, String name, Role role) {
        this.username = username;
        this.password = password;
        this.name = name;
        this.role = role;
    }
}
