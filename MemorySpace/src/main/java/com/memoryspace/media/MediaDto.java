package com.memoryspace.media;

import java.sql.Timestamp;
import java.util.List;

public class MediaDto {
    public long id;
    public long planetId;

    // 프론트 usePlanetSystem이 mediaType을 사용하므로 이름을 맞춤
    public String mediaType; // "image" | "video"
    public String url;

    public String description; // nullable
    public String location;    // nullable
    public List<String> tags;

    public boolean liked;
    public boolean starred;
    public boolean reported;

    public Timestamp createdAt;
}
