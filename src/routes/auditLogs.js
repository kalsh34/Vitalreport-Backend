import express from 'express';
import { getAuditLogs } from '../controllers/auditLogController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router.get('/', authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'GENERAL_MANAGER', 'OPERATIONS_MANAGER'), getAuditLogs);

export default router;
