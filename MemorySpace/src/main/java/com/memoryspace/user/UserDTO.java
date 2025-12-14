package com.memoryspace.user;

import java.sql.Timestamp;

public class UserDTO {
    private Long id;
    private String username;
    private String password;   // 필요 없으면 안 써도 되지만 일단 둠
    private String nickname;
    private String email;
    private String liveIn;
    private String role;
    private String status;
    private Timestamp penaltyEndAt;

    public UserDTO() {
    }

    // --- getter / setter ---

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getLiveIn() {
        return liveIn;
    }

    public void setLiveIn(String liveIn) {
        this.liveIn = liveIn;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Timestamp getPenaltyEndAt() {
        return penaltyEndAt;
    }

    public void setPenaltyEndAt(Timestamp penaltyEndAt) {
        this.penaltyEndAt = penaltyEndAt;
    }
}
