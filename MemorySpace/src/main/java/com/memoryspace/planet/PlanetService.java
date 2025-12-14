package com.memoryspace.planet;

import com.memoryspace.db.DBConnectionUtil;

import jakarta.servlet.http.*;

import java.io.IOException;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;

public class PlanetService {

    private static final int MAX_PLANETS_PER_STAR = 7;

    private final PlanetDao dao = new PlanetDao();
    private final PlanetUpload upload = new PlanetUpload();

    public void handleList(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = PlanetRequest.getSessionUserId(req);
        if (userId == null) {
            PlanetJson.sendJson(resp, 401, PlanetJson.jsonFail("Unauthorized"));
            return;
        }

        long starId = PlanetRequest.parseLong(req.getParameter("starId"), -1);
        if (starId <= 0) {
            PlanetJson.sendJson(resp, 400, PlanetJson.jsonFail("starId is required"));
            return;
        }

        Connection con = null;
        try {
            con = DBConnectionUtil.getConnection();

            if (!dao.isStarOwner(con, starId, userId.longValue())) {
                PlanetJson.sendJson(resp, 403, PlanetJson.jsonFail("Forbidden"));
                return;
            }

            List<PlanetDto> list = dao.listPlanets(con, starId);

            List<String> items = new ArrayList<>();
            for (PlanetDto p : list) {
                items.add(PlanetJson.planetToJson(p));
            }

            String json = "{\"success\":true,\"planets\":[" + String.join(",", items) + "]}";
            PlanetJson.sendJson(resp, 200, json);

        } catch (Exception e) {
            PlanetJson.sendJson(resp, 500, PlanetJson.jsonFail("Server Error"));
        } finally {
        	PlanetJson.closeQuietly(con);
        }
    }

    public void handleCreate(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = PlanetRequest.getSessionUserId(req);
        if (userId == null) {
            PlanetJson.sendJson(resp, 401, PlanetJson.jsonFail("Unauthorized"));
            return;
        }

        long starId = PlanetRequest.parseLong(req.getParameter("starId"), -1);
        String name = req.getParameter("name");

        if (starId <= 0 || name == null || name.trim().isEmpty()) {
            PlanetJson.sendJson(resp, 400, PlanetJson.jsonFail("starId and name are required"));
            return;
        }

        Connection con = null;
        try {
            con = DBConnectionUtil.getConnection();
            con.setAutoCommit(false);

            if (!dao.isStarOwner(con, starId, userId.longValue())) {
                con.rollback();
                PlanetJson.sendJson(resp, 403, PlanetJson.jsonFail("Forbidden"));
                return;
            }

            int count = dao.countPlanetsByStar(con, starId);
            if (count >= MAX_PLANETS_PER_STAR) {
                con.rollback();
                PlanetJson.sendJson(resp, 400, PlanetJson.jsonFail("Max 7 planets per star"));
                return;
            }

            long planetId = dao.insertPlanet(con, starId, name.trim());

            con.commit();
            String json = "{\"success\":true,\"data\":{\"planetId\":" + planetId + "}}";
            PlanetJson.sendJson(resp, 200, json);

        } catch (Exception e) {
            if (con != null) {
                try { con.rollback(); } catch (Exception ignored) {}
            }
            PlanetJson.sendJson(resp, 500, PlanetJson.jsonFail("Server Error"));
        } finally {
            if (con != null) {
                try { con.setAutoCommit(true); } catch (Exception ignored) {}
            }
            PlanetJson.closeQuietly(con);
        }
    }

    public void handleDelete(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = PlanetRequest.getSessionUserId(req);
        if (userId == null) {
            PlanetJson.sendJson(resp, 401, PlanetJson.jsonFail("Unauthorized"));
            return;
        }

        long starId = PlanetRequest.parseLong(req.getParameter("starId"), -1);
        long planetId = PlanetRequest.parseLong(req.getParameter("planetId"), -1);

        if (starId <= 0 || planetId <= 0) {
            PlanetJson.sendJson(resp, 400, PlanetJson.jsonFail("starId and planetId are required"));
            return;
        }

        Connection con = null;
        try {
            con = DBConnectionUtil.getConnection();
            con.setAutoCommit(false);

            if (!dao.isStarOwner(con, starId, userId.longValue())) {
                con.rollback();
                PlanetJson.sendJson(resp, 403, PlanetJson.jsonFail("Forbidden"));
                return;
            }

            int updated = dao.softDeletePlanet(con, planetId, starId);
            if (updated == 0) {
                con.rollback();
                PlanetJson.sendJson(resp, 404, PlanetJson.jsonFail("Planet not found"));
                return;
            }

            con.commit();
            PlanetJson.sendJson(resp, 200, "{\"success\":true,\"data\":{}}");

        } catch (Exception e) {
            if (con != null) {
                try { con.rollback(); } catch (Exception ignored) {}
            }
            PlanetJson.sendJson(resp, 500, PlanetJson.jsonFail("Server Error"));
        } finally {
            if (con != null) {
                try { con.setAutoCommit(true); } catch (Exception ignored) {}
            }
            PlanetJson.closeQuietly(con);
        }
    }

    public void handleUpdate(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Long userId = PlanetRequest.getSessionUserId(req);
        if (userId == null) {
            PlanetJson.sendJson(resp, 401, PlanetJson.jsonFail("Unauthorized"));
            return;
        }

        long starId = PlanetRequest.parseLong(req.getParameter("starId"), -1);
        long planetId = PlanetRequest.parseLong(req.getParameter("planetId"), -1);
        String name = req.getParameter("name");

        if (starId <= 0 || planetId <= 0 || name == null || name.trim().isEmpty()) {
            PlanetJson.sendJson(resp, 400, PlanetJson.jsonFail("starId, planetId and name are required"));
            return;
        }

        Part thumbPart = PlanetRequest.part(req, "thumbnail"); // optional

        Connection con = null;
        try {
            con = DBConnectionUtil.getConnection();
            con.setAutoCommit(false);

            if (!dao.isStarOwner(con, starId, userId.longValue())) {
                con.rollback();
                PlanetJson.sendJson(resp, 403, PlanetJson.jsonFail("Forbidden"));
                return;
            }

            if (!dao.planetBelongsToStar(con, planetId, starId)) {
                con.rollback();
                PlanetJson.sendJson(resp, 404, PlanetJson.jsonFail("Planet not found"));
                return;
            }

            String thumbUrl = null;
            String thumbType = null;

            if (thumbPart != null && thumbPart.getSize() > 0) {
                StoredFile stored = upload.storeUpload(thumbPart);
                thumbUrl = stored.publicUrl;
                thumbType = stored.isVideo ? "video" : "image";

                // ✅ 대표사진 변경: 기존 thumbnailMediaId가 있으면 INSERT 없이 UPDATE로 교체
                Long existingThumbId = dao.getThumbnailMediaId(con, planetId, starId);
                if (existingThumbId != null && existingThumbId > 0) {
                    dao.updateMediaFile(con, existingThumbId, stored);
                    dao.updatePlanetNameAndThumbnail(con, name.trim(), existingThumbId, planetId, starId);
                } else {
                    long mediaId = dao.insertMedia(con, planetId, stored);
                    dao.updatePlanetNameAndThumbnail(con, name.trim(), mediaId, planetId, starId);
                }
            } else {
                dao.updatePlanetName(con, name.trim(), planetId, starId);
            }

            con.commit();

            String json = "{\"success\":true,\"data\":{"
                    + "\"thumbnailUrl\":" + (thumbUrl == null ? "null" : PlanetJson.jstr(thumbUrl))
                    + ",\"thumbnailType\":" + (thumbType == null ? "null" : PlanetJson.jstr(thumbType))
                    + "}}";
            PlanetJson.sendJson(resp, 200, json);

        } catch (Exception e) {
            if (con != null) {
                try { con.rollback(); } catch (Exception ignored) {}
            }
            PlanetJson.sendJson(resp, 500, PlanetJson.jsonFail("Server Error"));
        } finally {
            if (con != null) {
                try { con.setAutoCommit(true); } catch (Exception ignored) {}
            }
            PlanetJson.closeQuietly(con);
        }
    }
}
