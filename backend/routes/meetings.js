const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/meetingController');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.get('/', ctrl.getMeetings);
router.get('/:id', ctrl.getMeetingById);
router.post('/', upload.single('recording'), ctrl.createMeeting);
router.put('/:id', upload.single('recording'), ctrl.updateMeeting);
router.delete('/:id', ctrl.deleteMeeting);

// Specific actions
router.patch('/:id/link', ctrl.updateMeetingLink);
router.post('/sync', ctrl.syncFromTeams);
router.post('/import-recordings', ctrl.importAllRecordings);
router.post('/enrich-manual', ctrl.enrichManualMeetings);

module.exports = router;