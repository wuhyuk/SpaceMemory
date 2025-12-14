package com.memoryspace.star;

/**
 * 별(Star) 데이터를 위한 DTO (Data Transfer Object) 클래스입니다.
 * DB와 웹 계층 간의 데이터 전송에 사용됩니다.
 * 사용자 ID와 별 ID는 Long 타입입니다.
 */
public class StarDTO {
    private Long id;
    private Long userId; // 이 별을 소유한 사용자 ID (Long 타입)
    private String name;   // 별의 이름

    // 기본 생성자
    public StarDTO() {}

    // Getter와 Setter
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    @Override
    public String toString() {
        return "StarDTO{" +
                "id=" + id +
                ", userId='" + userId + '\'' +
                ", name='" + name + '\'' +
                '}';
    }
}