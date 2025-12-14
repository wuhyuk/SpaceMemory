package com.memoryspace.user;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;

import java.io.IOException;
import java.io.PrintWriter;

@WebServlet("/api/user/update")
public class UpdateUserServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        req.setCharacterEncoding("UTF-8");
        ApiResponse.setJson(resp);

        PrintWriter out = resp.getWriter();

        // 1) Session / login check (기존 로직 유지)
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

        // 2) Read params (기존 로직 유지)
        String nickname = req.getParameter("nickname");
        String email = req.getParameter("email");
        String liveIn = req.getParameter("liveIn");

        // 기존: nickname/email 필수
        if (nickname == null || nickname.trim().isEmpty()
                || email == null || email.trim().isEmpty()) {

            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_BAD_REQUEST,
                    "REQUIRED_FIELDS",
                    "Nickname and email are required."
            );
            return;
        }

        if (liveIn == null) {
            liveIn = "";
        }

        // 3) Update DB (기존 로직 유지)
        UserDAO dao = new UserDAO();
        boolean success = dao.updateUser(username, nickname, email, liveIn);

        if (success) {
            // 기존: 세션 nickname 갱신
            session.setAttribute("nickname", nickname);

            ApiResponse.ok(
                    out,
                    ApiResponse.obj(
                            ApiResponse.kv("message", ApiMessages.PROFILE_UPDATED)
                    )
            );
        } else {
            ApiResponse.fail(
                    resp, out,
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "UPDATE_FAILED",
                    ApiMessages.PROFILE_UPDATE_FAILED
            );
        }
    }
}
