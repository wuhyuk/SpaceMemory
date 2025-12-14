package com.memoryspace.star;

import com.google.gson.Gson;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.List;

@WebServlet("/api/star/list")
public class GetUserStarsServlet extends HttpServlet {
    private final StarDAO starDAO = new StarDAO();
    private final Gson gson = new Gson();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
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
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("{\"success\": false, \"message\": \"User not found\"}");
            return;
        }

        List<StarDTO> stars = starDAO.getStarsByUserId(userId);
        String json = gson.toJson(stars);
        
        resp.getWriter().write("{\"success\": true, \"stars\": " + json + "}");
    }
}