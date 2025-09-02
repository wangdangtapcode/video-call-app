package com.example.backend.config;

public class PrivateKey {
    public static final String assetKey = System.getenv("AWS_ACCESS_KEY");
    public static final String secretKey = System.getenv("AWS_SECRET_KEY");
    public static final String googleClientId=System.getenv("GOOGLE_CLIENT_ID");
    public static final String googleClientSecret = System.getenv("GOOGLE_CLIENT_SECRET");
    public static final String googleRedirectUri = "http://localhost:8081/login/oauth2/code/google";
}