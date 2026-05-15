/**
 * User Model
 * Handles authentication and department-based access control
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DEPARTMENTS = ['CS Team', 'Implementation Team', 'Dev Team', 'Sales Team'];

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Never return password in queries
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: {
      values: DEPARTMENTS,
      message: 'Invalid department. Must be one of: ' + DEPARTMENTS.join(', ')
    }
  },
  fullName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Virtual role getter for admin detection in controllers
userSchema.virtual('role').get(function() {
  return this.username === 'admin' ? 'admin' : 'user';
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get permissions based on department
userSchema.methods.getPermissions = function() {
  const permissions = {
    meetings: true,
    bots: true,
    clients: false,
    upsell: false,
    requirements: false,
    whatsapp: false,
    healthChecks: false,
    tickets: true,      // All departments can access tickets
    finance: false       // Finance restricted by department
  };

  switch (this.department) {
    case 'CS Team':
      permissions.clients = true;
      permissions.upsell = true;
      permissions.whatsapp = true;
      permissions.healthChecks = true;
      permissions.finance = true;
      break;
    case 'Implementation Team':
      permissions.requirements = true;
      break;
    case 'Dev Team':
      permissions.requirements = true;
      break;
    case 'Sales Team':
      permissions.clients = true;
      permissions.upsell = true;
      permissions.finance = true;
      break;
  }

  if (this.username === 'admin') {
    permissions.clients = true;
    permissions.upsell = true;
    permissions.requirements = true;
    permissions.whatsapp = true;
    permissions.healthChecks = true;
    permissions.admin = true;
    permissions.tickets = true;
    permissions.finance = true;
  }

  return permissions;
};

// Return safe user object (no password)
userSchema.methods.toSafeObject = function() {
  return {
    _id: this._id,
    username: this.username,
    fullName: this.fullName,
    email: this.email,
    department: this.department,
    role: this.username === 'admin' ? 'admin' : 'user',
    isActive: this.isActive,
    permissions: this.getPermissions(),
    lastLogin: this.lastLogin,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
