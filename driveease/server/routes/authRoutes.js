import { Router } from 'express';
import { changePassword, login, me, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/security.js';
import { validate } from '../middleware/validate.js';
import { changePasswordSchema, loginSchema, profileSchema } from '../validators/authValidators.js';

// NOTE: there is intentionally NO public registration endpoint.
// The first admin is created with `npm run seed:admin` (see README).
const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), login);
router.get('/me', protect, me);
router.put('/profile', protect, validate(profileSchema), updateProfile);
router.put('/password', protect, loginLimiter, validate(changePasswordSchema), changePassword);

export default router;
