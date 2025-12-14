package com.memoryspace.planet;

import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;

import java.io.IOException;

@WebServlet("/api/planet/*")
@MultipartConfig(
        fileSizeThreshold = 1024 * 1024,      // 1MB
        maxFileSize = 50L * 1024 * 1024,       // 50MB
        maxRequestSize = 60L * 1024 * 1024     // 60MB
)
public class PlanetServlet extends HttpServlet {

    private final PlanetService service = new PlanetService();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String action = PlanetRequest.action(req);
        if ("list".equals(action)) {
            service.handleList(req, resp);
            return;
        }
        PlanetJson.sendJson(resp, 404, PlanetJson.jsonFail("Not Found"));
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String action = PlanetRequest.action(req);

        if ("create".equals(action)) {
            service.handleCreate(req, resp);
        } else if ("update".equals(action)) {
            service.handleUpdate(req, resp);
        } else if ("delete".equals(action)) {
            service.handleDelete(req, resp);
        } else {
            PlanetJson.sendJson(resp, 404, PlanetJson.jsonFail("Not Found"));
        }
    }
}
