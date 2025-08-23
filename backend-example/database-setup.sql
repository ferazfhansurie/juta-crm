-- Database setup for Juta CRM Backend
-- Run this script in your Neon PostgreSQL database

-- Create password_resets table for forgot password functionality
CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);

-- Create users table if it doesn't exist (basic structure)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  company_id VARCHAR(50),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- Create companies table if it doesn't exist (basic structure)
CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  api_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create assistant_files table for file management
CREATE TABLE IF NOT EXISTS assistant_files (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  vector_store_id VARCHAR(255),
  openai_file_id VARCHAR(255),
  company_id VARCHAR(50) NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for assistant_files table
CREATE INDEX IF NOT EXISTS idx_assistant_files_company_id ON assistant_files(company_id);
CREATE INDEX IF NOT EXISTS idx_assistant_files_created_by ON assistant_files(created_by);

-- Add comments for documentation
COMMENT ON TABLE password_resets IS 'Stores password reset tokens for forgot password functionality';
COMMENT ON TABLE users IS 'Stores user authentication and profile information';
COMMENT ON TABLE companies IS 'Stores company information and configuration';
COMMENT ON TABLE assistant_files IS 'Stores metadata for AI assistant files';

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_user;
