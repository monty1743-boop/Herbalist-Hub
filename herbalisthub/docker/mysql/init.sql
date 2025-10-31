-- Initialize HerbalistHub Database
-- This script runs when the MySQL container starts for the first time

-- Ensure UTF-8 support for international herb names and client data
CREATE DATABASE IF NOT EXISTS herbalisthub_dev 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Create additional user with appropriate permissions
CREATE USER IF NOT EXISTS 'herbalist_dev'@'%' IDENTIFIED BY 'herbalist_dev_password';
GRANT ALL PRIVILEGES ON herbalisthub_dev.* TO 'herbalist_dev'@'%';

-- Create test database for running tests
CREATE DATABASE IF NOT EXISTS herbalisthub_test 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON herbalisthub_test.* TO 'herbalist_dev'@'%';
GRANT ALL PRIVILEGES ON herbalisthub_test.* TO 'herbalist_user'@'%';

-- Flush privileges to ensure changes take effect
FLUSH PRIVILEGES;

-- Insert some helpful information
USE herbalisthub_dev;

-- Create a simple health check table
CREATE TABLE IF NOT EXISTS _health_check (
  id INT AUTO_INCREMENT PRIMARY KEY,
  status VARCHAR(50) NOT NULL DEFAULT 'healthy',
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO _health_check (status) VALUES ('database_initialized');

-- Show character set information
SELECT 
  DEFAULT_CHARACTER_SET_NAME as charset,
  DEFAULT_COLLATION_NAME as collation
FROM INFORMATION_SCHEMA.SCHEMATA 
WHERE SCHEMA_NAME = 'herbalisthub_dev';