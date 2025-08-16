package com.example.backend.dto.response;

import com.example.backend.model.User;
import com.example.backend.model.UserMetric;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private User user;
    private UserMetric userMetric;
    private String token;

    // Constructor for backward compatibility
    public LoginResponse(User user, UserMetric userMetric) {
        this.user = user;
        this.userMetric = userMetric;
    }
}
