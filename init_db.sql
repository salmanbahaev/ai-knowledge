-- Initialize AI Knowledge Database
-- This script runs when PostgreSQL container starts for the first time

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for text search optimizations (future use)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create database if it doesn't exist (usually handled by POSTGRES_DB)
-- SELECT 'CREATE DATABASE ai_knowledge' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ai_knowledge')\gexec

-- Set timezone
SET timezone = 'UTC';

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'AI Knowledge Database initialized successfully at %', now();
END $$;
