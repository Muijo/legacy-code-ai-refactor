import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../database/models/User.js';
import config from '../../config.js';
import { AuthService } from './authService.js';
import { validateEmail, validatePassword } from '../utils/validation.js';
import { logger } from '../utils/logger.js';

export class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Register a new user
   */
  async register(req, res) {
    try {
      const { email, password, name, organizationName } = req.body;

      // Validate input
      const emailError = validateEmail(email);
      if (emailError) {
        return res.status(400).json({ error: emailError });
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }

      if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters long' });
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Create user
      const user = await this.authService.createUser({
        email: email.toLowerCase().trim(),
        password,
        name: name.trim(),
        organizationName: organizationName?.trim()
      });

      // Generate tokens
      const { accessToken, refreshToken } = await this.authService.generateTokens(user);

      // Log successful registration
      logger.info('User registered successfully', { 
        userId: user._id, 
        email: user.email 
      });

      res.status(201).json({
        message: 'Registration successful',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        accessToken,
        refreshToken
      });
    } catch (error) {
      logger.error('Registration error', { error: error.message });
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  /**
   * Login user
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Find user
      const user = await User.findByEmail(email.toLowerCase().trim());
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if account is locked
      if (user.isLocked()) {
        return res.status(423).json({ 
          error: 'Account locked due to too many failed login attempts. Please try again later.' 
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        await user.recordFailedLogin();
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if email is verified
      if (!user.emailVerified) {
        return res.status(403).json({ 
          error: 'Please verify your email before logging in' 
        });
      }

      // Clear failed login attempts
      await user.recordSuccessfulLogin();

      // Generate tokens
      const { accessToken, refreshToken } = await this.authService.generateTokens(user);

      // Log successful login
      logger.info('User logged in successfully', { 
        userId: user._id, 
        email: user.email 
      });

      res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        accessToken,
        refreshToken
      });
    } catch (error) {
      logger.error('Login error', { error: error.message });
      res.status(500).json({ error: 'Login failed' });
    }
  }

  /**
   * Refresh access token
   */
  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      // Verify refresh token
      const decoded = await this.authService.verifyRefreshToken(refreshToken);
      
      // Get user
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      // Check if refresh token is in user's tokens
      if (!user.refreshTokens.includes(refreshToken)) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      // Generate new tokens
      const tokens = await this.authService.generateTokens(user);

      // Remove old refresh token and add new one
      await user.updateRefreshTokens(refreshToken, tokens.refreshToken);

      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    } catch (error) {
      logger.error('Token refresh error', { error: error.message });
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  /**
   * Logout user
   */
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      const userId = req.user.id;

      if (refreshToken) {
        // Remove refresh token from user
        const user = await User.findById(userId);
        if (user) {
          await user.removeRefreshToken(refreshToken);
        }
      }

      logger.info('User logged out', { userId });
      res.json({ message: 'Logout successful' });
    } catch (error) {
      logger.error('Logout error', { error: error.message });
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  /**
   * Change password
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Validate new password
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }

      // Get user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Update password
      user.password = await bcrypt.hash(newPassword, config.security.bcryptRounds);
      user.passwordChangedAt = new Date();
      
      // Invalidate all refresh tokens
      user.refreshTokens = [];
      
      await user.save();

      logger.info('Password changed successfully', { userId });
      res.json({ message: 'Password changed successfully. Please login again.' });
    } catch (error) {
      logger.error('Change password error', { error: error.message });
      res.status(500).json({ error: 'Password change failed' });
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Find user
      const user = await User.findByEmail(email.toLowerCase().trim());
      if (!user) {
        // Don't reveal if user exists
        return res.json({ message: 'If the email exists, a password reset link has been sent' });
      }

      // Generate reset token
      const resetToken = await this.authService.generatePasswordResetToken(user);

      // Send email (implement email service)
      // await emailService.sendPasswordResetEmail(user.email, resetToken);

      logger.info('Password reset requested', { userId: user._id });
      res.json({ message: 'If the email exists, a password reset link has been sent' });
    } catch (error) {
      logger.error('Password reset request error', { error: error.message });
      res.status(500).json({ error: 'Password reset request failed' });
    }
  }

  /**
   * Reset password
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      // Validate input
      if (!token) {
        return res.status(400).json({ error: 'Reset token is required' });
      }

      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }

      // Verify token and reset password
      const user = await this.authService.resetPasswordWithToken(token, newPassword);

      logger.info('Password reset successfully', { userId: user._id });
      res.json({ message: 'Password reset successfully. Please login with your new password.' });
    } catch (error) {
      logger.error('Password reset error', { error: error.message });
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ error: 'Verification token is required' });
      }

      // Verify email
      const user = await this.authService.verifyEmailWithToken(token);

      logger.info('Email verified successfully', { userId: user._id });
      res.json({ message: 'Email verified successfully. You can now login.' });
    } catch (error) {
      logger.error('Email verification error', { error: error.message });
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      
      const user = await User.findById(userId).select('-password -refreshTokens');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationName: user.organizationName,
          createdAt: user.createdAt,
          projectCount: user.projectCount,
          lastLoginAt: user.lastLoginAt
        }
      });
    } catch (error) {
      logger.error('Get profile error', { error: error.message });
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { name, organizationName } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update fields
      if (name && name.trim().length >= 2) {
        user.name = name.trim();
      }
      
      if (organizationName !== undefined) {
        user.organizationName = organizationName.trim();
      }

      await user.save();

      logger.info('Profile updated', { userId });
      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationName: user.organizationName
        }
      });
    } catch (error) {
      logger.error('Update profile error', { error: error.message });
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
}