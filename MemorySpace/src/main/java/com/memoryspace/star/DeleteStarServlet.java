package com.memoryspace.star;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;

@WebServlet("/api/star/delete")
public class DeleteStarServlet extends HttpServlet {
    private final StarDAO starDAO = new StarDAO();

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
        String starIdStr = req.getParameter("starId");

        if (starIdStr != null && userId != null) {
            try {
                Long starId = Long.parseLong(starIdStr);
                boolean success = starDAO.deleteStar(starId, userId);
                
                if (success) {
                    resp.getWriter().write("{\"success\": true}");
                } else {
                    resp.getWriter().write("{\"success\": false, \"message\": \"Delete failed: ID mismatch or not found\"}");
                }
            } catch (NumberFormatException e) {
                resp.getWriter().write("{\"success\": false, \"message\": \"Invalid ID format\"}");
            }
        } else {
            resp.getWriter().write("{\"success\": false, \"message\": \"Missing parameters\"}");
        }
    }
}