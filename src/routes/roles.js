import express from 'express';
import { getRoles, getRole, createRole, updateRole, deleteRole } from '../controllers/roleController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN'), getRoles)
  .post(authorize('SUPER_ADMIN'), auditLog('CREATE_ROLE'), createRole);

router.route('/:id')
  .get(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN'), getRole)
  .put(authorize('SUPER_ADMIN'), auditLog('UPDATE_ROLE'), updateRole)
  .delete(authorize('SUPER_ADMIN'), auditLog('DELETE_ROLE'), deleteRole);

export default router;
