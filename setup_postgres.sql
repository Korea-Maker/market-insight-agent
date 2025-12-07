-- PostgreSQL 데이터베이스 및 사용자 설정 스크립트
-- psql로 postgres 사용자로 접속한 후 실행하세요
-- 
-- 실행 방법:
-- 1. SQL Shell (psql) 실행
-- 2. postgres 데이터베이스에 postgres 사용자로 접속
-- 3. 이 파일 실행: \i 'C:/경로/setup_postgres.sql'
-- 또는 각 명령을 하나씩 복사해서 실행

-- 기존 연결 종료 (있다면)
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'quantboard' AND pid <> pg_backend_pid();

-- 기존 데이터베이스 삭제 (재설정 시)
-- DROP DATABASE IF EXISTS quantboard;

-- 기존 사용자 삭제 (재설정 시)
-- DROP USER IF EXISTS quantboard;

-- 사용자 생성
CREATE USER quantboard WITH PASSWORD 'quantboard_dev';

-- 데이터베이스 생성
CREATE DATABASE quantboard 
    OWNER quantboard
    ENCODING 'UTF8'
    LC_COLLATE = 'Korean_Korea.949'
    LC_CTYPE = 'Korean_Korea.949'
    TEMPLATE template0;

-- 권한 부여
GRANT ALL PRIVILEGES ON DATABASE quantboard TO quantboard;

-- 연결 및 확인
\c quantboard

-- quantboard 사용자에게 스키마 권한 부여
GRANT ALL ON SCHEMA public TO quantboard;

-- 확인
\l
\du

-- 성공 메시지
\echo '=========================================='
\echo '✅ PostgreSQL 설정 완료!'
\echo '=========================================='
\echo ''
\echo '데이터베이스: quantboard'
\echo '사용자: quantboard'
\echo '비밀번호: quantboard_dev'
\echo ''
\echo '다음 단계:'
\echo '1. .env 파일 설정'
\echo '2. python test_db_connection.py 실행'
\echo '3. python main.py 실행'
\echo ''
\echo '=========================================='
