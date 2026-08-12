import express from 'express';
import {
  getRoutes,
  createRoute,
  getCheckpoints,
  createCheckpoint,
  getPatrolEvents,
  scanCheckpoint,
  getPatrolCompliance
} from '../controllers/patrolController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.use(protect);

router.get('/routes', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), getRoutes);
router.post('/routes', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), auditLog('CREATE_PATROL_ROUTE'), createRoute);

router.get('/checkpoints', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), getCheckpoints);
router.post('/checkpoints', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), auditLog('CREATE_PATROL_CHECKPOINT'), createCheckpoint);

router.post('/scan', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GUARD'), auditLog('SCAN_CHECKPOINT'), scanCheckpoint);

router.get('/events', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), getPatrolEvents);
router.get('/compliance', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), getPatrolCompliance);

export default router;
