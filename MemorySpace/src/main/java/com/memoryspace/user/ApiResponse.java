package com.memoryspace.user;

import jakarta.servlet.http.HttpServletResponse;

import java.io.PrintWriter;

public final class ApiResponse {

    private ApiResponse() {}

    public static void setJson(HttpServletResponse resp) {
        resp.setContentType("application/json; charset=UTF-8");
    }

    // success: true, data: <object|null>
    public static void ok(PrintWriter out, String dataJson) {
        out.print("{\"success\":true,\"data\":" + (dataJson == null ? "null" : dataJson) + "}");
    }

    // success: true, data: {}
    public static void okEmpty(PrintWriter out) {
        out.print("{\"success\":true,\"data\":{}}");
    }

    // success: false, code/message/details
    public static void fail(HttpServletResponse resp,
                            PrintWriter out,
                            int httpStatus,
                            String code,
                            String message,
                            String detailsJson) {

        resp.setStatus(httpStatus);

        out.print("{\"success\":false"
                + (code != null ? ",\"code\":\"" + esc(code) + "\"" : "")
                + ",\"message\":\"" + esc(message) + "\""
                + (detailsJson != null ? ",\"details\":" + detailsJson : "")
                + "}");
    }

    // Convenience: fail without details
    public static void fail(HttpServletResponse resp,
                            PrintWriter out,
                            int httpStatus,
                            String code,
                            String message) {

        fail(resp, out, httpStatus, code, message, null);
    }

    // JSON string escape
    public static String esc(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n")
                .replace("\t", "\\t");
    }

    /**
     * ✅ FIX:
     * obj()가 내부에서 { ... } 를 만들기 때문에,
     * kv()는 {"k":"v"}(객체)가 아니라 "k":"v"(프로퍼티 조각)를 반환해야 합니다.
     */
    public static String kv(String key, String value) {
        return "\"" + esc(key) + "\":\"" + esc(value) + "\"";
    }

    // Helps build {"k":"v","k2":"v2"} from kv() fragments
    public static String obj(String... kvPairsJson) {
        if (kvPairsJson == null || kvPairsJson.length == 0) return "{}";
        StringBuilder sb = new StringBuilder("{");
        for (int i = 0; i < kvPairsJson.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(kvPairsJson[i]);
        }
        sb.append("}");
        return sb.toString();
    }
}
