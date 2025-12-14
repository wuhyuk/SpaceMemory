/* =====================================================
   계정 삭제
   ===================================================== */
DROP USER 'memory_user'@'localhost';
FLUSH PRIVILEGES;

/* =====================================================
   권한만 회수
   ===================================================== */
REVOKE ALL PRIVILEGES, GRANT OPTION
FROM 'memory_user'@'localhost';

FLUSH PRIVILEGES;
