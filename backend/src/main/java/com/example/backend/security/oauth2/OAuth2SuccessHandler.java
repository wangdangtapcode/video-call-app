package com.example.backend.security.oauth2;

import com.example.backend.dto.response.LoginResponse;
import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.AuthService;
import com.example.backend.service.CodeStoreService;
import com.example.backend.service.JwtService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;


@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    @Autowired
    private AuthService authService;

    @Autowired
    private CodeStoreService codeStoreService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        try {
            // Lấy thông tin từ Google
            String email = oAuth2User.getAttribute("email");
            String name = oAuth2User.getAttribute("name");
            String googleId = oAuth2User.getAttribute("sub");
            String picture = oAuth2User.getAttribute("picture");

            System.out.println("OAuth2 Authentication Success:");
            System.out.println("- Email: " + email);
            System.out.println("- Name: " + name);
            System.out.println("- Google ID: " + googleId);

            User user = authService.findOrCreateOAuth2User(email, name, googleId, picture);
            System.out.println("User: " + user);
            String code = codeStoreService.generateCode(user);

            String frontendUrl = "http://localhost:5173";

            // Redirect về frontend với token
            String redirectUrl = String.format("%s/login?code=%s", frontendUrl, code);

            System.out.println("OAuth2 process completed successfully!");
            System.out.println("- Redirecting to: " + redirectUrl);

            response.sendRedirect(redirectUrl);

        } catch (Exception e) {
            System.err.println("OAuth2 Authentication Failed: " + e.getMessage());
            e.printStackTrace();

            // Redirect về trang login với error
            String frontendUrl = "http://localhost:5173";
            String errorMessage = URLEncoder.encode("Đăng nhập Google thất bại. Vui lòng thử lại.", StandardCharsets.UTF_8);
            String redirectUrl = String.format("%s/login?error=%s", frontendUrl, errorMessage);
            response.sendRedirect(redirectUrl);
        }
    }
}
