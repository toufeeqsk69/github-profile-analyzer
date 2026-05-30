const axios = require('axios');
const pool = require('../config/db');

const githubClient = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'GitHub-Profile-Analyzer'
    },
    timeout: 10000
});

if (process.env.GITHUB_TOKEN) {
    githubClient.defaults.headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

const calculateYearsOnGithub = (createdAt) => {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const diff = Date.now() - created.getTime();
    return Number((diff / (1000 * 60 * 60 * 24 * 365)).toFixed(2));
};

const calculateRepoFollowerRatio = (repos, followers) => {
    if (!followers || followers === 0) return repos > 0 ? repos : 0;
    return Number((repos / followers).toFixed(4));
};

const fetchGithubProfile = async (username) => {
    const response = await githubClient.get(`/users/${encodeURIComponent(username)}`);
    return response.data;
};

const fetchTopRepos = async (username) => {
    const topRepos = [];
    let page = 1;
    const perPage = 100;
    const maxPages = 3;

    while (page <= maxPages) {
        const response = await githubClient.get(
            `/users/${encodeURIComponent(username)}/repos`,
            {
                params: {
                    type: 'owner',
                    sort: 'created',
                    direction: 'desc',
                    per_page: perPage,
                    page
                }
            }
        );

        if (!Array.isArray(response.data) || response.data.length === 0) {
            break;
        }

        topRepos.push(...response.data.filter((repo) => !repo.fork));
        if (response.data.length < perPage) break;
        page += 1;
    }

    return topRepos
        .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
        .map((repo) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            html_url: repo.html_url,
            description: repo.description,
            language: repo.language,
            stargazers_count: repo.stargazers_count,
            forks_count: repo.forks_count,
            created_at: repo.created_at,
            updated_at: repo.updated_at
        }));
};

const upsertAnalyzedProfile = async (profile, topRepos) => {
    const yearsOnGithub = calculateYearsOnGithub(profile.created_at);
    const repoToFollowerRatio = calculateRepoFollowerRatio(profile.public_repos, profile.followers);
    const analysisDate = new Date();

    const query = `
    INSERT INTO analyzed_profiles
      (github_id, username, name, company, location, bio, avatar_url, profile_url, public_repos, public_gists,
       followers, following, created_at, updated_at, analysis_date, years_on_github, repo_to_follower_ratio, top_repos, raw_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      github_id = VALUES(github_id),
      name = VALUES(name),
      company = VALUES(company),
      location = VALUES(location),
      bio = VALUES(bio),
      avatar_url = VALUES(avatar_url),
      profile_url = VALUES(profile_url),
      public_repos = VALUES(public_repos),
      public_gists = VALUES(public_gists),
      followers = VALUES(followers),
      following = VALUES(following),
      created_at = VALUES(created_at),
      updated_at = VALUES(updated_at),
      analysis_date = VALUES(analysis_date),
      years_on_github = VALUES(years_on_github),
      repo_to_follower_ratio = VALUES(repo_to_follower_ratio),
      top_repos = VALUES(top_repos),
      raw_data = VALUES(raw_data);
  `;

    const values = [
        profile.id,
        profile.login,
        profile.name,
        profile.company,
        profile.location,
        profile.bio,
        profile.avatar_url,
        profile.html_url,
        profile.public_repos,
        profile.public_gists,
        profile.followers,
        profile.following,
        profile.created_at ? new Date(profile.created_at) : null,
        profile.updated_at ? new Date(profile.updated_at) : null,
        analysisDate,
        yearsOnGithub,
        repoToFollowerRatio,
        JSON.stringify(topRepos),
        JSON.stringify(profile)
    ];

    await pool.execute(query, values);
    const [rows] = await pool.execute('SELECT * FROM analyzed_profiles WHERE username = ?', [profile.login]);
    return rows[0];
};

const analyzeProfile = async (req, res) => {
    const username = req.params.username;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        const profile = await fetchGithubProfile(username);
        const topRepos = await fetchTopRepos(username);
        const storedProfile = await upsertAnalyzedProfile(profile, topRepos);
        return res.status(200).json({ data: storedProfile });
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ error: 'GitHub profile not found' });
        }

        console.error('Error analyzing profile:', error.message || error);
        return res.status(500).json({ error: 'Unable to analyze profile' });
    }
};

const getAllProfiles = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, github_id, username, name, location, company, public_repos, followers, following, analysis_date FROM analyzed_profiles ORDER BY analysis_date DESC'
        );
        return res.status(200).json({ data: rows });
    } catch (error) {
        console.error('Error fetching profiles:', error.message || error);
        return res.status(500).json({ error: 'Unable to fetch stored profiles' });
    }
};

const parseJsonField = (value) => {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
    return value;
};

const getProfile = async (req, res) => {
    const username = req.params.username;

    try {
        const [rows] = await pool.execute('SELECT * FROM analyzed_profiles WHERE username = ?', [username]);
        if (!rows.length) {
            return res.status(404).json({ error: 'Profile not found in database' });
        }
        const profile = rows[0];
        profile.top_repos = parseJsonField(profile.top_repos);
        profile.raw_data = parseJsonField(profile.raw_data);
        return res.status(200).json({ data: profile });
    } catch (error) {
        console.error('Error fetching profile:', error.message || error);
        return res.status(500).json({ error: 'Unable to fetch profile' });
    }
};

module.exports = {
    analyzeProfile,
    getAllProfiles,
    getProfile
};
