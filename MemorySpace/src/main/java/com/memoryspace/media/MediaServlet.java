package com.memoryspace.media;

import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;

import java.io.IOException;

@WebServlet("/api/media/*")
@MultipartConfig(
        fileSizeThreshold = 1024 * 1024,      // 1MB
        maxFileSize = 50L * 1024 * 1024,       // 50MB
        maxRequestSize = 200L * 1024 * 1024    // 다중 업로드 고려
)
public class MediaServlet extends HttpServlet {

    private final MediaService service = new MediaService();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String action = MediaRequest.action(req);

        if ("list".equals(action)) {
            service.handleList(req, resp);
            return;
        }

        MediaJson.sendJson(resp, 404, MediaJson.fail("Not Found"));
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String action = MediaRequest.action(req);

        if ("add".equals(action)) {
            service.handleAdd(req, resp);
            return;
        }

        if ("update".equals(action)) {
            service.handleUpdateMeta(req, resp);
            return;
        }

        if ("delete".equals(action)) {
            service.handleDelete(req, resp);
            return;
        }

        MediaJson.sendJson(resp, 404, MediaJson.fail("Not Found"));
    }
}
