const express = require('express');
const User = require('../models/User');
const Upload = require('../models/Upload');
const Analysis = require('../models/Analysis');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Admin
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    // Get counts
    const [userCount, uploadCount, analysisCount] = await Promise.all([
      User.countDocuments(),
      Upload.countDocuments(),
      Analysis.countDocuments()
    ]);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [recentUsers, recentUploads, recentAnalyses] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Upload.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Analysis.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
    ]);

    // Get storage usage
    const storageStats = await Upload.aggregate([
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$fileSize' },
          averageSize: { $avg: '$fileSize' }
        }
      }
    ]);

    res.json({
      statistics: {
        users: userCount,
        uploads: uploadCount,
        analyses: analysisCount,
        storage: storageStats[0] || { totalSize: 0, averageSize: 0 }
      },
      recentActivity: {
        users: recentUsers,
        uploads: recentUploads,
        analyses: recentAnalyses
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Error fetching admin dashboard data' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination
// @access  Admin
router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      users,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: skip + users.length < total,
        hasPrev: page > 1,
        totalUsers: total
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user and all associated data
// @access  Admin
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user's uploads and analyses
    await Upload.deleteMany({ user: req.params.id });
    await Analysis.deleteMany({ user: req.params.id });
    
    // Delete user
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

module.exports = router;