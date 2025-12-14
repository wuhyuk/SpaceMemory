package com.memoryspace.map;

import com.google.gson.Gson;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 지도 표시용 위치 데이터를 반환하는 API
 *
 * 로직:
 * 1) 로그인 세션(loginId=username) 확인
 * 2) DB에서 locationName이 있는 planet_media 조회(내 계정 기준)
 * 3) lat/lng 비어있으면 Nominatim으로 보완 후 DB 캐싱
 * 4) MapPage가 기대하는 형태(MapLocationData)로 변환해서 JSON 응답
 *
 * ✅ 중요:
 * - credentials 기반 CORS 처리(Origin 반사 + Allow-Credentials)
 * - Access-Control-Allow-Origin: * 사용 금지 (credentials와 충돌)
 */
@WebServlet(urlPatterns = {"/api/map"})
public class GetMapLocationsServlet extends HttpServlet {

    private final MapMediaDAO mapMediaDAO = new MapMediaDAO();
    private final NominatimService nominatimService = new NominatimService();
    private final Gson gson = new Gson();

    // 개발 환경에서 허용할 Origin (필요하면 추가)
    private static final String[] ALLOWED_ORIGINS = {
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173"
    };

    @Override
    protected void doOptions(HttpServletRequest request, HttpServletResponse response) throws IOException {
        applyCors(request, response);
        response.setStatus(HttpServletResponse.SC_OK);
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        applyCors(request, response);
        response.setContentType("application/json; charset=UTF-8");

        // ✅ 로그인 세션에서 username(loginId) 획득
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

        // 1) DB에서 locationName이 있는 planet_media 레코드 조회 (내 계정 기준)
        List<MapMediaDTO> locations = mapMediaDAO.getAllLocationsByUsername(loginId);

        // 2) 위도/경도 비어 있으면 Nominatim으로 보완 후 DB에 캐싱
        for (MapMediaDTO location : locations) {
            if (location.getLatitude() == null || location.getLongitude() == null) {
                String locationName = location.getLocationName();
                if (locationName != null && !locationName.isEmpty()) {
                    Double[] coords = nominatimService.geocode(locationName);
                    if (coords != null) {
                        Double lat = coords[0];
                        Double lng = coords[1];

                        location.setLatitude(lat);
                        location.setLongitude(lng);

                        // DB에도 위도/경도 업데이트
                        mapMediaDAO.updateCoordinates(location.getId(), lat, lng);
                    }
                }
            }
        }

        // 3) MapPage에서 기대하는 형식으로 변환
        List<MapLocationData> mapDataList = locations.stream()
                .filter(loc -> loc.getLatitude() != null && loc.getLongitude() != null)
                .map(loc -> new MapLocationData(
                        loc.getId(),
                        loc.getLocationName(),
                        loc.getLatitude(),
                        loc.getLongitude(),
                        loc.getSizeBytes() != null ? safeLongToInt(loc.getSizeBytes()) : 1
                ))
                .collect(Collectors.toList());

        // 4) JSON으로 응답
        response.setStatus(HttpServletResponse.SC_OK);
        response.getWriter().write(gson.toJson(mapDataList));
    }

    private static int safeLongToInt(Long v) {
        if (v == null) return 1;
        if (v > Integer.MAX_VALUE) return Integer.MAX_VALUE;
        if (v < 0) return 0;
        return v.intValue();
    }

    /**
     * CORS (credentials 지원)
     * - 같은 오리진이면 Origin이 없을 수 있으므로 그 경우는 헤더 없이 통과
     * - 다른 오리진이면 화이트리스트에 있는 Origin만 반사
     */
    private void applyCors(HttpServletRequest request, HttpServletResponse response) {
        String origin = request.getHeader("Origin");

        // 같은 오리진/서버 렌더링 환경에서는 Origin이 null일 수 있음
        if (origin != null && isAllowedOrigin(origin)) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Access-Control-Allow-Credentials", "true");
            response.setHeader("Vary", "Origin");
        }

        response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }

    private boolean isAllowedOrigin(String origin) {
        for (String o : ALLOWED_ORIGINS) {
            if (o.equals(origin)) return true;
        }
        return false;
    }

    /**
     * 프론트(MapPage)에서 사용하는 DTO 형태
     */
    static class MapLocationData {
        private Long id;
        private String name;   // locationName
        private Double lat;
        private Double lng;
        private Integer value; // sizeBytes를 value로 사용

        public MapLocationData(Long id, String name, Double lat, Double lng, Integer value) {
            this.id = id;
            this.name = name;
            this.lat = lat;
            this.lng = lng;
            this.value = value;
        }
    }
}
