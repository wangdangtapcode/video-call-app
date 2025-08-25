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


INSERT INTO users (email, password, full_name, status, role,is_active,provider)
VALUES
('admin@example.com', '123456', 'System Admin', 'OFFLINE', 'ADMIN',true,'LOCAL'),
('agent1@example.com', '123456', 'Agent One', 'OFFLINE', 'AGENT',true,'LOCAL'),
('agent2@example.com', '123456', 'Agent Two', 'OFFLINE', 'AGENT',true,'LOCAL'),
('user1@example.com', '123456', 'User One', 'OFFLINE', 'USER',true,'LOCAL'),
('user2@example.com', '123456', 'User Two', 'OFFLINE', 'USER',true,'LOCAL');

INSERT INTO user_metrics ( rating, total_calls, total_call_time, user_id)
VALUES
( 0.00, 0, 0, 2),
( 0.00, 0, 0, 3);






