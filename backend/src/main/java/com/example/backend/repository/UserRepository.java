package com.example.backend.repository;

import com.example.backend.enums.UserStatus;
import com.example.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailAndPasswordAndIsActive(String email, String password, boolean isActive);

    Optional<User> findByEmail(String email);

    Boolean existsByEmail(String email);

//    List<User> findAllByActive(Boolean isActive);

    List<User> findByFullNameContainingIgnoreCase(String fullName);

    Long countByRoleAndStatus(String role, UserStatus status);

    List<User> findByRole(String role);

    Optional<User> findByIdAndRole(Long id, String role);
}
