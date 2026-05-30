# GitHub Profile Analyzer API

A Node.js + Express backend service that analyzes GitHub public profiles, stores useful insights in a MySQL database, and exposes APIs for retrieving analyzed profiles.

## Features

- Fetch public GitHub profile data by username
- Compute and store insights like public repos, followers, organization count, and GitHub tenure
- Store analysis results in a MySQL database
- Retrieve all stored profiles
- Retrieve one stored profile by username

## Tech Stack

- Node.js
- Express.js
- MySQL
- GitHub REST API

## Setup

1. Copy `.env.example` to `.env` and update values.
2. Create the database and table using `sql/schema.sql`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Use the API:
- `POST /profiles/:username` - analyze and save a GitHub profile, including the user's top 5 repos
- `GET /profiles` - list stored profiles
- `GET /profiles/:username` - fetch one stored profile including its top 5 repos

## Database

The database schema is available in `sql/schema.sql`.

If you already created the database before this update, run this command to add the new `top_repos` column:

```sql
ALTER TABLE analyzed_profiles
ADD COLUMN top_repos JSON;
```

Or recreate the table from the updated schema.

## Environment Variables

- `PORT` - Express server port
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - MySQL connection values
- `GITHUB_TOKEN` - optional GitHub personal access token to reduce rate limiting

## Example

```bash
curl -X POST http://localhost:4000/profiles/octocat
curl http://localhost:4000/profiles
curl http://localhost:4000/profiles/octocat
```

## Improvements

- Supports GitHub API token for higher rate limits
- Computes derived insights like years on GitHub and repo-to-follower ratio
- Stores raw profile JSON for easy extension
