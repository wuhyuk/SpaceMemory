package com.memoryspace.user;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;

import java.io.IOException;
import java.io.PrintWriter;

@WebServlet("/api/user/info")
public class GetUserServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        ApiResponse.setJson(resp);
        PrintWriter out = resp.getWriter();

        // 1) Session check (기존 로직 유지)
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

        // Must match the key used in LoginServlet: "loginId"
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

        // 2) Load user info (기존 로직 유지)
        UserDAO dao = new UserDAO();
        UserDTO user = dao.getUserByUsername(username);

        if (user == null) {
            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_NOT_FOUND,
                    "USER_NOT_FOUND",
                    ApiMessages.USER_NOT_FOUND
            );
            return;
        }

        // 3) SUCCESS response (필드 구성은 기존과 동일)
        String liveIn = user.getLiveIn() != null ? user.getLiveIn() : "";

        ApiResponse.ok(
                out,
                ApiResponse.obj(
                        ApiResponse.kv("username", user.getUsername()),
                        ApiResponse.kv("nickname", user.getNickname()),
                        ApiResponse.kv("email", user.getEmail()),
                        ApiResponse.kv("liveIn", liveIn)
                )
        );
    }
}
