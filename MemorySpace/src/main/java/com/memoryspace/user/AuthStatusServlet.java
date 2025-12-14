package com.memoryspace.user;

import com.memoryspace.db.DBConnectionUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.*;
import java.time.format.DateTimeFormatter;

@WebServlet("/api/auth/me")
public class AuthStatusServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {

        ApiResponse.setJson(resp);
        PrintWriter out = resp.getWriter();

        // 1) Session check
        HttpSession session = req.getSession(false);
        if (session == null) {
            // ✅ 표준 응답: success/data 형태 + loggedIn boolean 유지
            ApiResponse.ok(out, "{\"loggedIn\":false}");
            return;
        }

        String loginId = (String) session.getAttribute("loginId");
        if (loginId == null || loginId.trim().isEmpty()) {
            ApiResponse.ok(out, "{\"loggedIn\":false}");
            return;
        }

        // 2) DB user load
        UserDAO dao = new UserDAO();
        UserDTO user = dao.getUserByUsername(loginId);

        if (user == null) {
            safeCloseLoginLog(loginId);
            session.invalidate();
            ApiResponse.ok(out, "{\"loggedIn\":false}");
            return;
        }

        // 3) status check
        String status = user.getStatus();
        if (!"ACTIVE".equals(status)) {

            String reason = fetchLatestReportReason(user.getId());
            if (reason == null || reason.trim().isEmpty()) {
                reason = "Policy violation.";
            }

            String penaltyEndAtStr = "";
            if (user.getPenaltyEndAt() != null) {
                penaltyEndAtStr = user.getPenaltyEndAt()
                        .toLocalDateTime()
                        .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            }

            // 강제 로그아웃 로그 기록 + 세션 종료
            safeCloseLoginLog(loginId);
            session.invalidate();

            if ("SUSPENDED".equals(status)) {
                ApiResponse.fail(
                        resp, out,
                        HttpServletResponse.SC_FORBIDDEN,
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
                ApiResponse.fail(
                        resp, out,
                        HttpServletResponse.SC_FORBIDDEN,
                        "BANNED",
                        ApiMessages.ACCOUNT_BANNED,
                        ApiResponse.obj(
                                ApiResponse.kv("reason", reason)
                        )
                );
                return;
            }

            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_FORBIDDEN,
                    "ACCOUNT_BLOCKED",
                    "This account is not active."
            );
            return;
        }

        // 4) ACTIVE: 표준 응답으로 통일 (loggedIn boolean 유지)
        String nickname = (String) session.getAttribute("nickname");
        String role = (String) session.getAttribute("role");

        String dataJson =
                "{\"loggedIn\":true"
                        + ",\"userId\":\"" + ApiResponse.esc(loginId) + "\""
                        + (nickname != null ? ",\"nickname\":\"" + ApiResponse.esc(nickname) + "\"" : "")
                        + (role != null ? ",\"role\":\"" + ApiResponse.esc(role) + "\"" : "")
                        + "}";

        ApiResponse.ok(out, dataJson);
    }

    private void safeCloseLoginLog(String loginId) {
        if (loginId == null) return;

        // ✅ FIX (DDL 매칭):
        // login_log: userId(BIGINT FK), loginTime, logoutTime
        // 세션 loginId는 username이므로 users.id로 매칭하기 위해 서브쿼리 사용
        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement ps = conn.prepareStatement(
                     "UPDATE login_log SET logoutTime = NOW() " +
                             "WHERE userId = (SELECT id FROM users WHERE username = ? LIMIT 1) " +
                             "AND logoutTime IS NULL " +
                             "ORDER BY loginTime DESC LIMIT 1"
             )) {
            ps.setString(1, loginId);
            ps.executeUpdate();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private String fetchLatestReportReason(long reportedUserId) {
        // ✅ FIX (DDL 매칭):
        // 기존 reports(reportedUserId) 테이블/컬럼은 새 DDL에 존재하지 않음.
        // 현 스키마(planet/media 중심)에서는 "유저 제재 사유"를 직접 조회할 근거가 없으므로 null 반환.
        // 호출부의 기본값("Policy violation.") 로직을 그대로 사용.
        return null;
    }
}
