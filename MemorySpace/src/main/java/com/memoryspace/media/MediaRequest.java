package com.memoryspace.media;

import jakarta.servlet.http.*;

import java.util.*;

public class MediaRequest {

    private MediaRequest() {}

    public static String action(HttpServletRequest req) {
        String p = req.getPathInfo();
        if (p == null || p.length() == 0 || "/".equals(p)) return "";
        if (p.startsWith("/")) p = p.substring(1);
        return p;
    }

    public static long parseLong(String s, long def) {
        if (s == null) return def;
        try { return Long.parseLong(s.trim()); } catch (Exception e) { return def; }
    }

    public static Part part(HttpServletRequest req, String name) {
        try { return req.getPart(name); } catch (Exception e) { return null; }
    }

    public static List<Part> getFileParts(HttpServletRequest req, String fieldName) {
        List<Part> out = new ArrayList<Part>();
        try {
            Collection<Part> parts = req.getParts();
            if (parts == null) return out;

            for (Part p : parts) {
                if (p == null) continue;
                if (!fieldName.equals(p.getName())) continue;
                if (p.getSize() <= 0) continue;
                out.add(p);
            }
        } catch (Exception ignored) {}
        return out;
    }

    public static List<String> parseTags(String tagsCsv) {
        if (tagsCsv == null) return Collections.emptyList();
        String t = tagsCsv.trim();
        if (t.isEmpty()) return Collections.emptyList();

        String[] arr = t.split(",");
        List<String> out = new ArrayList<String>();
        for (int i = 0; i < arr.length; i++) {
            String s = arr[i] == null ? "" : arr[i].trim();
            if (s.isEmpty()) continue;
            if (!out.contains(s)) out.add(s);
        }
        return out;
    }

    public static String safeFileName(String s) {
        if (s == null) return "file";
        s = s.replace("\\", "/");
        int idx = s.lastIndexOf('/');
        if (idx >= 0) s = s.substring(idx + 1);
        return s.replaceAll("[\\r\\n]", "");
    }

    public static String extensionOf(String fileName) {
        if (fileName == null) return "";
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) return "";
        return fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    public static Long getSessionUserId(HttpServletRequest req) {
        HttpSession s = req.getSession(false);
        if (s == null) return null;

        String[] keys = new String[] { "userId", "userid", "loginUserId", "LOGIN_USER_ID", "authUserId" };
        for (int i = 0; i < keys.length; i++) {
            Object v = s.getAttribute(keys[i]);
            Long id = asLong(v);
            if (id != null && id.longValue() > 0) return id;
        }
        return null;
    }

    private static Long asLong(Object v) {
        if (v == null) return null;
        if (v instanceof Long) return (Long) v;
        if (v instanceof Integer) return Long.valueOf(((Integer) v).longValue());
        if (v instanceof String) {
            try { return Long.valueOf(Long.parseLong(((String) v).trim())); } catch (Exception ignored) {}
        }
        return null;
    }
}
