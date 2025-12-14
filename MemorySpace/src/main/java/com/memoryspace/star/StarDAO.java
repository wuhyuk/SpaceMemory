package com.memoryspace.star;

import com.memoryspace.db.DBConnectionUtil;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * StarDTO에 대한 데이터베이스 접근 객체(DAO)입니다.
 * userId와 id는 Long 타입으로 처리하며, DBConnectionUtil을 사용합니다.
 */
public class StarDAO {

    private static final int MAX_STARS = 12; // 최대 별 개수 제한

    /**
     * username(String)을 통해 users 테이블의 id(Long)를 조회
     * @param username 조회할 사용자 이름
     * @return 사용자의 ID (Long), 없으면 null
     */
    public Long getUserIdByUsername(String username) {
        String sql = "SELECT id FROM users WHERE username = ?";
        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, username);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getLong("id");
                }
            }
        } catch (SQLException e) {
            System.err.println("Error fetching user ID by username: " + username);
            e.printStackTrace();
        }
        return null; 
    }

    /**
     * 특정 사용자의 별 목록 조회
     * @param userId 조회할 사용자 ID
     * @return StarDTO 목록
     */
    public List<StarDTO> getStarsByUserId(Long userId) {
        List<StarDTO> stars = new ArrayList<>();
        String sql = "SELECT id, userId, name FROM stars WHERE userId = ? ORDER BY id ASC";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setLong(1, userId);
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    StarDTO star = new StarDTO();
                    star.setId(rs.getLong("id"));
                    star.setUserId(rs.getLong("userId"));
                    star.setName(rs.getString("name"));
                    stars.add(star);
                }
            }
        } catch (SQLException e) {
            System.err.println("Error fetching stars for user ID: " + userId);
            e.printStackTrace();
        }
        return stars;
    }

    /**
     * 별 생성 (이름과 userId만 저장)
     * @param star 생성할 별의 DTO (userId와 name 필드 사용)
     * @return 성공 여부
     */
    public boolean createStar(StarDTO star) {
        if (getStarCount(star.getUserId()) >= MAX_STARS) {
            System.err.println("Star creation failed: User " + star.getUserId() + " has reached the limit.");
            return false;
        }

        String sql = "INSERT INTO stars (userId, name) VALUES (?, ?)";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setLong(1, star.getUserId());
            pstmt.setString(2, star.getName());

            return pstmt.executeUpdate() == 1;

        } catch (SQLException e) {
            System.err.println("Error creating star: " + star.getName());
            e.printStackTrace();
        }
        return false;
    }

    /**
     * 별 삭제 (소유자 확인 포함)
     * @param starId 삭제할 별 ID
     * @param userId 삭제를 요청한 사용자 ID
     * @return 성공 여부
     */
    public boolean deleteStar(Long starId, Long userId) {
        String sql = "DELETE FROM stars WHERE id = ? AND userId = ?";
        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setLong(1, starId);
            pstmt.setLong(2, userId);
            
            return pstmt.executeUpdate() == 1;

        } catch (SQLException e) {
            System.err.println("Error deleting star ID: " + starId + " by user ID: " + userId);
            e.printStackTrace();
        }
        return false;
    }

    /**
     * ⭐ [추가] 별 이름 수정 (소유자 확인 포함)
     * @param starId 수정할 별 ID
     * @param userId 요청한 사용자 ID
     * @param newName 새 이름
     * @return 성공 여부
     */
    public boolean updateStarName(Long starId, Long userId, String newName) {
        String sql = "UPDATE stars SET name = ? WHERE id = ? AND userId = ?";
        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, newName);
            pstmt.setLong(2, starId);
            pstmt.setLong(3, userId);
            
            int updated = pstmt.executeUpdate();
            
            if (updated == 1) {
                System.out.println("✅ Star name updated: ID=" + starId + ", newName=" + newName);
                return true;
            } else {
                System.err.println("❌ Star update failed: ID=" + starId + " (not owner or not found)");
                return false;
            }

        } catch (SQLException e) {
            System.err.println("Error updating star name for ID: " + starId);
            e.printStackTrace();
        }
        return false;
    }

    /**
     * 현재 사용자의 별 개수 확인
     * @param userId 확인할 사용자 ID
     * @return 현재 별 개수
     */
    private int getStarCount(Long userId) {
        String sql = "SELECT COUNT(*) FROM stars WHERE userId = ?";
        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setLong(1, userId);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) return rs.getInt(1);
            }
        } catch (SQLException e) {
            System.err.println("Error counting stars for user ID: " + userId);
            e.printStackTrace();
        }
        return 0;
    }
}