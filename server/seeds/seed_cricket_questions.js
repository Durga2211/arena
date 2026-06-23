const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const Question = require('../models/Question');

dotenv.config({ path: path.join(__dirname, '../.env') });

const parseQuestions = () => {
  const rawQuestionsText = fs.readFileSync(path.join(__dirname, 'raw_questions.txt'), 'utf8');
  const rawAnswersText = fs.readFileSync(path.join(__dirname, 'raw_answers.txt'), 'utf8');

  // Parse Answers
  const answersMap = {};
  rawAnswersText.trim().split('\n').forEach(line => {
    const parts = line.split('\t');
    if (parts.length === 2) {
      const qNum = parts[0].trim();
      const ansLetter = parts[1].trim();
      let ansIndex = 0;
      if (ansLetter === 'A') ansIndex = 0;
      if (ansLetter === 'B') ansIndex = 1;
      if (ansLetter === 'C') ansIndex = 2;
      if (ansLetter === 'D') ansIndex = 3;
      answersMap[qNum] = ansIndex;
    }
  });

  // Parse Questions
  const questionsList = [];
  const blocks = rawQuestionsText.split(/\n(?=\d+\.)/);

  blocks.forEach(block => {
    if (!block.trim()) return;
    
    const lines = block.trim().split('\n').filter(l => l.trim().length > 0);
    const qLine = lines[0]; 
    
    const match = qLine.match(/^(\d+)\.\s+(.*)$/);
    if (!match) return;
    
    const qNum = match[1];
    const qText = match[2];

    const options = [];
    for (let i = 1; i < lines.length; i++) {
      const optMatch = lines[i].match(/^[A-D]\)\s+(.*)$/);
      if (optMatch) {
        options.push(optMatch[1]);
      }
    }

    if (options.length === 4) {
      questionsList.push({
        question: qText,
        options: options,
        correctAnswer: answersMap[qNum],
        category: 'Cricket',
        difficulty: 'medium',
      });
    } else {
      console.log(`Question ${qNum} has missing options, skipped.`);
    }
  });

  return questionsList;
};

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    await Question.deleteMany({});
    console.log('Old questions wiped.');

    const questions = parseQuestions();
    await Question.insertMany(questions);
    
    console.log(`Successfully seeded ${questions.length} cricket questions!`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding questions:', error);
    process.exit(1);
  }
};

seedDB();
