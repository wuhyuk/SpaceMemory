// src/main/java/com/memoryspace/admin/AdminUsersServlet.java
package com.memoryspace.admin;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

/**
 * 관리자 - 회원 목록 조회
 * GET /api/admin/users
 */
@WebServlet(name = "AdminUsersServlet", urlPatterns = {"/api/admin/users"})
public class AdminUsersServlet extends AbstractAdminServlet {

    private final AdminDAO adminDAO = new AdminDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        System.out.println("========== [DEBUG] AdminUsersServlet.doGet (list users) START ==========");
        System.out.println("  URI  = " + req.getRequestURI());

        // 1) 관리자 권한 체크
        if (!ensureAdmin(req, resp)) {
            System.out.println("[DEBUG] ensureAdmin failed in AdminUsersServlet.doGet");
            return;
        }
        System.out.println("[DEBUG] ensureAdmin passed in AdminUsersServlet.doGet");

        resp.setContentType("application/json; charset=UTF-8");

        try {
            // 2) DB에서 전체 사용자 + 통계 정보 조회
            List<AdminDAO.AdminUserSummary> users = adminDAO.findAllUsersWithStats();
            List<String> jsonRows = new ArrayList<>();

            for (AdminDAO.AdminUserSummary u : users) {
                StringBuilder sb = new StringBuilder();
                sb.append("{");
                sb.append("\"id\":").append(u.id).append(",");
                sb.append("\"username\":\"").append(escapeJson(u.username)).append("\",");
                sb.append("\"nickname\":\"").append(escapeJson(u.nickname)).append("\",");
                sb.append("\"email\":\"").append(escapeJson(u.email)).append("\",");
                sb.append("\"liveIn\":\"").append(escapeJson(u.liveIn)).append("\",");
                sb.append("\"role\":\"").append(escapeJson(u.role)).append("\",");

                sb.append("\"status\":\"").append(escapeJson(u.status)).append("\",");

                // 정지 종료일 (nullable)
                if (u.penaltyEndAt != null) {
                    sb.append("\"penaltyEndAt\":\"").append(u.penaltyEndAt.toString()).append("\",");
                } else {
                    sb.append("\"penaltyEndAt\":null,");
                }

                // 게시물 수 / 신고 수
                sb.append("\"postCount\":").append(u.postCount).append(",");
                sb.append("\"reportCount\":").append(u.reportCount).append(",");

                // 마지막 로그인 시간 (nullable)
                Timestamp lastLogin = u.lastLoginTime;
                if (lastLogin != null) {
                    sb.append("\"lastLoginTime\":\"").append(lastLogin.toString()).append("\"");
                } else {
                    sb.append("\"lastLoginTime\":null");
                }

                sb.append("}");
                jsonRows.add(sb.toString());
            }

            String json = "{ \"users\": [" + String.join(",", jsonRows) + "] }";
            System.out.println("[DEBUG] AdminUsersServlet.doGet response JSON length = " + json.length());
            resp.getWriter().write(json);

        } catch (SQLException e) {
            System.out.println("[DEBUG] DB error in AdminUsersServlet.doGet");
            e.printStackTrace();
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"DB error\"}");
        } finally {
            System.out.println("========== [DEBUG] AdminUsersServlet.doGet (list users) END   ==========");
        }
    }
}
