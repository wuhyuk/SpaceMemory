package com.memoryspace.media;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.List;

public class MediaJson {

    private MediaJson() {}

    public static void sendJson(HttpServletResponse resp, int status, String json) throws IOException {
        resp.setStatus(status);
        resp.setContentType("application/json; charset=UTF-8");
        resp.getWriter().write(json);
    }

    public static String fail(String msg) {
        return "{\"success\":false,\"message\":" + jstr(msg) + "}";
    }

    public static String jstr(String s) {
        if (s == null) return "null";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    public static String jstrOrNull(String s) {
        if (s == null) return "null";
        String t = s.trim();
        if (t.isEmpty()) return "null";
        return jstr(t);
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

    public static String jsonArray(List<String> items) {
        if (items == null || items.isEmpty()) return "[]";
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        for (int i = 0; i < items.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append(jstr(items.get(i)));
        }
        sb.append("]");
        return sb.toString();
    }

    public static String mediaToJson(MediaDto m) {
        // 프론트 호환: mediaType 필드명 유지
        return "{"
                + "\"id\":" + m.id
                + ",\"planetId\":" + m.planetId
                + ",\"mediaType\":" + jstr(m.mediaType)
                + ",\"url\":" + jstr(m.url)
                + ",\"description\":" + jstrOrNull(m.description)
                + ",\"location\":" + jstrOrNull(m.location)
                + ",\"tags\":" + jsonArray(m.tags)
                + ",\"liked\":" + (m.liked ? "true" : "false")
                + ",\"starred\":" + (m.starred ? "true" : "false")
                + ",\"reported\":" + (m.reported ? "true" : "false")
                + "}";
    }

    public static void closeQuietly(AutoCloseable c) {
        if (c == null) return;
        try { c.close(); } catch (Exception ignored) {}
    }
}
