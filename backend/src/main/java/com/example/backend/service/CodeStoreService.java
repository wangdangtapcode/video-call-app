package com.example.backend.service;

import com.example.backend.model.User;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CodeStoreService {

    private final Map<String, User> store = new ConcurrentHashMap<>();

    public String generateCode(User user) {
        String code = UUID.randomUUID().toString();
        store.put(code, user);
        return code;
    }

    public User consumeCode(String code) {
        return store.remove(code);
    }
}