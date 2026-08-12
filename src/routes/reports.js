import express from 'express';
import {
  getDailyReports,
  getDailyReport,
  createDailyReport,
  updateDailyReport,
  getWeeklyReports,
  getWeeklyReport,
  createWeeklyReport,
  updateWeeklyReport,
  getMonthlyReports,
  getMonthlyReport,
  createMonthlyReport,
  updateMonthlyReport,
  approveReport,
  returnReport,
  publishReport
} from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.use(protect);

router.get('/daily', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), getDailyReports);
router.post('/daily', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), auditLog('CREATE_DAILY_REPORT'), createDailyReport);
router.get('/daily/:id', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), getDailyReport);
router.patch('/daily/:id', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), auditLog('UPDATE_DAILY_REPORT'), updateDailyReport);

router.get('/weekly', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), getWeeklyReports);
router.post('/weekly', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), auditLog('CREATE_WEEKLY_REPORT'), createWeeklyReport);
router.get('/weekly/:id', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), getWeeklyReport);
router.patch('/weekly/:id', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), auditLog('UPDATE_WEEKLY_REPORT'), updateWeeklyReport);

router.get('/monthly', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), getMonthlyReports);
router.post('/monthly', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), auditLog('CREATE_MONTHLY_REPORT'), createMonthlyReport);
router.get('/monthly/:id', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'CONTROL_ROOM_OPERATOR', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), getMonthlyReport);
router.patch('/monthly/:id', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'SUPERVISOR', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER', 'SITE_MANAGER'), auditLog('UPDATE_MONTHLY_REPORT'), updateMonthlyReport);

router.post('/:id/approve', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER'), auditLog('APPROVE_REPORT'), approveReport);
router.post('/:id/return', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER'), auditLog('RETURN_REPORT'), returnReport);
router.post('/:id/publish', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER', 'SECURITY_MANAGER'), auditLog('PUBLISH_REPORT'), publishReport);

export default router;
