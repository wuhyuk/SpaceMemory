package com.memoryspace.admin;

import com.memoryspace.db.DBConnectionUtil;

import java.sql.*;
import java.util.*;

public class AdminDAO {

    // ---------- DTO 정의 ----------

    public static class AdminUserSummary {
        public long id;
        public String username;
        public String nickname;
        public String email;
        public String liveIn;
        public String role;
        public String status;
        public Timestamp penaltyEndAt;
        public long postCount;
        public long reportCount;
        public Timestamp lastLoginTime;
    }

    public static class AdminReportSummary {
        public long id;                 // 신고 ID (media_reports.id)
        public long planetId;           // 신고된 행성 ID
        public Long reporterUserId;     // 신고자 ID (nullable)
        public Long reportedUserId;     // 신고당한 유저 ID
        public String planetName;       // 행성 이름
        public String reporterNickname; // 신고자 닉네임
        public String reportedNickname; // 신고당한 닉네임
        public String reason;           // 신고 사유
        public String status;           // new / processed

        // ✅ 행성 삭제 여부(soft delete) - 새로고침 후에도 표시 유지용
        public boolean planetDeleted;
    }

    public static class AdminStats {
        public long totalUsers;
        public long usedBytes;
        public long totalBytes;
        public Map<String, Long> liveInCounts = new LinkedHashMap<>();
    }

    // ---------- 사용자 + 통계 ----------

    /**
     * 사용자 목록 + 각 사용자의 게시물 수 / 신고 누적 수 / 마지막 로그인 시간을 조회.
     *
     * 옵션 1(진짜 누적) 정책:
     * - reportCount는 삭제/미디어삭제/처리완료(processed) 여부와 무관하게 누적 카운트.
     * - 따라서 planets.isDeleted / planet_media.isDeleted / media_reports.status 로 필터링하지 않는다.
     */
    public List<AdminUserSummary> findAllUsersWithStats() throws SQLException {
        String sql =
                "SELECT " +
                "  u.id, u.username, u.nickname, u.email, u.liveIn, u.role, " +
                "  u.status, u.penaltyEndAt, " +

                // 게시물 수: 삭제되지 않은 행성만 카운트(기존 의도 유지)
                "  ( " +
                "    SELECT COUNT(*) " +
                "    FROM planets p " +
                "    JOIN stars s ON s.id = p.starId " +
                "    WHERE s.userId = u.id AND p.isDeleted = 0 " +
                "  ) AS postCount, " +

                // 신고 누적 수: 옵션 1(진짜 누적) - 삭제/처리 여부와 무관하게 유지
                "  ( " +
                "    SELECT COUNT(*) " +
                "    FROM media_reports mr " +
                "    JOIN planet_media pm ON pm.id = mr.mediaId " +
                "    JOIN planets p2 ON p2.id = pm.planetId " +
                "    JOIN stars s2 ON s2.id = p2.starId " +
                "    WHERE s2.userId = u.id " +
                "  ) AS reportCount, " +

                // 마지막 로그인
                "  (SELECT MAX(l.loginTime) FROM login_log l WHERE l.userId = u.id) AS lastLoginTime " +

                "FROM users u " +
                "ORDER BY u.id DESC";

        List<AdminUserSummary> result = new ArrayList<>();

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                AdminUserSummary s = new AdminUserSummary();
                s.id = rs.getLong("id");
                s.username = rs.getString("username");
                s.nickname = rs.getString("nickname");
                s.email = rs.getString("email");
                s.liveIn = rs.getString("liveIn");
                s.role = rs.getString("role");
                s.status = rs.getString("status");
                s.penaltyEndAt = rs.getTimestamp("penaltyEndAt");
                s.postCount = rs.getLong("postCount");
                s.reportCount = rs.getLong("reportCount");
                s.lastLoginTime = rs.getTimestamp("lastLoginTime");
                result.add(s);
            }
        }

        return result;
    }

    /**
     * 사용자 상태와 penaltyEndAt을 업데이트하고,
     * 변경된 사용자 정보를 담은 AdminUserSummary를 반환한다.
     * - 업데이트된 행이 없으면 null 반환.
     */
    public AdminUserSummary updateUserStatus(long userId, String status, Integer penaltyDays) throws SQLException {
        String sqlSuspended =
                "UPDATE users SET status = 'SUSPENDED', " +
                "       penaltyEndAt = DATE_ADD(NOW(), INTERVAL ? DAY) " +
                "WHERE id = ?";
        String sqlOther =
                "UPDATE users SET status = ?, penaltyEndAt = NULL " +
                "WHERE id = ?";

        try (Connection conn = DBConnectionUtil.getConnection()) {

            int updated;
            if ("SUSPENDED".equalsIgnoreCase(status) && penaltyDays != null) {
                try (PreparedStatement ps = conn.prepareStatement(sqlSuspended)) {
                    ps.setInt(1, penaltyDays);
                    ps.setLong(2, userId);
                    updated = ps.executeUpdate();
                }
            } else {
                try (PreparedStatement ps = conn.prepareStatement(sqlOther)) {
                    ps.setString(1, status.toUpperCase());
                    ps.setLong(2, userId);
                    updated = ps.executeUpdate();
                }
            }

            if (updated == 0) {
                return null;
            }

            String selectSql =
                    "SELECT id, username, nickname, email, liveIn, role, status, penaltyEndAt " +
                    "FROM users WHERE id = ?";

            try (PreparedStatement ps = conn.prepareStatement(selectSql)) {
                ps.setLong(1, userId);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        AdminUserSummary user = new AdminUserSummary();
                        user.id = rs.getLong("id");
                        user.username = rs.getString("username");
                        user.nickname = rs.getString("nickname");
                        user.email = rs.getString("email");
                        user.liveIn = rs.getString("liveIn");
                        user.role = rs.getString("role");
                        user.status = rs.getString("status");
                        user.penaltyEndAt = rs.getTimestamp("penaltyEndAt");
                        return user;
                    }
                }
            }
        }

        return null;
    }

    // ---------- 신고 관리 ----------

    /**
     * 신고 목록 조회.
     * ✅ 수정: p.isDeleted(행성 삭제 여부) 포함하여 새로고침 후에도 "삭제된 게시물" 표시 가능.
     */
    public List<AdminReportSummary> findAllReports() throws SQLException {
        String sql =
                "SELECT r.id AS reportId, pm.planetId AS planetId, r.reporterUserId, " +
                "       owner.id AS reportedUserId, " +
                "       p.name AS planetName, " +
                "       p.isDeleted AS planetDeleted, " +
                "       ru.nickname AS reporterNickname, " +
                "       owner.id AS ownerUserId, " +
                "       owner.nickname AS reportedNickname, " +
                "       r.reason, r.status " +
                "FROM media_reports r " +
                "JOIN planet_media pm ON pm.id = r.mediaId " +
                "JOIN planets p ON p.id = pm.planetId " +
                "JOIN stars s ON s.id = p.starId " +
                "JOIN users owner ON owner.id = s.userId " +
                "LEFT JOIN users ru ON ru.id = r.reporterUserId " +
                "ORDER BY r.id DESC";

        List<AdminReportSummary> result = new ArrayList<>();

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                AdminReportSummary r = new AdminReportSummary();
                r.id = rs.getLong("reportId");
                r.planetId = rs.getLong("planetId");

                long reporterId = rs.getLong("reporterUserId");
                if (rs.wasNull()) {
                    r.reporterUserId = null;
                } else {
                    r.reporterUserId = reporterId;
                }

                long reportedId = rs.getLong("reportedUserId");
                if (rs.wasNull()) {
                    reportedId = rs.getLong("ownerUserId");
                }
                r.reportedUserId = reportedId;

                r.planetName = rs.getString("planetName");
                r.reporterNickname = rs.getString("reporterNickname");
                r.reportedNickname = rs.getString("reportedNickname");
                r.reason = rs.getString("reason");
                r.status = rs.getString("status");

                r.planetDeleted = rs.getInt("planetDeleted") == 1;

                result.add(r);
            }
        }

        return result;
    }

    /**
     * 신고 상태를 processed 로 변경.
     */
    public boolean resolveReport(long reportId) throws SQLException {
        String sql = "UPDATE media_reports SET status = 'processed', processedAt = NOW() WHERE id = ?";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setLong(1, reportId);
            int updated = ps.executeUpdate();
            return updated > 0;
        }
    }

    /**
     * 행성을 soft delete 하고, 해당 신고도 processed 로 변경.
     */
    public boolean deletePlanetAndResolveReport(long planetId, long reportId) throws SQLException {
        String updatePlanetSql = "UPDATE planets SET isDeleted = 1 WHERE id = ?";
        String updateReportSql = "UPDATE media_reports SET status = 'processed', processedAt = NOW() WHERE id = ?";

        try (Connection conn = DBConnectionUtil.getConnection()) {
            conn.setAutoCommit(false);

            try (PreparedStatement ps1 = conn.prepareStatement(updatePlanetSql);
                 PreparedStatement ps2 = conn.prepareStatement(updateReportSql)) {

                ps1.setLong(1, planetId);
                int updatedPlanet = ps1.executeUpdate();

                ps2.setLong(1, reportId);
                int updatedReport = ps2.executeUpdate();

                if (updatedPlanet > 0 && updatedReport > 0) {
                    conn.commit();
                    return true;
                } else {
                    conn.rollback();
                    return false;
                }
            } catch (SQLException e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    // ---------- 통계 ----------

    public AdminStats getStats() throws SQLException {
        AdminStats stats = new AdminStats();

        String userCountSql = "SELECT COUNT(*) AS cnt FROM users";

        String mediaSizeSql =
                "SELECT COALESCE(SUM(pm.sizeBytes), 0) AS totalSize " +
                "FROM planet_media pm " +
                "JOIN planets p ON pm.planetId = p.id " +
                "WHERE p.isDeleted = 0";

        String liveInSql =
                "SELECT liveIn, COUNT(*) AS cnt " +
                "FROM users " +
                "GROUP BY liveIn " +
                "ORDER BY cnt DESC";

        try (Connection conn = DBConnectionUtil.getConnection()) {

            try (PreparedStatement ps = conn.prepareStatement(userCountSql);
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    stats.totalUsers = rs.getLong("cnt");
                }
            }

            try (PreparedStatement ps = conn.prepareStatement(mediaSizeSql);
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    stats.usedBytes = rs.getLong("totalSize");
                }
            }

            try (PreparedStatement ps = conn.prepareStatement(liveInSql);
                 ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    String liveIn = rs.getString("liveIn");
                    long cnt = rs.getLong("cnt");
                    if (liveIn == null || liveIn.isBlank()) {
                        liveIn = "미입력";
                    }
                    stats.liveInCounts.put(liveIn, cnt);
                }
            }
        }

        stats.totalBytes = 10L * 1024 * 1024 * 1024;

        return stats;
    }
    // ---------- (추가) 관리자용 행성 상세 조회 ----------

    public static class AdminPlanetMediaRow {
        public long id;
        public String type;       // image/video
        public String url;
        public boolean isDeleted;
        public String description;
        public String createdAt;  // string for JSON (Timestamp.toString())
    }

    public static class AdminPlanetDetail {
        public long planetId;
        public String planetName;
        public boolean planetDeleted;
        public long starId;
        public long ownerUserId;
        public String ownerNickname;
        public Long thumbnailMediaId;
        public List<AdminPlanetMediaRow> mediaList = new ArrayList<>();
    }

    /**
     * 관리자 전용: 삭제된 행성도 포함하여 행성 상세 + 미디어 목록을 조회.
     * (옵션: 미디어도 삭제 포함해서 모두 보여줌)
     */
    public AdminPlanetDetail findPlanetDetailForAdmin(long planetId) throws SQLException {
        AdminPlanetDetail detail = null;

        String planetSql =
                "SELECT p.id AS planetId, p.name AS planetName, p.isDeleted AS planetDeleted, " +
                "       p.starId, p.thumbnailMediaId, " +
                "       u.id AS ownerUserId, u.nickname AS ownerNickname " +
                "FROM planets p " +
                "JOIN stars s ON s.id = p.starId " +
                "JOIN users u ON u.id = s.userId " +
                "WHERE p.id = ?";

        String mediaSql =
                "SELECT pm.id, pm.type, pm.url, pm.isDeleted, pm.description, pm.createdAt " +
                "FROM planet_media pm " +
                "WHERE pm.planetId = ? " +
                "ORDER BY pm.createdAt DESC, pm.id DESC";

        try (Connection conn = DBConnectionUtil.getConnection()) {
            // 1) 행성 기본 정보
            try (PreparedStatement ps = conn.prepareStatement(planetSql)) {
                ps.setLong(1, planetId);
                try (ResultSet rs = ps.executeQuery()) {
                    if (!rs.next()) return null;

                    detail = new AdminPlanetDetail();
                    detail.planetId = rs.getLong("planetId");
                    detail.planetName = rs.getString("planetName");
                    detail.planetDeleted = rs.getInt("planetDeleted") == 1;
                    detail.starId = rs.getLong("starId");
                    long thumb = rs.getLong("thumbnailMediaId");
                    detail.thumbnailMediaId = rs.wasNull() ? null : thumb;
                    detail.ownerUserId = rs.getLong("ownerUserId");
                    detail.ownerNickname = rs.getString("ownerNickname");
                }
            }

            // 2) 미디어 목록(삭제 포함)
            try (PreparedStatement ps = conn.prepareStatement(mediaSql)) {
                ps.setLong(1, planetId);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        AdminPlanetMediaRow m = new AdminPlanetMediaRow();
                        m.id = rs.getLong("id");
                        m.type = rs.getString("type");
                        m.url = rs.getString("url");
                        m.isDeleted = rs.getInt("isDeleted") == 1;
                        m.description = rs.getString("description");
                        Timestamp t = rs.getTimestamp("createdAt");
                        m.createdAt = (t == null) ? null : t.toString();
                        detail.mediaList.add(m);
                    }
                }
            }
        }

        return detail;
    }

}
