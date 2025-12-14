package com.memoryspace.media;

import com.memoryspace.db.DBConnectionUtil;

import jakarta.servlet.http.*;

import java.io.IOException;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public class MediaService {

    private final MediaDao dao = new MediaDao();
    private final MediaUpload upload = new MediaUpload();

    public void handleList(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = MediaRequest.getSessionUserId(req);
        if (userId == null) {
            MediaJson.sendJson(resp, 401, MediaJson.fail("Unauthorized"));
            return;
        }

        long planetId = MediaRequest.parseLong(req.getParameter("planetId"), -1);
        if (planetId <= 0) {
            MediaJson.sendJson(resp, 400, MediaJson.fail("planetId is required"));
            return;
        }

        Connection con = null;
        try {
            con = DBConnectionUtil.getConnection();

            if (!dao.isPlanetOwner(con, planetId, userId.longValue())) {
                MediaJson.sendJson(resp, 403, MediaJson.fail("Forbidden"));
                return;
            }

            List<MediaDto> list = dao.listMedia(con, planetId, userId.longValue());

            List<String> items = new ArrayList<String>();
            for (int i = 0; i < list.size(); i++) {
                items.add(MediaJson.mediaToJson(list.get(i)));
            }

            MediaJson.sendJson(resp, 200, "{\"success\":true,\"media\":[" + MediaJson.join(items) + "]}");

        } catch (Exception e) {
            MediaJson.sendJson(resp, 500, MediaJson.fail("Server Error"));
        } finally {
            MediaJson.closeQuietly(con);
        }
    }

    public void handleAdd(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = MediaRequest.getSessionUserId(req);
        if (userId == null) {
            MediaJson.sendJson(resp, 401, MediaJson.fail("Unauthorized"));
            return;
        }

        long planetId = MediaRequest.parseLong(req.getParameter("planetId"), -1);
        if (planetId <= 0) {
            MediaJson.sendJson(resp, 400, MediaJson.fail("planetId is required"));
            return;
        }

        // ✅ [PATCH] "files" 멀티파트를 표준 req.getParts()로 직접 수집 (단일 저장 문제 방지)
        List<Part> files = new ArrayList<Part>();
        try {
            Collection<Part> parts = req.getParts();
            if (parts != null) {
                for (Part p : parts) {
                    if (p == null) continue;
                    if (!"files".equals(p.getName())) continue;
                    if (p.getSize() <= 0) continue;
                    files.add(p);
                }
            }
        } catch (Exception ignore) {
            // getParts 실패 시 아래 fallback로 처리
        }

        // fallback: 기존 단일 키(file) 지원
        if (files.isEmpty()) {
            Part single = MediaRequest.part(req, "file");
            if (single != null && single.getSize() > 0) files.add(single);
        }

        if (files.isEmpty()) {
            MediaJson.sendJson(resp, 400, MediaJson.fail("files are required"));
            return;
        }

        Connection con = null;
        try {
            con = DBConnectionUtil.getConnection();
            con.setAutoCommit(false);

            if (!dao.isPlanetOwner(con, planetId, userId.longValue())) {
                con.rollback();
                MediaJson.sendJson(resp, 403, MediaJson.fail("Forbidden"));
                return;
            }

            // ✅ [PATCH] 프론트가 description0/location0/tags0 ... 형태로 보낼 수 있으므로 인덱스별로 읽기
            // (기존 단일 description/location/tags도 fallback으로 유지)

            List<String> createdJson = new ArrayList<String>();

            for (int i = 0; i < files.size(); i++) {
                Part part = files.get(i);
                if (part == null || part.getSize() <= 0) continue;

                String description = paramIndexed(req, "description", i);
                String locationName = paramIndexed(req, "location", i);
                String tagsCsv = paramIndexed(req, "tags", i);

                List<String> tagNames = MediaRequest.parseTags(tagsCsv);

                StoredUpload stored = upload.store(part);
                long mediaId = dao.insertMedia(con, planetId, stored, description, locationName);

                if (!tagNames.isEmpty()) {
                    dao.replaceMediaTags(con, mediaId, tagNames);
                }

                MediaDto dto = dao.getMediaOne(con, mediaId, userId.longValue());
                if (dto != null) {
                    createdJson.add(MediaJson.mediaToJson(dto));
                }
            }

            con.commit();
            MediaJson.sendJson(resp, 201, "{\"success\":true,\"media\":[" + MediaJson.join(createdJson) + "]}");

        } catch (Exception e) {
            if (con != null) {
                try { con.rollback(); } catch (Exception ignored) {}
            }
            MediaJson.sendJson(resp, 500, MediaJson.fail("Server Error"));
        } finally {
            if (con != null) {
                try { con.setAutoCommit(true); } catch (Exception ignored) {}
            }
            MediaJson.closeQuietly(con);
        }
    }

    public void handleUpdateMeta(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = MediaRequest.getSessionUserId(req);
        if (userId == null) {
            MediaJson.sendJson(resp, 401, MediaJson.fail("Unauthorized"));
            return;
        }

        long planetId = MediaRequest.parseLong(req.getParameter("planetId"), -1);
        long mediaId  = MediaRequest.parseLong(req.getParameter("mediaId"), -1);
        if (planetId <= 0 || mediaId <= 0) {
            MediaJson.sendJson(resp, 400, MediaJson.fail("planetId and mediaId are required"));
            return;
        }

        // meta
        String description = req.getParameter("description"); // nullable
        String locationName = req.getParameter("location");   // nullable
        String tagsCsv = req.getParameter("tags");            // nullable

        Connection con = null;
        try {
            con = DBConnectionUtil.getConnection();
            con.setAutoCommit(false);

            if (!dao.isPlanetOwner(con, planetId, userId.longValue())) {
                con.rollback();
                MediaJson.sendJson(resp, 403, MediaJson.fail("Forbidden"));
                return;
            }

            if (!dao.mediaBelongsToPlanet(con, mediaId, planetId)) {
                con.rollback();
                MediaJson.sendJson(resp, 404, MediaJson.fail("Media not found"));
                return;
            }

            MediaMetaDto meta = new MediaMetaDto();
            meta.description = description;     // null 가능
            meta.locationName = locationName;   // null 가능

            dao.updateMediaMeta(con, mediaId, planetId, meta);

            if (tagsCsv != null) {
                List<String> tagNames = MediaRequest.parseTags(tagsCsv);
                dao.replaceMediaTags(con, mediaId, tagNames);
            }

            con.commit();
            MediaJson.sendJson(resp, 200, "{\"success\":true,\"data\":{}}");

        } catch (Exception e) {
            if (con != null) {
                try { con.rollback(); } catch (Exception ignored) {}
            }
            MediaJson.sendJson(resp, 500, MediaJson.fail("Server Error"));
        } finally {
            if (con != null) {
                try { con.setAutoCommit(true); } catch (Exception ignored) {}
            }
            MediaJson.closeQuietly(con);
        }
    }

    public void handleDelete(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = MediaRequest.getSessionUserId(req);
        if (userId == null) {
            MediaJson.sendJson(resp, 401, MediaJson.fail("Unauthorized"));
            return;
        }

        long planetId = MediaRequest.parseLong(req.getParameter("planetId"), -1);
        long mediaId  = MediaRequest.parseLong(req.getParameter("mediaId"), -1);
        if (planetId <= 0 || mediaId <= 0) {
            MediaJson.sendJson(resp, 400, MediaJson.fail("planetId and mediaId are required"));
            return;
        }

        Connection con = null;
        try {
            con = DBConnectionUtil.getConnection();
            con.setAutoCommit(false);

            if (!dao.isPlanetOwner(con, planetId, userId.longValue())) {
                con.rollback();
                MediaJson.sendJson(resp, 403, MediaJson.fail("Forbidden"));
                return;
            }

            if (!dao.mediaBelongsToPlanet(con, mediaId, planetId)) {
                con.rollback();
                MediaJson.sendJson(resp, 404, MediaJson.fail("Media not found"));
                return;
            }

            // ✅ 썸네일로 쓰이던 미디어를 soft-delete 하는 경우: thumbnailMediaId를 null 처리(권장)
            dao.clearThumbnailIfMatches(con, planetId, mediaId);

            int updated = dao.softDeleteMedia(con, mediaId, planetId);
            if (updated != 1) {
                con.rollback();
                MediaJson.sendJson(resp, 404, MediaJson.fail("Media not found"));
                return;
            }

            con.commit();
            MediaJson.sendJson(resp, 200, "{\"success\":true,\"data\":{}}");

        } catch (Exception e) {
            if (con != null) {
                try { con.rollback(); } catch (Exception ignored) {}
            }
            MediaJson.sendJson(resp, 500, MediaJson.fail("Server Error"));
        } finally {
            if (con != null) {
                try { con.setAutoCommit(true); } catch (Exception ignored) {}
            }
            MediaJson.closeQuietly(con);
        }
    }

    // ✅ [PATCH] 인덱스 파라미터 우선(description0 등) -> 없으면 기본(description) fallback
    private static String paramIndexed(HttpServletRequest req, String base, int idx) {
        String v = req.getParameter(base + idx);
        if (v != null) return v;
        return req.getParameter(base);
    }
}
