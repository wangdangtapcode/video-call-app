-- Database: video-call

-- DROP DATABASE IF EXISTS "video-call";

CREATE DATABASE "video-call"
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'English_United States.949'
    LC_CTYPE = 'English_United States.949'
    LOCALE_PROVIDER = 'libc'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

INSERT INTO roles (name, permissions)
VALUES
('ADMIN', 'USER_MANAGE,AGENT_MANAGE,CALL_MANAGE,REPORT_VIEW'),
('AGENT', 'CALL_HANDLE,PROFILE_VIEW'),
('USER', 'CALL_START,PROFILE_VIEW');

INSERT INTO users (email, password, full_name, status, role_id)
VALUES
('admin@example.com', '123456', 'System Admin', 'active', 1),
('agent1@example.com', '123456', 'Agent One', 'active', 2),
('agent2@example.com', '123456', 'Agent Two', 'active', 2),
('user1@example.com', '123456', 'User One', 'active', 3),
('user2@example.com', '123456', 'User Two', 'active', 3);

INSERT INTO agents (status, rating, total_calls, total_call_time, user_id)
VALUES
('offline', 0.00, 0, 0, 2),
('offline', 0.00, 0, 0, 3);






