package com.memoryspace.user;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.io.PrintWriter;

@WebServlet("/api/user/delete")
public class DeleteUserServlet extends HttpServlet {

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

        // 2) Delete account (기존 로직 유지)
        UserDAO dao = new UserDAO();
        boolean success = dao.deleteUser(username);

        if (success) {
            // 기존: 삭제 성공 시 세션 만료
            session.invalidate();

            ApiResponse.ok(
                    out,
                    ApiResponse.obj(
                            ApiResponse.kv("message", ApiMessages.ACCOUNT_DELETED)
                    )
            );
        } else {
            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "ACCOUNT_DELETE_FAILED",
                    ApiMessages.ACCOUNT_DELETE_FAILED
            );
        }
    }
}
