import express from 'express';
import { AuthController } from '../auth/authController.js';
import { authenticate, authorize, userRateLimit } from '../auth/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { body, param } from 'express-validator';

const router = express.Router();
const authController = new AuthController();

// Public routes (stricter rate limiting)
const publicRateLimit = userRateLimit(20, 15 * 60 * 1000); // 20 requests per 15 minutes

// Registration
router.post('/register',
  publicRateLimit,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('organizationName').optional().trim()
  ],
  validateRequest,
  (req, res) => authController.register(req, res)
);

// Login
router.post('/login',
  publicRateLimit,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  validateRequest,
  (req, res) => authController.login(req, res)
);

// Refresh token
router.post('/refresh',
  publicRateLimit,
  [
    body('refreshToken').notEmpty()
  ],
  validateRequest,
  (req, res) => authController.refresh(req, res)
);

// Request password reset
router.post('/password-reset',
  publicRateLimit,
  [
    body('email').isEmail().normalizeEmail()
  ],
  validateRequest,
  (req, res) => authController.requestPasswordReset(req, res)
);

// Reset password
router.post('/password-reset/confirm',
  publicRateLimit,
  [
    body('token').notEmpty(),
    body('newPassword').isLength({ min: 8 })
  ],
  validateRequest,
  (req, res) => authController.resetPassword(req, res)
);

// Verify email
router.get('/verify-email/:token',
  publicRateLimit,
  [
    param('token').notEmpty()
  ],
  validateRequest,
  (req, res) => authController.verifyEmail(req, res)
);

// Protected routes
const protectedRateLimit = userRateLimit(100, 15 * 60 * 1000); // 100 requests per 15 minutes

// Logout
router.post('/logout',
  authenticate,
  protectedRateLimit,
  [
    body('refreshToken').optional()
  ],
  validateRequest,
  (req, res) => authController.logout(req, res)
);

// Get profile
router.get('/profile',
  authenticate,
  protectedRateLimit,
  (req, res) => authController.getProfile(req, res)
);

// Update profile
router.patch('/profile',
  authenticate,
  protectedRateLimit,
  [
    body('name').optional().trim().isLength({ min: 2 }),
    body('organizationName').optional().trim()
  ],
  validateRequest,
  (req, res) => authController.updateProfile(req, res)
);

// Change password
router.post('/change-password',
  authenticate,
  protectedRateLimit,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 })
  ],
  validateRequest,
  (req, res) => authController.changePassword(req, res)
);

// API key management
router.post('/api-keys',
  authenticate,
  protectedRateLimit,
  (req, res) => authController.generateApiKey(req, res)
);

router.get('/api-keys',
  authenticate,
  protectedRateLimit,
  (req, res) => authController.listApiKeys(req, res)
);

router.delete('/api-keys/:keyId',
  authenticate,
  protectedRateLimit,
  [
    param('keyId').isMongoId()
  ],
  validateRequest,
  (req, res) => authController.deleteApiKey(req, res)
);

// Admin routes
router.get('/users',
  authenticate,
  authorize('admin'),
  protectedRateLimit,
  (req, res) => authController.listUsers(req, res)
);

router.get('/users/:userId',
  authenticate,
  authorize('admin'),
  protectedRateLimit,
  [
    param('userId').isMongoId()
  ],
  validateRequest,
  (req, res) => authController.getUser(req, res)
);

router.patch('/users/:userId',
  authenticate,
  authorize('admin'),
  protectedRateLimit,
  [
    param('userId').isMongoId(),
    body('role').optional().isIn(['admin', 'user', 'viewer']),
    body('isActive').optional().isBoolean()
  ],
  validateRequest,
  (req, res) => authController.updateUser(req, res)
);

router.delete('/users/:userId',
  authenticate,
  authorize('admin'),
  protectedRateLimit,
  [
    param('userId').isMongoId()
  ],
  validateRequest,
  (req, res) => authController.deleteUser(req, res)
);

export default router;