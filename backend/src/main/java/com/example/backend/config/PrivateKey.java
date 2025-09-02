package com.example.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PrivateKey {
    @Value("${AWS_ACCESS_KEY}")
    private String assetKey;

    @Value("${AWS_SECRET_KEY}")
    private String secretKey;

    @Value("${GOOGLE_CLIENT_ID}")
    private String googleClientId;

    @Value("${GOOGLE_CLIENT_SECRET}")
    private String googleClientSecret;

    @Value("${GOOGLE_REDIRECT_URI:http://localhost:8081/login/oauth2/code/google}")
    private String googleRedirectUri;

    public String getAssetKey() {
        return assetKey;
    }

    public String getSecretKey() {
        return secretKey;
    }

    public String getGoogleClientId() {
        return googleClientId;
    }

    public String getGoogleClientSecret() {
        return googleClientSecret;
    }

    public String getGoogleRedirectUri() {
        return googleRedirectUri;
    }
}