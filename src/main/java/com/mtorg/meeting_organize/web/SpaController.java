package com.mtorg.meeting_organize.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * SPA(React Router) 딥링크 지원. /projects/**, /admin/** 등으로 직접 접근해도
 * 정적 index.html 을 반환해 클라이언트 라우터가 처리하게 한다.
 * (/api, /assets 등 실제 리소스는 각 핸들러/정적 리소스가 우선 처리)
 */
@Controller
public class SpaController {

    @RequestMapping({"/", "/projects/**", "/admin/**"})
    public String forward() {
        return "forward:/index.html";
    }
}
