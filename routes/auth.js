import { Router } from 'express';
import { login } from '../controllers/authController.js';

const router = Router();

// only the controller handles login logic
router.post('/login', login);

export default router;
