package com.memoryspace.user;

public final class ApiMessages {

    private ApiMessages() {}

    // Common
    public static final String LOGIN_REQUIRED = "Login is required.";
    public static final String SERVER_ERROR = "Server error occurred.";
    public static final String BAD_REQUEST = "Invalid request.";

    // Auth / Login
    public static final String INVALID_CREDENTIALS = "Invalid username or password.";
    public static final String ACCOUNT_SUSPENDED = "This account has been suspended.";
    public static final String ACCOUNT_BANNED = "This account has been permanently banned.";

    // User
    public static final String USER_NOT_FOUND = "User not found.";
    public static final String PROFILE_UPDATED = "Profile updated successfully.";
    public static final String PROFILE_UPDATE_FAILED = "Failed to update profile.";
    public static final String PASSWORD_REQUIRED = "Please enter your password.";
    public static final String PASSWORD_MISMATCH = "Password does not match.";
    public static final String PASSWORD_VERIFIED = "Password verified.";
    public static final String NEW_PASSWORD_REQUIRED = "Please enter a new password.";
    public static final String PASSWORD_TOO_SHORT = "Password must be at least 4 characters.";
    public static final String PASSWORD_CHANGED = "Password changed successfully.";
    public static final String PASSWORD_CHANGE_FAILED = "Failed to change password.";
    public static final String ACCOUNT_DELETED = "Account deletion completed.";
    public static final String ACCOUNT_DELETE_FAILED = "Failed to delete account.";
}
