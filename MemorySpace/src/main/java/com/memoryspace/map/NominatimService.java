package com.memoryspace.map;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * OpenStreetMap Nominatim API를 이용한 지오코딩 서비스
 * - 타임아웃 설정
 * - 429(Too Many Requests) 등 실패 케이스 안전 처리
 */
public class NominatimService {

    // 운영에서는 이메일/연락처를 실제 값으로 바꾸는 것을 권장
    private static final String USER_AGENT = "MemorySpaceApp/1.0 (contact@yourdomain.com)";

    // 너무 잦은 호출을 피하기 위해(필요시)
    private static final int CONNECT_TIMEOUT_MS = 5000;
    private static final int READ_TIMEOUT_MS = 7000;

    public Double[] geocode(String locationName) {
        if (locationName == null || locationName.trim().isEmpty()) return null;

        try {
            String encoded = URLEncoder.encode(locationName.trim(), StandardCharsets.UTF_8);
            String urlStr = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encoded;

            URL url = new URL(urlStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();

            conn.setRequestMethod("GET");
            conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
            conn.setReadTimeout(READ_TIMEOUT_MS);

            // Nominatim은 User-Agent 요구
            conn.setRequestProperty("User-Agent", USER_AGENT);
            conn.setRequestProperty("Accept", "application/json");

            int code = conn.getResponseCode();

            if (code == 200) {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {

                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) sb.append(line);

                    JsonArray arr = JsonParser.parseString(sb.toString()).getAsJsonArray();
                    if (arr.size() == 0) return null;

                    JsonObject result = arr.get(0).getAsJsonObject();
                    double lat = result.get("lat").getAsDouble();
                    double lon = result.get("lon").getAsDouble();

                    return new Double[]{lat, lon};
                }
            }

            // 429 등
            System.err.println("Nominatim API Error: HTTP " + code + " for " + locationName);
            return null;

        } catch (Exception e) {
            System.err.println("Error during Nominatim geocoding for " + locationName + ": " + e.getMessage());
            return null;
        }
    }
}
