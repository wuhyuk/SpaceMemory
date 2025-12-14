package com.memoryspace.user;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.io.PrintWriter;

@WebServlet("/api/user/verify-password")
public class VerifyPasswordServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {

        req.setCharacterEncoding("UTF-8");
        ApiResponse.setJson(resp);

        PrintWriter out = resp.getWriter();

        // 1) Login check (기존 로직 유지)
        HttpSession session = req.getSession(false);
        if (session == null) {
            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_OK,   // ✅ 프론트 response.ok 통과
                    "LOGIN_REQUIRED",
                    ApiMessages.LOGIN_REQUIRED
            );
            return;
        }

        String loginId = (String) session.getAttribute("loginId");
        if (loginId == null || loginId.trim().isEmpty()) {
            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_OK,   // ✅
                    "LOGIN_REQUIRED",
                    ApiMessages.LOGIN_REQUIRED
            );
            return;
        }

        // 2) Read password param (기존 로직 유지)
        String password = req.getParameter("password");
        if (password == null || password.trim().isEmpty()) {
            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_OK,   // ✅
                    "PASSWORD_REQUIRED",
                    ApiMessages.PASSWORD_REQUIRED
            );
            return;
        }

        // 3) Verify against DB (기존 로직 유지)
        UserDAO dao = new UserDAO();
        boolean ok = dao.checkLogin(loginId, password);

        if (ok) {
            ApiResponse.ok(
                    out,
                    ApiResponse.obj(
                            ApiResponse.kv("verified", "true")
                    )
            );
        } else {
            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_OK,   // ✅
                    "PASSWORD_MISMATCH",
                    ApiMessages.PASSWORD_MISMATCH
            );
        }
    }
}
