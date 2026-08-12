import express from 'express';
import {
  getGuards,
  getGuard,
  createGuard,
  updateGuard,
  getGuardLiveStatus,
  getGuardLocations
} from '../controllers/guardController.js';
import { submitLocation, getGuardLocation, getLiveLocations } from '../controllers/gpsController.js';
import { startShift, endShift } from '../controllers/shiftController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), getGuards)
  .post(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER'), auditLog('CREATE_GUARD'), createGuard);

router.get('/live', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER'), getGuardLocations);

router.route('/:id')
  .get(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), getGuard)
  .patch(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER'), auditLog('UPDATE_GUARD'), updateGuard);

router.post('/:id/shift/start', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR'), auditLog('START_SHIFT'), startShift);
router.post('/:id/shift/end', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR'), auditLog('END_SHIFT'), endShift);

router.get('/:id/location', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR'), getGuardLocation);
router.get('/:id/live-status', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR'), getGuardLiveStatus);

export default router;
