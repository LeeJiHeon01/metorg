package com.mtorg.meeting_organize;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class MeetingOrganizeApplication {

    public static void main(String[] args) {
        SpringApplication.run(MeetingOrganizeApplication.class, args);
    }

}
