const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const UPDATES_DIR = path.join(__dirname, '../../updates');

if (!fs.existsSync(UPDATES_DIR)) {
  fs.mkdirSync(UPDATES_DIR, { recursive: true });
}

router.get('/', (req, res) => {
  res.json({
    version: '1.0.1',
    url: 'http://10.139.44.114:5000/api/updates/bundle',
    mandatory: false,
    message: 'Naye features ke saath update!'
  });
});

router.get('/bundle', (req, res) => {
  const bundlePath = path.join(UPDATES_DIR, 'latest.zip');
  if (fs.existsSync(bundlePath)) {
    res.download(bundlePath, 'update.zip');
  } else {
    res.status(404).json({ success: false, error: 'Update bundle not found' });
  }
});

module.exports = router;
