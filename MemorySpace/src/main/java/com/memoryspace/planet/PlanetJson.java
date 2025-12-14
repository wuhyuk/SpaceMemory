package com.memoryspace.planet;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.List;

public class PlanetJson {

    private PlanetJson() {}

    public static void sendJson(HttpServletResponse resp, int status, String json) throws IOException {
        resp.setStatus(status);
        resp.setContentType("application/json; charset=UTF-8");
        resp.getWriter().write(json);
    }

    public static String jsonFail(String msg) {
        return "{\"success\":false,\"message\":" + jstr(msg) + "}";
    }

    public static String jstr(String s) {
        if (s == null) return "null";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    public static String planetToJson(PlanetDto p) {
        String thumbUrl = p.thumbnailUrl;
        String thumbType = p.thumbnailType;

        String thumbObj = "null";
        if (thumbUrl != null && !thumbUrl.isEmpty()) {
            String t = (thumbType == null || thumbType.isEmpty()) ? "image" : thumbType;
            thumbObj = "{"
                    + "\"type\":" + jstr(t)
                    + ",\"url\":" + jstr(thumbUrl)
                    + "}";
        }

        return "{"
                + "\"id\":" + p.id
                + ",\"starId\":" + p.starId
                + ",\"name\":" + jstr(p.name)
                + ",\"sortOrder\":" + p.sortOrder
                + ",\"thumbnailMediaId\":" + (p.thumbnailMediaId == null ? "null" : String.valueOf(p.thumbnailMediaId))
                + ",\"thumbnailUrl\":" + jstr(thumbUrl)
                + ",\"thumbnailType\":" + jstr(thumbType)
                + ",\"thumbnail\":" + thumbObj
                + "}";
    }


    public static String join(List<String> items) {
        if (items == null || items.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < items.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(items.get(i));
        }
        return sb.toString();
    }

    public static void closeQuietly(AutoCloseable c) {
        if (c == null) return;
        try { c.close(); } catch (Exception ignored) {}
    }
}
