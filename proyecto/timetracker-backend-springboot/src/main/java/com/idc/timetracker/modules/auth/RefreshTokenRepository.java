package com.idc.timetracker.modules.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Query("SELECT rt FROM RefreshToken rt WHERE rt.tokenHash = :hash AND rt.revocado = false AND rt.expiraEn > :now")
    Optional<RefreshToken> findValidByTokenHash(@Param("hash") String hash, @Param("now") Instant now);

    default Optional<RefreshToken> findValid(String tokenHash) {
        return findValidByTokenHash(tokenHash, Instant.now());
    }

    @Query("SELECT rt FROM RefreshToken rt WHERE rt.tokenHash = :hash")
    Optional<RefreshToken> buscarPorHash(@Param("hash") String hash);

    boolean existsByTokenHash(String tokenHash);
}
