package com.memoryspace.star;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;

/**
 * 별 이름 수정 서블릿
 * POST /api/star/update
 */
@WebServlet("/api/star/update")
public class UpdateStarServlet extends HttpServlet {
    private final StarDAO starDAO = new StarDAO();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        req.setCharacterEncoding("UTF-8");
        resp.setContentType("application/json; charset=UTF-8");

        // CORS 헤더 추가 (필요시)
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type");

        HttpSession session = req.getSession(false);
        String loginId = (session != null) ? (String) session.getAttribute("loginId") : null;

        System.out.println("📥 UpdateStarServlet: POST request received");
        System.out.println("  loginId from session: " + loginId);

        if (loginId == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write("{\"success\": false, \"message\": \"Not logged in\"}");
            System.out.println("❌ UpdateStarServlet: Not logged in");
            return;
        }

        Long userId = starDAO.getUserIdByUsername(loginId);
        String starIdStr = req.getParameter("starId");
        String newName = req.getParameter("name");

        System.out.println("  userId: " + userId);
        System.out.println("  starIdStr: " + starIdStr);
        System.out.println("  newName: " + newName);

        if (starIdStr == null || newName == null || newName.trim().isEmpty()) {
            resp.getWriter().write("{\"success\": false, \"message\": \"Missing parameters\"}");
            System.out.println("❌ UpdateStarServlet: Missing parameters");
            return;
        }

        try {
            Long starId = Long.parseLong(starIdStr);
            
            // 이름 길이 체크 (15자 제한)
            if (newName.trim().length() > 15) {
                resp.getWriter().write("{\"success\": false, \"message\": \"Name too long (max 15 chars)\"}");
                System.out.println("❌ UpdateStarServlet: Name too long");
                return;
            }

            boolean success = starDAO.updateStarName(starId, userId, newName.trim());

            if (success) {
                resp.getWriter().write("{\"success\": true}");
                System.out.println("✅ UpdateStarServlet: Star updated successfully");
            } else {
                resp.getWriter().write("{\"success\": false, \"message\": \"Update failed: not owner or not found\"}");
                System.out.println("❌ UpdateStarServlet: Update failed (not owner or not found)");
            }
        } catch (NumberFormatException e) {
            resp.getWriter().write("{\"success\": false, \"message\": \"Invalid star ID\"}");
            System.out.println("❌ UpdateStarServlet: Invalid star ID format");
        }
    }

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) {
        resp.setHeader("Access-Control-Allow-Origin", "*");
        resp.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type");
        resp.setStatus(HttpServletResponse.SC_OK);
    }
}