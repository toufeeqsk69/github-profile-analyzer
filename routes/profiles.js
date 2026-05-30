const express = require('express');
const router = express.Router();
const {
    analyzeProfile,
    getAllProfiles,
    getProfile
} = require('../controllers/profilesController');

router.post('/:username', analyzeProfile);
router.get('/', getAllProfiles);
router.get('/:username', getProfile);

module.exports = router;
