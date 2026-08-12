import express from 'express';
import {
  getRadioCommunications,
  getRadioCommunication,
  createRadioCommunication,
  updateRadioCommunication,
  getRadioKPIs
} from '../controllers/radioController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER'), getRadioCommunications)
  .post(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR'), auditLog('CREATE_RADIO_COMMUNICATION'), createRadioCommunication);

router.route('/:id')
  .get(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER'), getRadioCommunication)
  .patch(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR'), auditLog('UPDATE_RADIO_COMMUNICATION'), updateRadioCommunication);

router.get('/kpis', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER'), getRadioKPIs);

export default router;
