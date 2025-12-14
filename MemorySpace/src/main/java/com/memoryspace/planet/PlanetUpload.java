package com.memoryspace.planet;

import jakarta.servlet.http.Part;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.Locale;
import java.util.UUID;

public class PlanetUpload {

    private static final String UPLOAD_DIR =
            System.getProperty("user.home") + File.separator + "memoryspace_uploads";
    private static final String PUBLIC_PREFIX = "/uploads/";

    public StoredFile storeUpload(Part part) throws IOException {
        Files.createDirectories(Paths.get(UPLOAD_DIR));

        String original = safeFileName(part.getSubmittedFileName());
        String mime = part.getContentType();
        long size = part.getSize();

        boolean isVideo = mime != null && mime.toLowerCase(Locale.ROOT).startsWith("video/");
        boolean isImage = mime != null && mime.toLowerCase(Locale.ROOT).startsWith("image/");

        if (!isImage && !isVideo) {
            throw new IOException("Unsupported file type: " + mime);
        }

        String ext = extensionOf(original);
        String savedName = UUID.randomUUID().toString().replace("-", "") + (ext.isEmpty() ? "" : "." + ext);

        Path dest = Paths.get(UPLOAD_DIR, savedName);
        InputStream in = null;
        try {
            in = part.getInputStream();
            Files.copy(in, dest, StandardCopyOption.REPLACE_EXISTING);
        } finally {
            if (in != null) try { in.close(); } catch (Exception ignored) {}
        }

        String publicUrl = PUBLIC_PREFIX + savedName;

        StoredFile out = new StoredFile();
        out.savedName = savedName;
        out.publicUrl = publicUrl;
        out.originalName = original;
        out.mimeType = mime;
        out.sizeBytes = size;
        out.isVideo = isVideo;
        return out;
    }

    private static String safeFileName(String s) {
        if (s == null) return "file";
        s = s.replace("\\", "/");
        int idx = s.lastIndexOf('/');
        if (idx >= 0) s = s.substring(idx + 1);
        return s.replaceAll("[\\r\\n]", "");
    }

    private static String extensionOf(String fileName) {
        if (fileName == null) return "";
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) return "";
        return fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
