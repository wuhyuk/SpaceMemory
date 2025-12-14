package com.memoryspace.media;

import jakarta.servlet.http.Part;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.Locale;
import java.util.UUID;

public class MediaUpload {

    private static final String UPLOAD_DIR = UploadConfig.UPLOAD_DIR;
    private static final String PUBLIC_PREFIX = UploadConfig.PUBLIC_PREFIX;

    public StoredUpload store(Part part) throws IOException {
        Files.createDirectories(Paths.get(UPLOAD_DIR));

        String original = MediaRequest.safeFileName(part.getSubmittedFileName());
        String mime = part.getContentType();
        long size = part.getSize();

        boolean isVideo = mime != null && mime.toLowerCase(Locale.ROOT).startsWith("video/");
        boolean isImage = mime != null && mime.toLowerCase(Locale.ROOT).startsWith("image/");
        if (!isImage && !isVideo) {
            throw new IOException("Unsupported file type: " + mime);
        }

        String ext = MediaRequest.extensionOf(original);
        String savedName = UUID.randomUUID().toString().replace("-", "") + (ext.isEmpty() ? "" : "." + ext);

        Path dest = Paths.get(UPLOAD_DIR, savedName);
        try (InputStream in = part.getInputStream()) {
            Files.copy(in, dest, StandardCopyOption.REPLACE_EXISTING);
        }

        StoredUpload out = new StoredUpload();
        out.savedName = savedName;
        out.publicUrl = PUBLIC_PREFIX + savedName;
        out.originalName = original;
        out.mimeType = mime;
        out.sizeBytes = size;
        out.type = isVideo ? "video" : "image";
        return out;
    }
}
