/* =====================================================
   DB User 생성
   ===================================================== */

CREATE USER 'memory_user'@'localhost'
IDENTIFIED BY '1234';

/* =====================================================
   권한 부여
   ===================================================== */

GRANT ALL PRIVILEGES
ON memoryspace.*
TO 'memory_user'@'localhost';

FLUSH PRIVILEGES;

/* =====================================================
   JDBC 호환을 위한 인증 방식 변경
   ===================================================== */

ALTER USER 'memory_user'@'localhost'
IDENTIFIED WITH mysql_native_password
BY '1234';

FLUSH PRIVILEGES;

/* =====================================================
   계정 확인
   ===================================================== */
SELECT user, host
FROM mysql.user
WHERE user = 'memory_user';
