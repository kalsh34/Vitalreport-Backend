import express from 'express';
import {
  getGuardReports,
  getGuardReport,
  createGuardReport,
  updateGuardReport,
  reviewReport,
  approveReport,
  returnReport
} from '../controllers/guardReportController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER', 'GUARD'), getGuardReports)
  .post(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER', 'GUARD'), auditLog('CREATE_GUARD_REPORT'), createGuardReport);

router.route('/:id')
  .get(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), getGuardReport)
  .patch(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER', 'GUARD'), auditLog('UPDATE_GUARD_REPORT'), updateGuardReport);

router.post('/:id/review', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER'), auditLog('REVIEW_GUARD_REPORT'), reviewReport);
router.post('/:id/approve', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER'), auditLog('APPROVE_GUARD_REPORT'), approveReport);
router.post('/:id/return', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER'), auditLog('RETURN_GUARD_REPORT'), returnReport);

export default router;
