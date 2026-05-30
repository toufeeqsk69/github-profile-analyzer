const express = require('express');
const dotenv = require('dotenv');
const profileRoutes = require('./routes/profiles');
const { initializeDatabase } = require('./db/migrations');

dotenv.config();

const app = express();
app.use(express.json());

app.use('/profiles', profileRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

const port = process.env.PORT || 4000;

const startServer = async () => {
    try {
        console.log('Initializing database...');
        await initializeDatabase();
        console.log('');
        app.listen(port, () => {
            console.log(`GitHub Profile Analyzer API listening on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();
