package com.memoryspace.media;

import java.io.File;

public final class UploadConfig {
    private UploadConfig() {}

    public static final String UPLOAD_DIR =
            System.getProperty("user.home") + File.separator + "memoryspace_uploads";

    public static final String PUBLIC_PREFIX = "/uploads/";
}
