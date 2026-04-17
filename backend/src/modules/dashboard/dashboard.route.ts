import { Router } from 'express';
import { getDashboard } from './dashboard.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';

const router = Router();

router.use(authMiddleware);
router.get('/', requireRole('ADMIN'), getDashboard);

export default router;