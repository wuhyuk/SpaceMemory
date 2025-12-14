package com.memoryspace.user;

import com.memoryspace.db.DBConnectionUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.format.DateTimeFormatter;

@WebServlet("/api/login")
public class LoginServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        req.setCharacterEncoding("UTF-8");
        ApiResponse.setJson(resp);
        PrintWriter out = resp.getWriter();

        String id = req.getParameter("id");
        String password = req.getParameter("password");

        UserDAO userDAO = new UserDAO();

        // 1) Credentials check (기존 흐름 유지: 로그인 확인)
        boolean ok = userDAO.checkLogin(id, password);
        if (!ok) {
            // ⚠️ 프론트 response.ok 이슈 때문에 실패도 200으로 내려줌
            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_OK,
                    "INVALID_CREDENTIALS",
                    ApiMessages.INVALID_CREDENTIALS
            );
            return;
        }

        // 2) 사용자 정보 조회 (기존 흐름 유지)
        UserDTO user = userDAO.getUserByUsername(id);
        if (user == null) {
            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_OK,
                    "INVALID_CREDENTIALS",
                    ApiMessages.INVALID_CREDENTIALS
            );
            return;
        }

        // 3) status 체크: 정지/차단이면 로그인 자체 차단 + 사유/기간 내려줌
        String status = user.getStatus();

        if ("SUSPENDED".equals(status)) {
            String penaltyEndAtStr = "";
            if (user.getPenaltyEndAt() != null) {
                penaltyEndAtStr = user.getPenaltyEndAt()
                        .toLocalDateTime()
                        .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            }

            String reason = fetchLatestReportReason(user.getId());
            if (reason == null || reason.trim().isEmpty()) {
                reason = "Policy violation.";
            }

            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_OK,
                    "SUSPENDED",
                    ApiMessages.ACCOUNT_SUSPENDED,
                    ApiResponse.obj(
                            ApiResponse.kv("penaltyEndAt", penaltyEndAtStr),
                            ApiResponse.kv("reason", reason)
                    )
            );
            return;
        }

        if ("BANNED".equals(status)) {
            String reason = fetchLatestReportReason(user.getId());
            if (reason == null || reason.trim().isEmpty()) {
                reason = "Policy violation.";
            }

            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_OK,
                    "BANNED",
                    ApiMessages.ACCOUNT_BANNED,
                    ApiResponse.obj(
                            ApiResponse.kv("reason", reason)
                    )
            );
            return;
        }

        // 4) ✅ ACTIVE → login success (기존 세션 키 유지)
        HttpSession session = req.getSession(true);
        session.setAttribute("loginId", user.getUsername());
        session.setAttribute("loginUserId", user.getId());
        session.setAttribute("loginRole", user.getRole());

        // AuthStatusServlet 호환
        session.setAttribute("nickname", user.getNickname());
        session.setAttribute("role", user.getRole());

        // 5) login_log INSERT (기존 목적 유지: 성공시에만 기록)
        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "INSERT INTO login_log (userId, loginTime) VALUES (?, NOW())"
             )) {
            ps.setLong(1, user.getId()); // ✅ BIGINT 컬럼에는 users.id
            ps.executeUpdate();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // ✅ FIX: 프론트(Main.jsx handleLoginSuccess)가 즉시 nickname/role을 받을 수 있도록 data에 포함
        ApiResponse.ok(
                out,
                ApiResponse.obj(
                        ApiResponse.kv("userId", user.getUsername()),
                        ApiResponse.kv("username", user.getUsername()),
                        ApiResponse.kv("nickname", user.getNickname()),
                        ApiResponse.kv("role", user.getRole())
                )
        );
    }

    /**
     * reports 테이블 기반 로직은 새 DDL에 존재하지 않으므로 사용 불가.
     * 호출부의 기본값("Policy violation.") 로직을 그대로 유지하기 위해 null 반환.
     */
    private String fetchLatestReportReason(long reportedUserId) {
        return null;
    }
}
