package com.example.backend.dto.response;

import com.example.backend.model.Agent;
import com.example.backend.model.User;
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
    private Agent agent;
}
