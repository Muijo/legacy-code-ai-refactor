import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'viewer'],
    default: 'user'
  },
  organizationName: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordChangedAt: Date,
  refreshTokens: [{
    type: String
  }],
  apiKeys: [{
    key: String,
    name: String,
    createdAt: Date,
    lastUsedAt: Date
  }],
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  lastLoginAt: Date,
  projectCount: {
    type: Number,
    default: 0
  },
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      analysis: { type: Boolean, default: true },
      refactoring: { type: Boolean, default: true }
    },
    preferences: {
      theme: { type: String, default: 'light' },
      language: { type: String, default: 'en' }
    }
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ 'apiKeys.key': 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });

// Virtual for lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Methods
userSchema.methods = {
  /**
   * Record failed login attempt
   */
  async recordFailedLogin() {
    this.failedLoginAttempts++;
    
    // Lock account after 5 failed attempts
    if (this.failedLoginAttempts >= 5 && !this.isLocked) {
      this.lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // Lock for 2 hours
    }
    
    await this.save();
  },

  /**
   * Record successful login
   */
  async recordSuccessfulLogin() {
    this.failedLoginAttempts = 0;
    this.lockUntil = undefined;
    this.lastLoginAt = new Date();
    await this.save();
  },

  /**
   * Update refresh tokens
   */
  async updateRefreshTokens(oldToken, newToken) {
    const index = this.refreshTokens.indexOf(oldToken);
    if (index !== -1) {
      this.refreshTokens[index] = newToken;
    } else {
      this.refreshTokens.push(newToken);
    }
    
    // Keep only last 5 tokens
    if (this.refreshTokens.length > 5) {
      this.refreshTokens = this.refreshTokens.slice(-5);
    }
    
    await this.save();
  },

  /**
   * Remove refresh token
   */
  async removeRefreshToken(token) {
    this.refreshTokens = this.refreshTokens.filter(t => t !== token);
    await this.save();
  },

  /**
   * Remove API key
   */
  async removeApiKey(keyId) {
    this.apiKeys = this.apiKeys.filter(k => k._id.toString() !== keyId);
    await this.save();
  },

  /**
   * Check if user owns a resource
   */
  async ownsResource(resourceType, resourceId) {
    // This would be implemented based on your resource ownership model
    // For now, returning true for user's own resources
    return true;
  },

  /**
   * Get public profile
   */
  getPublicProfile() {
    return {
      id: this._id,
      name: this.name,
      email: this.email,
      role: this.role,
      organizationName: this.organizationName,
      createdAt: this.createdAt
    };
  }
};

// Statics
userSchema.statics = {
  /**
   * Find user by email
   */
  async findByEmail(email) {
    return this.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true 
    });
  },

  /**
   * Find user by API key
   */
  async findByApiKey(hashedKey) {
    return this.findOne({
      'apiKeys.key': hashedKey,
      isActive: true
    });
  },

  /**
   * Get user statistics
   */
  async getUserStats() {
    const totalUsers = await this.countDocuments({ isActive: true });
    const verifiedUsers = await this.countDocuments({ 
      isActive: true, 
      emailVerified: true 
    });
    const activeUsers = await this.countDocuments({
      isActive: true,
      lastLoginAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    return {
      total: totalUsers,
      verified: verifiedUsers,
      active: activeUsers,
      verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0,
      activeRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0
    };
  }
};

// Pre-save middleware
userSchema.pre('save', function(next) {
  // Only run this function if password was modified
  if (!this.isModified('password')) return next();

  // Password is already hashed (from auth service)
  next();
});

// Ensure email uniqueness with custom error
userSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Email already exists'));
  } else {
    next(error);
  }
});

export const User = mongoose.model('User', userSchema);