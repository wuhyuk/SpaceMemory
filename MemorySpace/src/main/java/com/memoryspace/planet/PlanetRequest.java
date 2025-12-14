package com.memoryspace.planet;

import jakarta.servlet.http.*;

public class PlanetRequest {

    private PlanetRequest() {}

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
        try {
            return req.getPart(name);
        } catch (Exception e) {
            return null;
        }
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
