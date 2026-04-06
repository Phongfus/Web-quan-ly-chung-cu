import { Router } from 'express';
import { getDashboard } from './dashboard.controller';

const router = Router();

router.get('/', getDashboard);

export default router;