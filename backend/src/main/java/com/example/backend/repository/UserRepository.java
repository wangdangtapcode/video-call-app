package com.example.backend.repository;

import com.example.backend.enums.UserStatus;
import com.example.backend.enums.UserStatus;
import com.example.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailAndPasswordAndIsActive(String email, String password, boolean isActive);
    Optional<User> findByEmailAndIsActive(String email, boolean isActive);
    Optional<User> findByEmail(String email);
    Optional<User> findByGoogleId(String googleId);
    Boolean existsByEmail(String email);
    long countByRoleAndStatus(String role, UserStatus status);
    List<User> findAllByStatus(String status);

    List<User> findByFullNameContainingIgnoreCase(String fullName);


    List<User> findByRole(String role);

    Optional<User> findByIdAndRole(Long id, String role);
}
