package com.memoryspace.admin;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@WebServlet(name = "AdminReportsServlet", urlPatterns = {"/api/admin/reports"})
public class AdminReportsServlet extends AbstractAdminServlet {

    private final AdminDAO adminDAO = new AdminDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        if (!ensureAdmin(req, resp)) {
            return;
        }

        resp.setContentType("application/json; charset=UTF-8");

        try {
            List<AdminDAO.AdminReportSummary> list = adminDAO.findAllReports();
            List<String> jsonRows = new ArrayList<>();

            for (AdminDAO.AdminReportSummary r : list) {
                StringBuilder sb = new StringBuilder();
                sb.append("{");
                sb.append("\"id\":").append(r.id).append(",");
                sb.append("\"planetId\":").append(r.planetId).append(",");

                if (r.reporterUserId != null) {
                    sb.append("\"reporterUserId\":").append(r.reporterUserId).append(",");
                } else {
                    sb.append("\"reporterUserId\":null,");
                }

                if (r.reportedUserId != null) {
                    sb.append("\"reportedUserId\":").append(r.reportedUserId).append(",");
                } else {
                    sb.append("\"reportedUserId\":null,");
                }

                sb.append("\"planetName\":\"")
                  .append(escapeJson(r.planetName == null ? "" : r.planetName))
                  .append("\",");

                sb.append("\"reporterNickname\":\"")
                  .append(escapeJson(r.reporterNickname == null ? "" : r.reporterNickname))
                  .append("\",");

                sb.append("\"reportedNickname\":\"")
                  .append(escapeJson(r.reportedNickname == null ? "" : r.reportedNickname))
                  .append("\",");

                sb.append("\"reason\":\"")
                  .append(escapeJson(r.reason == null ? "" : r.reason))
                  .append("\",");

                sb.append("\"status\":\"")
                  .append(escapeJson(r.status == null ? "" : r.status))
                  .append("\",");

                // ✅ 추가: 새로고침 후에도 삭제 표시 유지
                sb.append("\"planetDeleted\":").append(r.planetDeleted);

                sb.append("}");
                jsonRows.add(sb.toString());
            }

            String json = "{ \"reports\": [" + String.join(",", jsonRows) + "] }";
            resp.getWriter().write(json);

        } catch (Exception e) {
            e.printStackTrace();
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\"error\":\"DB error\"}");
        }
    }
}
