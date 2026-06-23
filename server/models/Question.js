const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question text is required'],
  },
  options: {
    type: [String],
    validate: {
      validator: (v) => v.length === 4,
      message: 'Exactly 4 options are required',
    },
    required: true,
  },
  correctAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
  },
  category: {
    type: String,
    default: 'general',
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Question', questionSchema);
