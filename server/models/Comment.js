const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Achievement = require('./Achievement');

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  achievementId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Achievement,
      key: 'id'
    }
  }
}, {
  tableName: 'comments',
  timestamps: true,
});

module.exports = Comment;
