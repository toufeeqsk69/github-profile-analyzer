const mysql = require('mysql2/promise');
require('dotenv').config();

const initializeDatabase = async () => {
    let connection;
    try {
        const dbName = process.env.DB_NAME || 'github_profile_analyzer';
        const connectionConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            waitForConnections: true
        };

        // Connect to the existing database or to the server if database creation is allowed
        if (process.env.DB_ALLOW_CREATE_DATABASE === 'true') {
            connection = await mysql.createConnection(connectionConfig);
            await connection.execute(
                `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
            );
            console.log(`✓ Database '${dbName}' is ready`);
        } else {
            connection = await mysql.createConnection({
                ...connectionConfig,
                database: dbName
            });
        }

        // Switch to the database if not already connected
        if (!connection.config.database) {
            await connection.changeUser({ database: dbName });
        }

        // Create table if not exists
        await connection.execute(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        console.log('✓ Table `analyzed_profiles` is ready');

        // Check and add missing columns
        const [columns] = await connection.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'analyzed_profiles' AND TABLE_SCHEMA = ?`,
            [dbName]
        );

        const existingColumns = columns.map((col) => col.COLUMN_NAME);

        // Define required columns
        const requiredColumns = {
            top_repos: "ADD COLUMN top_repos JSON"
        };

        // Add missing columns
        for (const [columnName, alterSQL] of Object.entries(requiredColumns)) {
            if (!existingColumns.includes(columnName)) {
                await connection.execute(`ALTER TABLE analyzed_profiles ${alterSQL}`);
                console.log(`✓ Added missing column '${columnName}'`);
            }
        }

        console.log('✓ All migrations completed successfully');
        await connection.end();
        return true;
    } catch (error) {
        console.error('✗ Migration error:', error.stack || error);
        if (connection) await connection.end();
        throw error;
    }
};

module.exports = { initializeDatabase };
