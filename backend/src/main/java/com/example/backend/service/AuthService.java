package com.example.backend.service;

import com.example.backend.exception.AuthenticationException;
import com.example.backend.exception.ValidationException;
import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AuthService {

    @Autowired
    UserRepository userRepository;

    public User login(String email, String password) {
        // Validate input
        if (!StringUtils.hasText(email)) {
            throw ValidationException.emailRequired();
        }
        if (!StringUtils.hasText(password)) {
            throw ValidationException.passwordRequired();
        }

        // Find user
        return userRepository.findByEmailAndPassword(email, password)
                .orElseThrow(AuthenticationException::invalidCredentials);
    }

}
