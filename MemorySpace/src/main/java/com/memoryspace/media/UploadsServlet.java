package com.memoryspace.media;

import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.*;

import java.io.*;
import java.nio.file.*;

@WebServlet("/uploads/*")
public class UploadsServlet extends HttpServlet {

    private static final String UPLOAD_DIR = UploadConfig.UPLOAD_DIR;

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String pathInfo = req.getPathInfo(); // "/abc.jpg"
        if (pathInfo == null || pathInfo.length() <= 1) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        String filename = pathInfo.substring(1);
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        Path filePath = Paths.get(UPLOAD_DIR, filename);

        if (!Files.exists(filePath) || !Files.isRegularFile(filePath)) {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        String mime = Files.probeContentType(filePath);
        if (mime == null) mime = "application/octet-stream";

        resp.setContentType(mime);
        resp.setHeader("X-Content-Type-Options", "nosniff");
        resp.setHeader("Cache-Control", "public, max-age=31536000, immutable");

        long len = Files.size(filePath);
        resp.setContentLengthLong(len);

        try (InputStream in = Files.newInputStream(filePath);
             OutputStream out = resp.getOutputStream()) {

            byte[] buf = new byte[8192];
            int r;
            while ((r = in.read(buf)) != -1) {
                out.write(buf, 0, r);
            }
            out.flush();
        }
    }
}
