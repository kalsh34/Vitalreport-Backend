import express from 'express';
import {
  getIncidents,
  getIncident,
  createIncident,
  updateIncident,
  escalateIncident,
  resolveIncident,
  closeIncident
} from '../controllers/incidentController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'REGIONAL_MANAGER', 'SITE_MANAGER'), getIncidents)
  .post(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER', 'GUARD'), auditLog('CREATE_INCIDENT'), createIncident);

router.route('/:id')
  .get(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'REGIONAL_MANAGER', 'SITE_MANAGER'), getIncident)
  .patch(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), auditLog('UPDATE_INCIDENT'), updateIncident);

router.post('/:id/escalate', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER'), auditLog('ESCALATE_INCIDENT'), escalateIncident);
router.post('/:id/resolve', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER'), auditLog('RESOLVE_INCIDENT'), resolveIncident);
router.post('/:id/close', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER'), auditLog('CLOSE_INCIDENT'), closeIncident);

export default router;
