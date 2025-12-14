package com.memoryspace.star;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;

@WebServlet("/api/star/create")
public class CreateStarServlet extends HttpServlet {
    private final StarDAO starDAO = new StarDAO();
    
    // 이제 서버에서 랜덤 좌표와 색상을 생성하지 않습니다.

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        req.setCharacterEncoding("UTF-8");
        resp.setContentType("application/json; charset=UTF-8");
        
        HttpSession session = req.getSession(false);
        String loginId = (session != null) ? (String) session.getAttribute("loginId") : null;

        if (loginId == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write("{\"success\": false, \"message\": \"Not logged in\"}");
            return;
        }

        Long userId = starDAO.getUserIdByUsername(loginId);
        if (userId == null) {
            resp.getWriter().write("{\"success\": false, \"message\": \"User not found\"}");
            return;
        }

        String name = req.getParameter("name");
        if (name == null || name.trim().isEmpty()) {
            resp.getWriter().write("{\"success\": false, \"message\": \"Name is required\"}");
            return;
        }

        StarDTO star = new StarDTO();
        star.setUserId(userId);
        star.setName(name);
        
        // **중요: x, y, color 설정 로직 제거**

        boolean success = starDAO.createStar(star);

        if (success) {
            resp.getWriter().write("{\"success\": true, \"message\": \"Star created\"}");
        } else {
            // 7개 제한 초과 또는 DB 오류 시
            resp.getWriter().write("{\"success\": false, \"message\": \"Max 12 stars allowed\"}");
        }
    }
}