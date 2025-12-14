package com.memoryspace.planet;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class PlanetDao {

    public boolean isStarOwner(Connection con, long starId, long userId) throws SQLException {
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            ps = con.prepareStatement("SELECT 1 FROM stars WHERE id=? AND userId=? LIMIT 1");
            ps.setLong(1, starId);
            ps.setLong(2, userId);
            rs = ps.executeQuery();
            return rs.next();
        } finally {
            PlanetJson.closeQuietly(rs);
            PlanetJson.closeQuietly(ps);
        }
    }

    public boolean planetBelongsToStar(Connection con, long planetId, long starId) throws SQLException {
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            ps = con.prepareStatement("SELECT 1 FROM planets WHERE id=? AND starId=? LIMIT 1");
            ps.setLong(1, planetId);
            ps.setLong(2, starId);
            rs = ps.executeQuery();
            return rs.next();
        } finally {
            PlanetJson.closeQuietly(rs);
            PlanetJson.closeQuietly(ps);
        }
    }

    public int countPlanetsByStar(Connection con, long starId) throws SQLException {
        String sql = "SELECT COUNT(*) FROM planets WHERE starId=? AND isDeleted=0";
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            ps = con.prepareStatement(sql);
            ps.setLong(1, starId);
            rs = ps.executeQuery();
            if (!rs.next()) return 0;
            return rs.getInt(1);
        } finally {
            PlanetJson.closeQuietly(rs);
            PlanetJson.closeQuietly(ps);
        }
    }

    public List<PlanetDto> listPlanets(Connection con, long starId) throws SQLException {
        String sql =
            "SELECT " +
            "  p.id, p.starId, p.name, p.thumbnailMediaId, p.sortOrder, " +
            "  m.url AS thumbnailUrl, m.type AS thumbnailType " +
            "FROM planets p " +
            "LEFT JOIN planet_media m ON m.id = p.thumbnailMediaId AND m.isDeleted=0 " +
            "WHERE p.starId=? AND p.isDeleted=0 " +
            "ORDER BY p.sortOrder ASC, p.id ASC";

        PreparedStatement ps = null;
        ResultSet rs = null;
        List<PlanetDto> list = new ArrayList<>();

        try {
            ps = con.prepareStatement(sql);
            ps.setLong(1, starId);
            rs = ps.executeQuery();

            while (rs.next()) {
                PlanetDto dto = new PlanetDto();
                dto.id = rs.getLong("id");
                dto.starId = rs.getLong("starId");
                dto.name = rs.getString("name");

                // NULL 안전
                dto.thumbnailMediaId = rs.getObject("thumbnailMediaId", Long.class);

                dto.sortOrder = rs.getInt("sortOrder");
                dto.thumbnailUrl = rs.getString("thumbnailUrl");
                dto.thumbnailType = rs.getString("thumbnailType"); // 'image'/'video' :contentReference[oaicite:8]{index=8}

                list.add(dto);
            }
        } finally {
            PlanetJson.closeQuietly(rs);
            PlanetJson.closeQuietly(ps);
        }

        return list;
    }

    public int nextSortOrder(Connection con, long starId) throws SQLException {
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            ps = con.prepareStatement(
                    "SELECT COALESCE(MAX(sortOrder),0) + 1 FROM planets WHERE starId=? AND isDeleted=0"
            );
            ps.setLong(1, starId);
            rs = ps.executeQuery();
            rs.next();
            return rs.getInt(1);
        } finally {
            PlanetJson.closeQuietly(rs);
            PlanetJson.closeQuietly(ps);
        }
    }

    public long insertPlanet(Connection con, long starId, String name) throws SQLException {
        String sql = "INSERT INTO planets (starId, name) VALUES (?, ?)";
        PreparedStatement ps = null;
        ResultSet keys = null;
        try {
            ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, starId);
            ps.setString(2, name);
            ps.executeUpdate();

            keys = ps.getGeneratedKeys();
            if (!keys.next()) throw new SQLException("Failed to get generated planet id");
            return keys.getLong(1);
        } finally {
            PlanetJson.closeQuietly(keys);
            PlanetJson.closeQuietly(ps);
        }
    }

    public void updatePlanetThumbnail(Connection con, long planetId, long starId, long mediaId) throws SQLException {
        PreparedStatement ps = null;
        try {
            ps = con.prepareStatement(
                    "UPDATE planets SET thumbnailMediaId=? WHERE id=? AND starId=? AND isDeleted=0"
            );
            ps.setLong(1, mediaId);
            ps.setLong(2, planetId);
            ps.setLong(3, starId);
            ps.executeUpdate();
        } finally {
            PlanetJson.closeQuietly(ps);
        }
    }

    public void updatePlanetName(Connection con, String name, long planetId, long starId) throws SQLException {
        PreparedStatement ps = null;
        try {
            ps = con.prepareStatement(
                    "UPDATE planets SET name=? WHERE id=? AND starId=? AND isDeleted=0"
            );
            ps.setString(1, name);
            ps.setLong(2, planetId);
            ps.setLong(3, starId);
            ps.executeUpdate();
        } finally {
            PlanetJson.closeQuietly(ps);
        }
    }

    public void updatePlanetNameAndThumbnail(Connection con, String name, long mediaId, long planetId, long starId) throws SQLException {
        PreparedStatement ps = null;
        try {
            ps = con.prepareStatement(
                    "UPDATE planets SET name=?, thumbnailMediaId=? WHERE id=? AND starId=? AND isDeleted=0"
            );
            ps.setString(1, name);
            ps.setLong(2, mediaId);
            ps.setLong(3, planetId);
            ps.setLong(4, starId);
            ps.executeUpdate();
        } finally {
            PlanetJson.closeQuietly(ps);
        }
    }

    public int softDeletePlanet(Connection con, long planetId, long starId) throws SQLException {
        PreparedStatement ps = null;
        try {
            ps = con.prepareStatement(
                    "UPDATE planets SET isDeleted=1, deletedAt=NOW() WHERE id=? AND starId=? AND isDeleted=0"
            );
            ps.setLong(1, planetId);
            ps.setLong(2, starId);
            return ps.executeUpdate();
        } finally {
            PlanetJson.closeQuietly(ps);
        }
    }

    public long insertMedia(Connection con, long planetId, StoredFile stored) throws SQLException {
        String type = stored.isVideo ? "video" : "image";

        PreparedStatement ps = null;
        ResultSet keys = null;
        try {
            ps = con.prepareStatement(
                    "INSERT INTO planet_media (planetId, type, url, originalName, mimeType, sizeBytes, description, isDeleted) " +
                    "VALUES (?,?,?,?,?,?,NULL,0)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setLong(1, planetId);
            ps.setString(2, type);
            ps.setString(3, stored.publicUrl);
            ps.setString(4, stored.originalName);
            ps.setString(5, stored.mimeType);
            ps.setLong(6, stored.sizeBytes);

            ps.executeUpdate();
            keys = ps.getGeneratedKeys();
            if (!keys.next()) throw new SQLException("Failed to get mediaId");
            return keys.getLong(1);
        } finally {
            PlanetJson.closeQuietly(keys);
            PlanetJson.closeQuietly(ps);
        }
    }
 // ✅ 대표 썸네일을 "INSERT"가 아닌 "UPDATE"로 교체하기 위한 헬퍼
    public Long getThumbnailMediaId(Connection con, long planetId, long starId) throws SQLException {
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            ps = con.prepareStatement(
                "SELECT thumbnailMediaId FROM planets WHERE id=? AND starId=? AND isDeleted=0"
            );
            ps.setLong(1, planetId);
            ps.setLong(2, starId);
            rs = ps.executeQuery();
            if (!rs.next()) return null;

            long v = rs.getLong(1);
            if (rs.wasNull()) return null;
            return Long.valueOf(v);
        } finally {
            PlanetJson.closeQuietly(rs);
            PlanetJson.closeQuietly(ps);
        }
    }

    public void updateMediaFile(Connection con, long mediaId, StoredFile stored) throws SQLException {
        String type = stored.isVideo ? "video" : "image";

        PreparedStatement ps = null;
        try {
            ps = con.prepareStatement(
                "UPDATE planet_media SET type=?, url=?, originalName=?, mimeType=?, sizeBytes=? " +
                "WHERE id=? AND isDeleted=0"
            );
            ps.setString(1, type);
            ps.setString(2, stored.publicUrl);
            ps.setString(3, stored.originalName);
            ps.setString(4, stored.mimeType);
            ps.setLong(5, stored.sizeBytes);
            ps.setLong(6, mediaId);
            ps.executeUpdate();
        } finally {
            PlanetJson.closeQuietly(ps);
        }
    }
}
