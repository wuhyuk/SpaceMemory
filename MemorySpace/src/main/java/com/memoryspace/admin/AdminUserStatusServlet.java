// src/main/java/com/memoryspace/admin/AdminUserStatusServlet.java
package com.memoryspace.admin;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.sql.SQLException;

/**
 * 관리자 - 사용자 상태 변경 서블릿
 *
 * 최종 엔드포인트:
 *   POST /api/admin/users/status
 *
 * 파라미터:
 *   - userId: long (필수)
 *   - status: "ACTIVE" | "SUSPENDED" | "BANNED" (필수)
 *   - penaltyDays: 정지 일수 (SUSPENDED일 때만 필수, 1 이상)
 */
@WebServlet(
        name = "AdminUserStatusServlet",
        urlPatterns = {
                "/api/admin/users/status"   // ⚡ M_User.jsx 에서 호출하는 URL과 정확히 맞춤
        }
)
public class AdminUserStatusServlet extends AbstractAdminServlet {

    private final AdminDAO adminDAO = new AdminDAO();

    /**
     * 디버깅용 GET 핸들러
     * 브라우저에서 직접 GET /api/admin/users/status 를 호출해서
     * 매핑/권한이 제대로 되는지만 확인할 수 있음.
     */
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        System.out.println("========== [DEBUG] AdminUserStatusServlet.doGet ==========");
        System.out.println("  URI   = " + req.getRequestURI());
        System.out.println("  method= " + req.getMethod());

        if (!ensureAdmin(req, resp)) {
            System.out.println("[DEBUG] ensureAdmin failed in doGet");
            return;
        }

        resp.setContentType("application/json; charset=UTF-8");
        resp.getWriter().write("{\"ok\":true,\"message\":\"AdminUserStatusServlet GET reachable\"}");
    }

    /**
     * 실제 상태 변경 로직 (정지/해제/영구 정지 등)
     */
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        System.out.println("========== [DEBUG] AdminUserStatusServlet.doPost ==========");
        System.out.println("  URI   = " + req.getRequestURI());
        System.out.println("  method= " + req.getMethod());

        // 1) 관리자 권한 체크
        if (!ensureAdmin(req, resp)) {
            System.out.println("[DEBUG] ensureAdmin failed in doPost");
            return;
        }
        System.out.println("[DEBUG] ensureAdmin passed in doPost");

        req.setCharacterEncoding("UTF-8");
        resp.setContentType("application/json; charset=UTF-8");

        // 들어온 파라미터 모두 로그로 찍기
        req.getParameterMap().forEach((k, v) -> {
            String joined = String.join(",", v);
            System.out.println("  Param [" + k + "] = " + joined);
        });

        String userIdParam      = req.getParameter("userId");
        String status           = req.getParameter("status");
        String penaltyDaysParam = req.getParameter("penaltyDays");

        System.out.println("[DEBUG] Raw params:");
        System.out.println("        userId      = " + userIdParam);
        System.out.println("        status      = " + status);
        System.out.println("        penaltyDays = " + penaltyDaysParam);

        // 2) 필수 파라미터 검증
        if (userIdParam == null || userIdParam.isBlank()
                || status == null || status.isBlank()) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("{\"success\":false,\"message\":\"userId and status are required\"}");
            return;
        }

        long userId;
        try {
            userId = Long.parseLong(userIdParam);
        } catch (NumberFormatException e) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("{\"success\":false,\"message\":\"invalid userId\"}");
            return;
        }

        status = status.toUpperCase();

        // 3) SUSPENDED 인 경우 penaltyDays 필수
        Integer penaltyDays = null;
        if ("SUSPENDED".equals(status)) {
            if (penaltyDaysParam == null || penaltyDaysParam.isBlank()) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                resp.getWriter().write("{\"success\":false,\"message\":\"penaltyDays is required for SUSPENDED\"}");
                return;
            }
            try {
                penaltyDays = Integer.parseInt(penaltyDaysParam);
                if (penaltyDays <= 0) throw new NumberFormatException();
            } catch (NumberFormatException e) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                resp.getWriter().write("{\"success\":false,\"message\":\"invalid penaltyDays\"}");
                return;
            }
        }

        // 4) DB 업데이트 실행
        try {
            System.out.println("[DEBUG] Calling adminDAO.updateUserStatus(userId="
                    + userId + ", status=" + status + ", penaltyDays=" + penaltyDays + ")");

            AdminDAO.AdminUserSummary updated =
                    adminDAO.updateUserStatus(userId, status, penaltyDays);

            if (updated == null) {
                resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
                resp.getWriter().write("{\"success\":false,\"message\":\"user not found\"}");
                return;
            }

            // penaltyEndAt JSON 포맷
            String penaltyJson = (updated.penaltyEndAt != null)
                    ? "\"" + updated.penaltyEndAt.toString() + "\""
                    : "null";

            String json = String.format(
                    "{" +
                        "\"success\":true," +
                        "\"user\":{" +
                            "\"id\":%d," +
                            "\"username\":\"%s\"," +
                            "\"nickname\":\"%s\"," +
                            "\"email\":\"%s\"," +
                            "\"liveIn\":\"%s\"," +
                            "\"role\":\"%s\"," +
                            "\"status\":\"%s\"," +
                            "\"penaltyEndAt\":%s" +
                        "}" +
                    "}",
                    updated.id,
                    escapeJson(updated.username),
                    escapeJson(updated.nickname),
                    escapeJson(updated.email),
                    escapeJson(updated.liveIn),
                    escapeJson(updated.role),
                    escapeJson(updated.status),
                    penaltyJson
            );

            System.out.println("[DEBUG] Success response: " + json);
            resp.getWriter().write(json);

        } catch (SQLException e) {
            System.out.println("[DEBUG] SQLException in AdminUserStatusServlet.doPost");
            e.printStackTrace();
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write(
                    "{\"success\":false,\"message\":\"DB error: " + escapeJson(e.getMessage()) + "\"}"
            );
        } finally {
            System.out.println("========== [DEBUG] AdminUserStatusServlet.doPost END ==========");
        }
    }
}
