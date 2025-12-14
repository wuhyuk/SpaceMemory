package com.memoryspace.planet;

public class PlanetDto {

    // ===== 기본 컬럼 =====
    public long id;
    public long starId;
    public String name;

    // ===== 정렬 =====
    public int sortOrder;

    // ===== 대표 썸네일 =====
    public Long thumbnailMediaId;   // nullable
    public String thumbnailUrl;     // JOIN 결과 (planet_media.url)
    public String thumbnailType;    // image / video

    // ===== 생성자(optional) =====
    public PlanetDto() {
    }
}
