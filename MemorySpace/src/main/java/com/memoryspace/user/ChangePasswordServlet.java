package com.memoryspace.user;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.io.PrintWriter;

@WebServlet("/api/user/change-password")
public class ChangePasswordServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        req.setCharacterEncoding("UTF-8");
        ApiResponse.setJson(resp);

        PrintWriter out = resp.getWriter();

        // 1) Login check (기존 로직 유지)
        HttpSession session = req.getSession(false);
        if (session == null) {
            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_UNAUTHORIZED,
                    "LOGIN_REQUIRED",
                    ApiMessages.LOGIN_REQUIRED
            );
            return;
        }

        String username = (String) session.getAttribute("loginId");
        if (username == null || username.trim().isEmpty()) {
            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_UNAUTHORIZED,
                    "LOGIN_REQUIRED",
                    ApiMessages.LOGIN_REQUIRED
            );
            return;
        }

        // 2) Read newPassword param (기존 로직 유지)
        String newPassword = req.getParameter("newPassword");

        if (newPassword == null || newPassword.trim().isEmpty()) {
            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_BAD_REQUEST,
                    "NEW_PASSWORD_REQUIRED",
                    ApiMessages.NEW_PASSWORD_REQUIRED
            );
            return;
        }

        // 기존: 길이 4 제한 유지
        if (newPassword.length() < 4) {
            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_BAD_REQUEST,
                    "PASSWORD_TOO_SHORT",
                    ApiMessages.PASSWORD_TOO_SHORT
            );
            return;
        }

        // 3) Change password (기존 로직 유지)
        UserDAO dao = new UserDAO();
        boolean success = dao.changePassword(username, newPassword);

        if (success) {
            // 기존: 비밀번호 변경 성공 시 세션 만료(재로그인 유도)
            session.invalidate();

            ApiResponse.ok(
                    out,
                    ApiResponse.obj(
                            ApiResponse.kv("message", ApiMessages.PASSWORD_CHANGED)
                    )
            );
        } else {
            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "PASSWORD_CHANGE_FAILED",
                    ApiMessages.PASSWORD_CHANGE_FAILED
            );
        }
    }
}
