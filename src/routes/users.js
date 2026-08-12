import express from 'express';
import { getUsers, getUser, createUser, updateUser, deleteUser } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'GENERAL_MANAGER'), getUsers)
  .post(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN'), auditLog('CREATE_USER'), createUser);

router.route('/:id')
  .get(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN', 'GENERAL_MANAGER'), getUser)
  .put(authorize('SUPER_ADMIN', 'CONTROL_ROOM_ADMIN'), auditLog('UPDATE_USER'), updateUser)
  .delete(authorize('SUPER_ADMIN'), auditLog('DELETE_USER'), deleteUser);

export default router;
