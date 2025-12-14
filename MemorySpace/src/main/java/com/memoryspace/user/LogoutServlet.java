package com.memoryspace.user;

import com.memoryspace.db.DBConnectionUtil;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;

@WebServlet("/api/logout")
public class LogoutServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {

        ApiResponse.setJson(resp);
        PrintWriter out = resp.getWriter();

        HttpSession session = req.getSession(false);
        if (session != null) {

            // 기존: username이 loginId에 들어있음
            String loginId = (String) session.getAttribute("loginId");

            // ✅ FIX (DDL 매칭):
            // login_log 컬럼명(userId, loginTime, logoutTime) + username → users.id 매핑
            if (loginId != null) {
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

            // 기존: 세션 종료
            session.invalidate();
        }

        // JSON 통일: 성공 응답
        ApiResponse.okEmpty(out);
    }
}
