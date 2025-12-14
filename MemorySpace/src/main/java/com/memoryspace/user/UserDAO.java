package com.memoryspace.user;

import com.memoryspace.db.DBConnectionUtil;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class UserDAO {

    // 로그인 체크 (username + passwordHash)
    public boolean checkLogin(String username, String password) {
        String sql = "SELECT COUNT(*) FROM users WHERE username = ? AND passwordHash = ?";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, username);
            pstmt.setString(2, password);

            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    int count = rs.getInt(1);
                    return count == 1;
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    // username 중복 여부 확인
    public boolean isUserIdExists(String username) {
        String sql = "SELECT COUNT(*) FROM users WHERE username = ?";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, username);

            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1) > 0;
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    // email 중복 여부 확인
    public boolean isEmailExists(String email) {
        String sql = "SELECT COUNT(*) FROM users WHERE email = ?";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, email);

            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1) > 0;
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    // 회원가입 (INSERT)
    public boolean createUser(String username,
                              String password,
                              String nickname,
                              String email,
                              String liveIn) {

        // role은 DEFAULT 'USER'로 둠
        String sql = "INSERT INTO users (username, passwordHash, nickname, email, liveIn) " +
                     "VALUES (?, ?, ?, ?, ?)";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, username);
            pstmt.setString(2, password);
            pstmt.setString(3, nickname);
            pstmt.setString(4, email);
            pstmt.setString(5, liveIn);

            int rows = pstmt.executeUpdate();
            return rows == 1;

        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }
    // username으로 사용자 한 명 조회
    public UserDTO getUserByUsername(String username) {
        String sql = "SELECT id, username, passwordHash, nickname, email, liveIn, role, status, penaltyEndAt " +
                     "FROM users WHERE username = ?";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, username);

            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    UserDTO user = new UserDTO();
                    user.setId(rs.getLong("id"));
                    user.setUsername(rs.getString("username"));
                    user.setPassword(rs.getString("passwordHash")); // 필요 없으면 사용 안 해도 됨
                    user.setNickname(rs.getString("nickname"));
                    user.setEmail(rs.getString("email"));
                    user.setLiveIn(rs.getString("liveIn"));
                    user.setRole(rs.getString("role"));
                    user.setStatus(rs.getString("status"));
                    user.setPenaltyEndAt(rs.getTimestamp("penaltyEndAt"));
                    return user;
                }
            }

        } catch (SQLException e) {
            e.printStackTrace();
        }

        return null;
    }

    // 프로필 수정 (닉네임, 이메일, 사는 지역)
    public boolean updateUser(String username,
                              String nickname,
                              String email,
                              String liveIn) {

        String sql = "UPDATE users SET nickname = ?, email = ?, liveIn = ? " +
                     "WHERE username = ?";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, nickname);
            pstmt.setString(2, email);
            pstmt.setString(3, liveIn);
            pstmt.setString(4, username);

            int rows = pstmt.executeUpdate();
            return rows == 1;

        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    // 비밀번호 확인 (현재 비밀번호 맞는지)
    public boolean verifyPassword(String username, String password) {
        String sql = "SELECT COUNT(*) FROM users " +
                     "WHERE username = ? AND passwordHash = ?";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, username);
            pstmt.setString(2, password);

            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    int count = rs.getInt(1);
                    return count == 1;
                }
            }

        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    // 비밀번호 변경
    public boolean changePassword(String username, String newPassword) {
        String sql = "UPDATE users SET passwordHash = ? WHERE username = ?";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, newPassword);  // 현재 구조상 해시 없이 그대로 저장 중
            pstmt.setString(2, username);

            int rows = pstmt.executeUpdate();
            return rows == 1;

        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    // 회원 탈퇴 (실제 삭제)
    public boolean deleteUser(String username) {
        String sql = "DELETE FROM users WHERE username = ?";

        try (Connection conn = DBConnectionUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, username);

            int rows = pstmt.executeUpdate();
            return rows == 1;

        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

}

