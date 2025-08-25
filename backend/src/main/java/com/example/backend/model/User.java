package com.example.backend.model;

import com.example.backend.enums.UserStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import software.amazon.awssdk.annotations.NotNull;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @JsonIgnore
    @Column( length = 255)
    private String password;

    @Column(name = "full_name", length = 200)
    private String fullName;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private UserStatus status = UserStatus.OFFLINE;

    @Column(nullable = false)
    private boolean isActive = true;

    @Column(nullable = false)
    private String role= "USER";


    @Column(name = "google_id")
    private String googleId;

    @NotNull
    @Column(name = "provider")
    private String provider;

    @Column(name = "avatar_url")
    private String avatarUrl;

    public User(String email, String fullName, String googleId, String provider, String avatarUrl) {
        this.email = email;
        this.fullName = fullName;
        this.googleId = googleId;
        this.provider = provider;
        this.avatarUrl = avatarUrl;
        this.role = "USER";
        this.isActive = true;
        this.status = UserStatus.OFFLINE;
    }
}