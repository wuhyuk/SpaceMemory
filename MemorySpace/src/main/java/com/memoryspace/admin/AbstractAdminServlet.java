// src/main/java/com/memoryspace/admin/AbstractAdminServlet.java
package com.memoryspace.admin;

import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;

public abstract class AbstractAdminServlet extends HttpServlet {

    /**
     * 세션에서 role을 꺼내서 ADMIN인지 확인.
     * ADMIN 아니면 403 + JSON 에러 응답 후 false.
     */
    protected boolean ensureAdmin(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpSession session = req.getSession(false);
        String role = (session == null) ? null : (String) session.getAttribute("role");

        System.out.println("[DEBUG] ensureAdmin called");
        System.out.println("        URI     = " + req.getRequestURI());
        System.out.println("        session = " + session);
        System.out.println("        role    = " + role);

        if (!"ADMIN".equals(role)) {
            System.out.println("[DEBUG] ensureAdmin -> FORBIDDEN (not ADMIN)");
            resp.setStatus(HttpServletResponse.SC_FORBIDDEN);
            resp.setContentType("application/json; charset=UTF-8");
            resp.getWriter().write("{\"error\":\"forbidden\",\"message\":\"Admin only\"}");
            return false;
        }

        System.out.println("[DEBUG] ensureAdmin -> OK");
        return true;
    }

    /**
     * 간단한 JSON 이스케이프
     */
    protected String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
