// src/main/java/com/memoryspace/admin/AdminStatsServlet.java
package com.memoryspace.admin;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;

import java.io.IOException;
import java.util.Map;

@WebServlet(name = "AdminStatsServlet", urlPatterns = {"/api/admin/stats"})
public class AdminStatsServlet extends AbstractAdminServlet {

    private final AdminDAO adminDAO = new AdminDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        if (!ensureAdmin(req, resp)) {
            return;
        }

        resp.setContentType("application/json; charset=UTF-8");

        try {
            AdminDAO.AdminStats stats = adminDAO.getStats();

            StringBuilder sb = new StringBuilder();
            sb.append("{");

            sb.append("\"totalUsers\":").append(stats.totalUsers).append(",");

            sb.append("\"storage\":{");
            sb.append("\"used\":").append(stats.usedBytes).append(",");
            sb.append("\"total\":").append(stats.totalBytes);
            sb.append("},");

            sb.append("\"regions\":{");
            boolean first = true;
            for (Map.Entry<String, Long> e : stats.liveInCounts.entrySet()) {
                if (!first) sb.append(",");
                first = false;
                sb.append("\"")
                  .append(escapeJson(e.getKey()))
                  .append("\":")
                  .append(e.getValue());
            }
            sb.append("}");

            sb.append("}");

            resp.getWriter().write(sb.toString());

        } catch (Exception e) {
            e.printStackTrace();
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"DB error\"}");
        }
    }
}
