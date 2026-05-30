CREATE DATABASE IF NOT EXISTS github_profile_analyzer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE github_profile_analyzer;

CREATE TABLE IF NOT EXISTS analyzed_profiles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  github_id BIGINT UNSIGNED NOT NULL,
  username VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  company VARCHAR(255),
  location VARCHAR(255),
  bio TEXT,
  avatar_url VARCHAR(512),
  profile_url VARCHAR(512),
  public_repos INT UNSIGNED DEFAULT 0,
  public_gists INT UNSIGNED DEFAULT 0,
  followers INT UNSIGNED DEFAULT 0,
  following INT UNSIGNED DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME,
  analysis_date DATETIME NOT NULL,
  years_on_github DECIMAL(5,2) DEFAULT 0,
  repo_to_follower_ratio DECIMAL(8,4) DEFAULT 0,
  top_repos JSON,
  raw_data JSON,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;