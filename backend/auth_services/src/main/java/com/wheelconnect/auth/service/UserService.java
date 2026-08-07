package com.wheelconnect.auth.service;

import com.wheelconnect.auth.entity.User;

import java.util.List;
import java.util.Optional;

public interface UserService {

    User registerUser(User user);

    Optional<User> loginUser(String email, String password);

    boolean emailExists(String email);

    List<User> getAllUsers();

    Optional<User> getUserById(Long id);

    Optional<User> getUserByEmail(String email);

    User updateUser(User user);

    boolean deleteUser(Long id);

    List<User> getUsersByRole(String role);

    List<User> getMechanicsByServiceCenterId(Long serviceCenterId);
}
