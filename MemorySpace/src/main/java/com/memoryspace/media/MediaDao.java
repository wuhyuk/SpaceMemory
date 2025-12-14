package com.memoryspace.media;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class MediaDao {

    public boolean isPlanetOwner(Connection con, long planetId, long userId) throws SQLException {
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            ps = con.prepareStatement(
                    "SELECT 1 " +
                    "FROM planets p " +
                    "JOIN stars s ON s.id = p.starId " +
                    "WHERE p.id=? AND p.isDeleted=0 AND s.userId=? " +
                    "LIMIT 1"
            );
            ps.setLong(1, planetId);
            ps.setLong(2, userId);
            rs = ps.executeQuery();
            return rs.next();
        } finally {
            MediaJson.closeQuietly(rs);
            MediaJson.closeQuietly(ps);
        }
    }

    public boolean mediaBelongsToPlanet(Connection con, long mediaId, long planetId) throws SQLException {
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            ps = con.prepareStatement(
                    "SELECT 1 FROM planet_media WHERE id=? AND planetId=? LIMIT 1"
            );
            ps.setLong(1, mediaId);
            ps.setLong(2, planetId);
            rs = ps.executeQuery();
            return rs.next();
        } finally {
            MediaJson.closeQuietly(rs);
            MediaJson.closeQuietly(ps);
        }
    }

    public long insertMedia(Connection con,
                            long planetId,
                            StoredUpload stored,
                            String description,
                            String locationName) throws SQLException {

        PreparedStatement ps = null;
        ResultSet keys = null;
        try {
            ps = con.prepareStatement(
                    "INSERT INTO planet_media " +
                    "(planetId, type, url, originalName, mimeType, sizeBytes, description, locationName, isDeleted) " +
                    "VALUES (?,?,?,?,?,?,?,?,0)",
                    Statement.RETURN_GENERATED_KEYS
            );
            ps.setLong(1, planetId);
            ps.setString(2, stored.type);
            ps.setString(3, stored.publicUrl);
            ps.setString(4, stored.originalName);
            ps.setString(5, stored.mimeType);
            ps.setLong(6, stored.sizeBytes);
            ps.setString(7, description);
            ps.setString(8, locationName);

            ps.executeUpdate();

            keys = ps.getGeneratedKeys();
            if (!keys.next()) throw new SQLException("Failed to get mediaId");
            return keys.getLong(1);

        } finally {
            MediaJson.closeQuietly(keys);
            MediaJson.closeQuietly(ps);
        }
    }

    public void updateMediaMeta(Connection con, long mediaId, long planetId, MediaMetaDto meta) throws SQLException {
        PreparedStatement ps = null;
        try {
            ps = con.prepareStatement(
                    "UPDATE planet_media SET description=?, locationName=? " +
                    "WHERE id=? AND planetId=? AND isDeleted=0"
            );
            ps.setString(1, meta.description);
            ps.setString(2, meta.locationName);
            ps.setLong(3, mediaId);
            ps.setLong(4, planetId);
            ps.executeUpdate();
        } finally {
            MediaJson.closeQuietly(ps);
        }
    }

    public int softDeleteMedia(Connection con, long mediaId, long planetId) throws SQLException {
        PreparedStatement ps = null;
        try {
            ps = con.prepareStatement(
                    "UPDATE planet_media SET isDeleted=1, deletedAt=NOW() " +
                    "WHERE id=? AND planetId=? AND isDeleted=0"
            );
            ps.setLong(1, mediaId);
            ps.setLong(2, planetId);
            return ps.executeUpdate();
        } finally {
            MediaJson.closeQuietly(ps);
        }
    }

    public void clearThumbnailIfMatches(Connection con, long planetId, long mediaId) throws SQLException {
        PreparedStatement ps = null;
        try {
            ps = con.prepareStatement(
                    "UPDATE planets SET thumbnailMediaId=NULL " +
                    "WHERE id=? AND thumbnailMediaId=?"
            );
            ps.setLong(1, planetId);
            ps.setLong(2, mediaId);
            ps.executeUpdate();
        } finally {
            MediaJson.closeQuietly(ps);
        }
    }

    public List<MediaDto> listMedia(Connection con, long planetId, long userId) throws SQLException {
        // liked/starred/reported(본인) 상태를 EXISTS로 계산
    	String sql =
    		    "SELECT m.id, m.planetId, m.type, m.url, m.description, m.locationName, m.createdAt, " +
    		    "  EXISTS(SELECT 1 FROM media_likes ml WHERE ml.mediaId=m.id AND ml.userId=?) AS liked, " +
    		    "  EXISTS(SELECT 1 FROM media_favorites mf WHERE mf.mediaId=m.id AND mf.userId=?) AS starred, " +
    		    "  EXISTS(SELECT 1 FROM media_reports mr WHERE mr.mediaId=m.id AND mr.reporterUserId=?) AS reported " +
    		    "FROM planet_media m " +
    		    "JOIN planets p ON p.id = m.planetId " +
    		    "WHERE m.planetId=? AND m.isDeleted=0 " +
    		    "  AND (p.thumbnailMediaId IS NULL OR m.id <> p.thumbnailMediaId) " +
    		    "ORDER BY m.createdAt ASC, m.id ASC";

        PreparedStatement ps = null;
        ResultSet rs = null;

        List<MediaDto> out = new ArrayList<MediaDto>();
        try {
            ps = con.prepareStatement(sql);
            ps.setLong(1, userId);
            ps.setLong(2, userId);
            ps.setLong(3, userId);
            ps.setLong(4, planetId);

            rs = ps.executeQuery();
            while (rs.next()) {
                MediaDto d = new MediaDto();
                d.id = rs.getLong("id");
                d.planetId = rs.getLong("planetId");
                d.mediaType = rs.getString("type"); // 프론트는 mediaType 사용
                d.url = rs.getString("url");
                d.description = rs.getString("description");
                d.location = rs.getString("locationName");
                d.createdAt = rs.getTimestamp("createdAt");
                d.liked = rs.getInt("liked") == 1;
                d.starred = rs.getInt("starred") == 1;
                d.reported = rs.getInt("reported") == 1;

                d.tags = listTagNamesForMedia(con, d.id);
                out.add(d);
            }

            return out;

        } finally {
            MediaJson.closeQuietly(rs);
            MediaJson.closeQuietly(ps);
        }
    }

    public MediaDto getMediaOne(Connection con, long mediaId, long userId) throws SQLException {
        String sql =
                "SELECT m.id, m.planetId, m.type, m.url, m.description, m.locationName, m.createdAt, " +
                "  EXISTS(SELECT 1 FROM media_likes ml WHERE ml.mediaId=m.id AND ml.userId=?) AS liked, " +
                "  EXISTS(SELECT 1 FROM media_favorites mf WHERE mf.mediaId=m.id AND mf.userId=?) AS starred, " +
                "  EXISTS(SELECT 1 FROM media_reports mr WHERE mr.mediaId=m.id AND mr.reporterUserId=?) AS reported " +
                "FROM planet_media m " +
                "WHERE m.id=? LIMIT 1";

        PreparedStatement ps = null;
        ResultSet rs = null;

        try {
            ps = con.prepareStatement(sql);
            ps.setLong(1, userId);
            ps.setLong(2, userId);
            ps.setLong(3, userId);
            ps.setLong(4, mediaId);

            rs = ps.executeQuery();
            if (!rs.next()) return null;

            MediaDto d = new MediaDto();
            d.id = rs.getLong("id");
            d.planetId = rs.getLong("planetId");
            d.mediaType = rs.getString("type");
            d.url = rs.getString("url");
            d.description = rs.getString("description");
            d.location = rs.getString("locationName");
            d.createdAt = rs.getTimestamp("createdAt");
            d.liked = rs.getInt("liked") == 1;
            d.starred = rs.getInt("starred") == 1;
            d.reported = rs.getInt("reported") == 1;

            d.tags = listTagNamesForMedia(con, d.id);
            return d;

        } finally {
            MediaJson.closeQuietly(rs);
            MediaJson.closeQuietly(ps);
        }
    }

    public List<String> listTagNamesForMedia(Connection con, long mediaId) throws SQLException {
        String sql =
                "SELECT t.name " +
                "FROM media_tags mt " +
                "JOIN tags t ON t.id = mt.tagId " +
                "WHERE mt.mediaId=? " +
                "ORDER BY t.name ASC";

        PreparedStatement ps = null;
        ResultSet rs = null;
        List<String> out = new ArrayList<String>();

        try {
            ps = con.prepareStatement(sql);
            ps.setLong(1, mediaId);
            rs = ps.executeQuery();
            while (rs.next()) out.add(rs.getString(1));
            return out;
        } finally {
            MediaJson.closeQuietly(rs);
            MediaJson.closeQuietly(ps);
        }
    }

    public void replaceMediaTags(Connection con, long mediaId, List<String> tagNames) throws SQLException {
        // 기존 전부 삭제 후 재삽입 (단순/명확)
        PreparedStatement del = null;
        try {
            del = con.prepareStatement("DELETE FROM media_tags WHERE mediaId=?");
            del.setLong(1, mediaId);
            del.executeUpdate();
        } finally {
            MediaJson.closeQuietly(del);
        }

        if (tagNames == null || tagNames.isEmpty()) return;

        for (int i = 0; i < tagNames.size(); i++) {
            String n = tagNames.get(i);
            if (n == null) continue;
            n = n.trim();
            if (n.isEmpty()) continue;

            long tagId = findOrCreateTag(con, n);
            linkMediaTag(con, mediaId, tagId);
        }
    }

    private long findOrCreateTag(Connection con, String name) throws SQLException {
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            ps = con.prepareStatement("SELECT id FROM tags WHERE name=? LIMIT 1");
            ps.setString(1, name);
            rs = ps.executeQuery();
            if (rs.next()) return rs.getLong(1);
        } finally {
            MediaJson.closeQuietly(rs);
            MediaJson.closeQuietly(ps);
        }

        PreparedStatement ins = null;
        ResultSet keys = null;
        try {
            ins = con.prepareStatement("INSERT INTO tags (name) VALUES (?)", Statement.RETURN_GENERATED_KEYS);
            ins.setString(1, name);
            ins.executeUpdate();
            keys = ins.getGeneratedKeys();
            if (!keys.next()) throw new SQLException("Failed to get tagId");
            return keys.getLong(1);
        } finally {
            MediaJson.closeQuietly(keys);
            MediaJson.closeQuietly(ins);
        }
    }

    private void linkMediaTag(Connection con, long mediaId, long tagId) throws SQLException {
        PreparedStatement ps = null;
        try {
            ps = con.prepareStatement("INSERT IGNORE INTO media_tags (mediaId, tagId) VALUES (?,?)");
            ps.setLong(1, mediaId);
            ps.setLong(2, tagId);
            ps.executeUpdate();
        } finally {
            MediaJson.closeQuietly(ps);
        }
    }
}
