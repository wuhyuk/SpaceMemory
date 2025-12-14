package com.memoryspace.user;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;

import java.io.IOException;
import java.io.PrintWriter;

@WebServlet("/api/signup")
public class SignUpServlet extends HttpServlet {

    private UserDAO userDAO;

    @Override
    public void init() throws ServletException {
        this.userDAO = new UserDAO();
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {

        req.setCharacterEncoding("UTF-8");
        ApiResponse.setJson(resp);

        String id = req.getParameter("id");
        String password = req.getParameter("password");
        String name = req.getParameter("name");
        String email = req.getParameter("email");
        String region = req.getParameter("region");

        boolean success = false;
        String message = null;
        String code = null;

        // ✅ 기존 검증 로직 유지
        if (isBlank(id) || isBlank(password) || isBlank(name) || isBlank(email)) {
            message = "All required fields must be filled in.";
            code = "REQUIRED_FIELDS";
        } else if (userDAO.isUserIdExists(id)) {
            message = "This ID is already in use.";
            code = "ID_EXISTS";
        } else if (userDAO.isEmailExists(email)) {
            message = "This email is already registered.";
            code = "EMAIL_EXISTS";
        } else {
            success = userDAO.createUser(id, password, name, email, region);
            if (!success) {
                message = "Failed to create user.";
                code = "CREATE_FAILED";
            }
        }

        try (PrintWriter out = resp.getWriter()) {
            if (success) {
                ApiResponse.okEmpty(out);
            } else {
                if (message == null) message = ApiMessages.SERVER_ERROR;
                if (code == null) code = "SIGNUP_FAILED";

                // ⚠️ 프론트 response.ok 이슈 때문에 실패도 200으로 내려줌
                ApiResponse.fail(resp, out, HttpServletResponse.SC_OK, code, message);
            }
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
