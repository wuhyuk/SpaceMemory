package com.memoryspace.map;

public class MapMediaDTO {
    private Long id;
    private Long planetId;

    // ✅ 리팩토링 DDL 기준
    private String type;   // 'image' | 'video'
    private String url;    // 접근 URL

    private Long sizeBytes;
    private String locationName;
    private Double latitude;
    private Double longitude;

    public MapMediaDTO() {}

    public MapMediaDTO(Long id, Long planetId, String type, String url,
                       Long sizeBytes, String locationName, Double latitude, Double longitude) {
        this.id = id;
        this.planetId = planetId;
        this.type = type;
        this.url = url;
        this.sizeBytes = sizeBytes;
        this.locationName = locationName;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPlanetId() { return planetId; }
    public void setPlanetId(Long planetId) { this.planetId = planetId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public Long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }

    public String getLocationName() { return locationName; }
    public void setLocationName(String locationName) { this.locationName = locationName; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    @Override
    public String toString() {
        return "MapMediaDTO{" +
                "id=" + id +
                ", planetId=" + planetId +
                ", type='" + type + '\'' +
                ", locationName='" + locationName + '\'' +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                '}';
    }
}
