package com.memoryspace.admin;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@WebServlet(name = "AdminPlanetDetailServlet", urlPatterns = {"/api/admin/planets/detail"})
public class AdminPlanetDetailServlet extends AbstractAdminServlet {

    private final AdminDAO adminDAO = new AdminDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        if (!ensureAdmin(req, resp)) {
            return;
        }

        resp.setContentType("application/json; charset=UTF-8");

        String planetIdParam = req.getParameter("planetId");
        if (planetIdParam == null || planetIdParam.isBlank()) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("{\"success\":false,\"message\":\"planetId is required\"}");
            return;
        }

        long planetId;
        try {
            planetId = Long.parseLong(planetIdParam);
        } catch (NumberFormatException e) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("{\"success\":false,\"message\":\"invalid planetId\"}");
            return;
        }

        try {
            AdminDAO.AdminPlanetDetail detail = adminDAO.findPlanetDetailForAdmin(planetId);
            if (detail == null) {
                resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
                resp.getWriter().write("{\"success\":false,\"message\":\"planet not found\"}");
                return;
            }

            List<String> mediaJson = new ArrayList<>();
            for (AdminDAO.AdminPlanetMediaRow m : detail.mediaList) {
                String row = "{"
                        + "\"id\":" + m.id + ","
                        + "\"type\":\"" + escapeJson(m.type) + "\","
                        + "\"url\":\"" + escapeJson(m.url) + "\","
                        + "\"isDeleted\":" + (m.isDeleted ? "true" : "false") + ","
                        + "\"description\":\"" + escapeJson(m.description == null ? "" : m.description) + "\","
                        + "\"createdAt\":\"" + escapeJson(m.createdAt == null ? "" : m.createdAt) + "\""
                        + "}";
                mediaJson.add(row);
            }

            String json =
                    "{"
                    + "\"success\":true,"
                    + "\"planet\":{"
                        + "\"id\":" + detail.planetId + ","
                        + "\"name\":\"" + escapeJson(detail.planetName == null ? "" : detail.planetName) + "\","
                        + "\"isDeleted\":" + (detail.planetDeleted ? "true" : "false") + ","
                        + "\"starId\":" + detail.starId + ","
                        + "\"ownerUserId\":" + detail.ownerUserId + ","
                        + "\"ownerNickname\":\"" + escapeJson(detail.ownerNickname == null ? "" : detail.ownerNickname) + "\","
                        + "\"thumbnailMediaId\":" + (detail.thumbnailMediaId == null ? "null" : detail.thumbnailMediaId)
                    + "},"
                    + "\"media\":[" + String.join(",", mediaJson) + "]"
                    + "}";

            resp.getWriter().write(json);

        } catch (Exception e) {
            e.printStackTrace();
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"success\":false,\"message\":\"DB error\"}");
        }
    }
}
