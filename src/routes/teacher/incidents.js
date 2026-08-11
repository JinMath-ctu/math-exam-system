'use strict';

const express = require('express');
const incidentController = require('../../controllers/teacher-incident-controller');
const { approveIncidentRules, rejectIncidentRules } = require('../../validators/incident-validators');
const asyncHandler = require('../../utils/async-handler');

const router = express.Router();

router.get('/', asyncHandler(incidentController.list));
router.get('/:id', asyncHandler(incidentController.detail));
router.post('/:id/approve', approveIncidentRules, asyncHandler(incidentController.approve));
router.post('/:id/reject', rejectIncidentRules, asyncHandler(incidentController.reject));

module.exports = router;
