// src/main/java/com/memoryspace/admin/AdminReportDeletePlanetServlet.java
package com.memoryspace.admin;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;

import java.io.IOException;

@WebServlet(name = "AdminReportDeletePlanetServlet", urlPatterns = {"/api/admin/reports/delete-planet"})
public class AdminReportDeletePlanetServlet extends AbstractAdminServlet {

    private final AdminDAO adminDAO = new AdminDAO();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        if (!ensureAdmin(req, resp)) {
            return;
        }

        req.setCharacterEncoding("UTF-8");
        resp.setContentType("application/json; charset=UTF-8");

        String idParam = req.getParameter("id");
        String planetParam = req.getParameter("planetId");

        if (idParam == null || idParam.isBlank() ||
            planetParam == null || planetParam.isBlank()) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("{\"success\":false,\"message\":\"id and planetId are required\"}");
            return;
        }

        try {
            long reportId = Long.parseLong(idParam);
            long planetId = Long.parseLong(planetParam);

            boolean ok = adminDAO.deletePlanetAndResolveReport(planetId, reportId);
            if (ok) {
                resp.getWriter().write("{\"success\":true}");
            } else {
                resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
                resp.getWriter().write("{\"success\":false,\"message\":\"Planet or report not found\"}");
            }

        } catch (NumberFormatException e) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("{\"success\":false,\"message\":\"invalid id or planetId\"}");
        } catch (Exception e) {
            e.printStackTrace();
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"success\":false,\"message\":\"DB error\"}");
        }
    }
}
