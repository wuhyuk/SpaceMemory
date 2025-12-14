package com.memoryspace.map;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.BufferedReader;
import java.io.IOException;

/**
 * 특정 미디어의 위도/경도를 업데이트하는 API
 * POST /api/update-coordinates
 *
 * Body(JSON):
 * {
 *   "id": 123,
 *   "latitude": 37.5665,
 *   "longitude": 126.9780
 * }
 *
 * ✅ 중요:
 * - credentials 기반 CORS 처리
 * - 세션 기반 인증(로그인 필요)
 */
@WebServlet("/api/update-coordinates")
public class MapUpdateCoordinatesServlet extends HttpServlet {

    private final MapMediaDAO mapMediaDAO = new MapMediaDAO();
    private final Gson gson = new Gson();

    private static final String[] ALLOWED_ORIGINS = {
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173"
    };

    @Override
    protected void doOptions(HttpServletRequest request, HttpServletResponse response) {
        applyCors(request, response);
        response.setStatus(HttpServletResponse.SC_OK);
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        applyCors(request, response);
        response.setContentType("application/json; charset=UTF-8");

        // ✅ 로그인 세션 체크 (원하시면 여기서 권한/소유권 검증까지 확장 가능)
        HttpSession session = request.getSession(false);
        String loginId = null;
        if (session != null) {
            Object v = session.getAttribute("loginId");
            if (v instanceof String) loginId = (String) v;
        }
        if (loginId == null || loginId.trim().isEmpty()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"error\":\"로그인이 필요합니다.\"}");
            return;
        }

        try (BufferedReader reader = request.getReader()) {
            JsonObject jsonRequest = gson.fromJson(reader, JsonObject.class);

            if (jsonRequest == null || !jsonRequest.has("id") || !jsonRequest.has("latitude") || !jsonRequest.has("longitude")) {
                response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                response.getWriter().write("{\"error\":\"Missing 'id', 'latitude' or 'longitude' field\"}");
                return;
            }

            Long id = jsonRequest.get("id").getAsLong();
            Double latitude = jsonRequest.get("latitude").isJsonNull() ? null : jsonRequest.get("latitude").getAsDouble();
            Double longitude = jsonRequest.get("longitude").isJsonNull() ? null : jsonRequest.get("longitude").getAsDouble();

            boolean updated = mapMediaDAO.updateCoordinates(id, latitude, longitude);

            JsonObject jsonResponse = new JsonObject();
            jsonResponse.addProperty("success", updated);

            if (updated) {
                jsonResponse.addProperty("id", id);
                if (latitude != null) jsonResponse.addProperty("latitude", latitude);
                else jsonResponse.add("latitude", null);

                if (longitude != null) jsonResponse.addProperty("longitude", longitude);
                else jsonResponse.add("longitude", null);
            } else {
                jsonResponse.addProperty("message", "No rows updated. Check if the ID exists.");
            }

            response.setStatus(HttpServletResponse.SC_OK);
            response.getWriter().write(gson.toJson(jsonResponse));

        } catch (Exception e) {
            e.printStackTrace();
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.getWriter().write("{\"error\":\"" + escapeJson(e.getMessage()) + "\"}");
        }
    }

    private void applyCors(HttpServletRequest request, HttpServletResponse response) {
        String origin = request.getHeader("Origin");

        if (origin != null && isAllowedOrigin(origin)) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Access-Control-Allow-Credentials", "true");
            response.setHeader("Vary", "Origin");
        }

        response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }

    private boolean isAllowedOrigin(String origin) {
        for (String o : ALLOWED_ORIGINS) {
            if (o.equals(origin)) return true;
        }
        return false;
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
