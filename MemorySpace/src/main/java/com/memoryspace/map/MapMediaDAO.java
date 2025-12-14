package com.memoryspace.map;

import com.memoryspace.db.DBConnectionUtil;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;

/**
 * planet_media 테이블과 관련된 DB 작업을 담당하는 DAO
 * - MapPage(지도)에서 필요한 locationName/lat/lng 기반 데이터 조회용
 *
 * ✅ 리팩토링 DDL 호환:
 *   - mediaType -> type
 *   - filePath  -> url
 *   - isDeleted 필터 추가
 */
public class MapMediaDAO {

    /** locationName이 있는 데이터만 반환 (전체 조회) */
    public List<MapMediaDTO> getAllLocations() {
        List<MapMediaDTO> locations = new ArrayList<>();

        String sql =
                "SELECT pm.id, pm.planetId, pm.type, pm.url, pm.sizeBytes, " +
                "       pm.locationName, pm.latitude, pm.longitude " +
                "  FROM planet_media pm " +
                " WHERE pm.isDeleted = 0 " +
                "   AND pm.locationName IS NOT NULL AND pm.locationName <> ''";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {

            while (rs.next()) {
                locations.add(mapRowToDto(rs));
            }

        } catch (SQLException e) {
            e.printStackTrace();
        }

        return locations;
    }

    /**
     * ✅ 로그인한 사용자(username=loginId) 기준으로 location 데이터 반환
     *
     * Join:
     * planet_media.planetId -> planets.id
     * planets.starId -> stars.id
     * stars.userId -> users.id
     */
    public List<MapMediaDTO> getAllLocationsByUsername(String username) {
        List<MapMediaDTO> locations = new ArrayList<>();

        String sql =
                "SELECT pm.id, pm.planetId, pm.type, pm.url, pm.sizeBytes, " +
                "       pm.locationName, pm.latitude, pm.longitude " +
                "  FROM planet_media pm " +
                "  JOIN planets p ON p.id = pm.planetId " +
                "  JOIN stars s   ON s.id = p.starId " +
                "  JOIN users u   ON u.id = s.userId " +
                " WHERE u.username = ? " +
                "   AND p.isDeleted = 0 " +
                "   AND pm.isDeleted = 0 " +
                "   AND pm.locationName IS NOT NULL AND pm.locationName <> ''";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, username);

            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    locations.add(mapRowToDto(rs));
                }
            }

        } catch (SQLException e) {
            e.printStackTrace();
        }

        return locations;
    }

    /** 특정 미디어의 위도/경도 업데이트 */
    public boolean updateCoordinates(Long id, Double latitude, Double longitude) {
        String sql = "UPDATE planet_media SET latitude = ?, longitude = ? WHERE id = ?";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            if (latitude != null) pstmt.setDouble(1, latitude);
            else pstmt.setNull(1, Types.DOUBLE);

            if (longitude != null) pstmt.setDouble(2, longitude);
            else pstmt.setNull(2, Types.DOUBLE);

            pstmt.setLong(3, id);

            return pstmt.executeUpdate() > 0;

        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    /**
     * planet_media에 새로운 레코드 삽입
     * ✅ (planetId, type, url, sizeBytes, locationName, latitude, longitude)
     */
    public boolean insertMedia(
            Long planetId,
            String type,     // 'image' or 'video'
            String url,
            Long sizeBytes,
            String locationName,
            Double latitude,
            Double longitude
    ) {
        String sql =
                "INSERT INTO planet_media " +
                "(planetId, type, url, sizeBytes, locationName, latitude, longitude) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setLong(1, planetId);
            pstmt.setString(2, type);
            pstmt.setString(3, url);

            if (sizeBytes != null) pstmt.setLong(4, sizeBytes);
            else pstmt.setNull(4, Types.BIGINT);

            if (locationName != null && !locationName.isEmpty()) pstmt.setString(5, locationName);
            else pstmt.setNull(5, Types.VARCHAR);

            if (latitude != null) pstmt.setDouble(6, latitude);
            else pstmt.setNull(6, Types.DOUBLE);

            if (longitude != null) pstmt.setDouble(7, longitude);
            else pstmt.setNull(7, Types.DOUBLE);

            return pstmt.executeUpdate() > 0;

        } catch (SQLException e) {
            e.printStackTrace();
        }

        return false;
    }

    /** ID로 단일 미디어 조회 */
    public MapMediaDTO getMediaById(Long id) {
        String sql =
                "SELECT pm.id, pm.planetId, pm.type, pm.url, pm.sizeBytes, " +
                "       pm.locationName, pm.latitude, pm.longitude " +
                "  FROM planet_media pm " +
                " WHERE pm.id = ?";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setLong(1, id);

            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) return mapRowToDto(rs);
            }

        } catch (SQLException e) {
            e.printStackTrace();
        }

        return null;
    }

    /** planetId로 미디어 목록 조회 */
    public List<MapMediaDTO> getMediaByPlanetId(Long planetId) {
        List<MapMediaDTO> mediaList = new ArrayList<>();

        String sql =
                "SELECT pm.id, pm.planetId, pm.type, pm.url, pm.sizeBytes, " +
                "       pm.locationName, pm.latitude, pm.longitude " +
                "  FROM planet_media pm " +
                " WHERE pm.planetId = ? " +
                "   AND pm.isDeleted = 0";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setLong(1, planetId);

            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    mediaList.add(mapRowToDto(rs));
                }
            }

        } catch (SQLException e) {
            e.printStackTrace();
        }

        return mediaList;
    }

    /** 공통 매핑 */
    private MapMediaDTO mapRowToDto(ResultSet rs) throws SQLException {
        MapMediaDTO dto = new MapMediaDTO();
        dto.setId(rs.getLong("id"));
        dto.setPlanetId(rs.getLong("planetId"));
        dto.setType(rs.getString("type"));
        dto.setUrl(rs.getString("url"));

        Object sizeObj = rs.getObject("sizeBytes");
        dto.setSizeBytes(sizeObj != null ? rs.getLong("sizeBytes") : null);

        dto.setLocationName(rs.getString("locationName"));

        Object latObj = rs.getObject("latitude");
        Object lngObj = rs.getObject("longitude");
        dto.setLatitude(latObj != null ? rs.getDouble("latitude") : null);
        dto.setLongitude(lngObj != null ? rs.getDouble("longitude") : null);

        return dto;
    }
}
