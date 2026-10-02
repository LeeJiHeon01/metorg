package com.mtorg.meeting_organize;

import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class MeetingOrganizeApplication {

    public static void main(String[] args) {
        // @CreationTimestamp(LocalDateTime) 가 JVM 기본 타임존으로 시각을 찍고,
        // 프론트는 offset 없는 문자열을 브라우저 로컬(KST)로 파싱한다.
        // 배포 컨테이너 JVM 이 UTC 이면 9시간 어긋나므로 전역을 KST 로 고정한다.
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
        SpringApplication.run(MeetingOrganizeApplication.class, args);
    }

}
