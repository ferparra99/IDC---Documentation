package com.idc.timetracker;

import com.idc.timetracker.common.config.DatabaseUrlConverter;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class TimetrackerApplication {
    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(TimetrackerApplication.class);
        app.addListeners(new DatabaseUrlConverter());
        app.run(args);
    }
}
