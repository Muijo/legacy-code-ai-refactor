import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User } from '../database/models/User.js';
import config from '../../config.js';
import { logger } from '../utils/logger.js';

export class AuthService {
  /**
   * Create a new user
   */
  async createUser({ email, password, name, organizationName, role = 'user' }) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);

      // Create verification token
      const emailVerificationToken = this.generateVerificationToken();

      // Create user
      const user = new User({
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        organizationName,
        role,
        emailVerificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      await user.save();

      // Send verification email (implement email service)
      // await emailService.sendVerificationEmail(user.email, emailVerificationToken);

      return user;
    } catch (error) {
      logger.error('Create user error', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(user) {
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    };

    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      payload,
      config.security.jwtSecret,
      { expiresIn: '15m' }
    );

    // Generate refresh token (long-lived)
    const refreshToken = jwt.sign(
      payload,
      config.security.jwtRefreshSecret || config.security.jwtSecret,
      { expiresIn: '7d' }
    );

    // Store refresh token
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    
    // Keep only last 5 refresh tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    await user.save();

    return { accessToken, refreshToken };
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, config.security.jwtSecret);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      }
      throw new Error('Invalid access token');
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(
        token, 
        config.security.jwtRefreshSecret || config.security.jwtSecret
      );
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      }
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Generate verification token
   */
  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token before storing
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    return resetToken;
  }

  /**
   * Reset password with token
   */
  async resetPasswordWithToken(token, newPassword) {
    // Hash the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, config.security.bcryptRounds);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = new Date();
    
    // Invalidate all refresh tokens
    user.refreshTokens = [];
    
    await user.save();

    return user;
  }

  /**
   * Verify email with token
   */
  async verifyEmailWithToken(token) {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return user;
  }

  /**
   * Check if user has permission
   */
  async checkPermission(userId, resource, action) {
    const user = await User.findById(userId);
    if (!user) {
      return false;
    }

    // Admin has all permissions
    if (user.role === 'admin') {
      return true;
    }

    // Define permission rules
    const permissions = {
      user: {
        project: ['create', 'read:own', 'update:own', 'delete:own'],
        analysis: ['create:own', 'read:own'],
        refactoring: ['create:own', 'read:own']
      },
      viewer: {
        project: ['read'],
        analysis: ['read'],
        refactoring: ['read']
      }
    };

    const userPermissions = permissions[user.role] || {};
    const resourcePermissions = userPermissions[resource] || [];

    // Check if action is allowed
    if (resourcePermissions.includes(action)) {
      return true;
    }

    // Check ownership-based permissions
    if (resourcePermissions.includes(`${action}:own`)) {
      // Additional ownership check would go here
      return true;
    }

    return false;
  }

  /**
   * Generate API key for user
   */
  async generateApiKey(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const apiKey = crypto.randomBytes(32).toString('hex');
    const hashedApiKey = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    user.apiKeys = user.apiKeys || [];
    user.apiKeys.push({
      key: hashedApiKey,
      name: `API Key ${user.apiKeys.length + 1}`,
      createdAt: new Date(),
      lastUsedAt: null
    });

    await user.save();

    return apiKey;
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey) {
    const hashedApiKey = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    const user = await User.findOne({
      'apiKeys.key': hashedApiKey,
      isActive: true
    });

    if (!user) {
      return null;
    }

    // Update last used
    const keyIndex = user.apiKeys.findIndex(k => k.key === hashedApiKey);
    if (keyIndex !== -1) {
      user.apiKeys[keyIndex].lastUsedAt = new Date();
      await user.save();
    }

    return user;
  }
}