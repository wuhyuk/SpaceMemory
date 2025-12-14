/* =========================================================
   MemorySpace - Planet/Media 중심 리팩토링 DDL (MySQL 8.x)
   - 기존 DB_Frame 기반: users/stars/planets/planet_media/tags/planet_tags/reports/login_log
   - 프론트 요구사항 반영: media.description, media 태그, 좋아요/즐겨찾기/신고(유저별)
   ========================================================= */

-- 안전 설정(선택)
SET FOREIGN_KEY_CHECKS = 0;

-- DB 생성/선택
CREATE DATABASE IF NOT EXISTS memoryspace
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE memoryspace;

-- 기존 테이블 정리(드롭 순서 주의)
DROP TABLE IF EXISTS media_reports;
DROP TABLE IF EXISTS media_favorites;
DROP TABLE IF EXISTS media_likes;
DROP TABLE IF EXISTS media_tags;
DROP TABLE IF EXISTS planet_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS planet_media;
DROP TABLE IF EXISTS planets;
DROP TABLE IF EXISTS stars;
DROP TABLE IF EXISTS login_log;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- 1) USERS
-- (기존 users 기반 유지 + createdAt/updatedAt 추가)
-- =========================================================
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  liveIn VARCHAR(100),
  role ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
  status ENUM('ACTIVE','SUSPENDED','BANNED') NOT NULL DEFAULT 'ACTIVE',
  penaltyEndAt DATETIME NULL,
  reportCount BIGINT UNSIGNED NOT NULL DEFAULT 0,  -- (기존 유지: 캐시/집계용. 필요 없으면 제거 가능)
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 2) LOGIN LOG (기존은 user_id VARCHAR였으나 FK 정합성을 위해 userId BIGINT로 통일)
-- =========================================================
CREATE TABLE login_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  userId BIGINT UNSIGNED NOT NULL,
  loginTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logoutTime DATETIME NULL,
  PRIMARY KEY (id),
  INDEX idx_login_user_time (userId, loginTime),
  CONSTRAINT fk_login_user
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 3) STARS
-- =========================================================
CREATE TABLE stars (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  userId BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_stars_user (userId),
  CONSTRAINT fk_stars_user
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 4) PLANETS
-- - 썸네일은 media로 분리: thumbnailMediaId (추후 FK는 ALTER로 연결)
-- =========================================================
CREATE TABLE planets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  starId BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  thumbnailMediaId BIGINT UNSIGNED NULL,  -- 대표 썸네일/대표 미디어 포인터
  sortOrder INT NOT NULL DEFAULT 0,
  isDeleted TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deletedAt DATETIME NULL,
  PRIMARY KEY (id),
  INDEX idx_planets_star (starId, isDeleted, sortOrder, id),
  CONSTRAINT fk_planets_star
    FOREIGN KEY (starId) REFERENCES stars(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 5) PLANET_MEDIA
-- - 기존 filePath 중심 → url 중심 (서버 접근 URL)
-- - description 추가(프론트 MediaEditPopup 대응)
-- - type은 image/video로 통일(프론트와 동일)
-- =========================================================
CREATE TABLE planet_media (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  planetId BIGINT UNSIGNED NOT NULL,
  type ENUM('image','video') NOT NULL,
  url VARCHAR(1024) NOT NULL,              -- 접근 URL (예: /uploads/... 또는 CDN URL)
  originalName VARCHAR(255) NULL,
  mimeType VARCHAR(100) NULL,
  sizeBytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  description TEXT NULL,
  locationName VARCHAR(255) NULL,
  latitude DOUBLE NULL,
  longitude DOUBLE NULL,
  isDeleted TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deletedAt DATETIME NULL,
  PRIMARY KEY (id),
  INDEX idx_media_planet (planetId, isDeleted, createdAt),
  CONSTRAINT fk_media_planet
    FOREIGN KEY (planetId) REFERENCES planets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- planets.thumbnailMediaId ↔ planet_media.id FK는 순환참조 방지를 위해 ALTER로 연결
ALTER TABLE planets
  ADD CONSTRAINT fk_planets_thumbnail_media
  FOREIGN KEY (thumbnailMediaId) REFERENCES planet_media(id)
  ON DELETE SET NULL;

-- =========================================================
-- 6) TAGS (전역 사전)
-- =========================================================
CREATE TABLE tags (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 7) PLANET_TAGS (행성 단위 태그)
-- =========================================================
CREATE TABLE planet_tags (
  planetId BIGINT UNSIGNED NOT NULL,
  tagId BIGINT UNSIGNED NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (planetId, tagId),
  INDEX idx_planet_tags_tag (tagId),
  CONSTRAINT fk_planet_tags_planet
    FOREIGN KEY (planetId) REFERENCES planets(id) ON DELETE CASCADE,
  CONSTRAINT fk_planet_tags_tag
    FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 8) MEDIA_TAGS (미디어 단위 태그: 프론트 tags 편집 기능 대응)
-- =========================================================
CREATE TABLE media_tags (
  mediaId BIGINT UNSIGNED NOT NULL,
  tagId BIGINT UNSIGNED NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (mediaId, tagId),
  INDEX idx_media_tags_tag (tagId),
  CONSTRAINT fk_media_tags_media
    FOREIGN KEY (mediaId) REFERENCES planet_media(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_tags_tag
    FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 9) MEDIA_LIKES (유저별 좋아요)
-- =========================================================
CREATE TABLE media_likes (
  mediaId BIGINT UNSIGNED NOT NULL,
  userId BIGINT UNSIGNED NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (mediaId, userId),
  INDEX idx_media_likes_user_time (userId, createdAt),
  CONSTRAINT fk_media_likes_media
    FOREIGN KEY (mediaId) REFERENCES planet_media(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_likes_user
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 10) MEDIA_FAVORITES (유저별 즐겨찾기/별)
-- =========================================================
CREATE TABLE media_favorites (
  mediaId BIGINT UNSIGNED NOT NULL,
  userId BIGINT UNSIGNED NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (mediaId, userId),
  INDEX idx_media_fav_user_time (userId, createdAt),
  CONSTRAINT fk_media_fav_media
    FOREIGN KEY (mediaId) REFERENCES planet_media(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_fav_user
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- 11) MEDIA_REPORTS (유저별 신고 + 상태)
-- - "미디어당 1회" 정책: UNIQUE(mediaId, reporterUserId)
-- =========================================================
CREATE TABLE media_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  mediaId BIGINT UNSIGNED NOT NULL,
  reporterUserId BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(255) NOT NULL,
  status ENUM('new','processed') NOT NULL DEFAULT 'new',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processedAt DATETIME NULL,
  processedByUserId BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_media_report_once (mediaId, reporterUserId),
  INDEX idx_reports_status_time (status, createdAt),
  INDEX idx_reports_media (mediaId),
  CONSTRAINT fk_reports_media
    FOREIGN KEY (mediaId) REFERENCES planet_media(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_reporter
    FOREIGN KEY (reporterUserId) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_processed_by
    FOREIGN KEY (processedByUserId) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
