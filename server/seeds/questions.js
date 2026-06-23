const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Question = require('../models/Question');
const connectDB = require('../config/db');

const questions = [
  // General Knowledge
  { question: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correctAnswer: 1, category: "science", difficulty: "easy" },
  { question: "What is the capital of Japan?", options: ["Seoul", "Beijing", "Tokyo", "Bangkok"], correctAnswer: 2, category: "geography", difficulty: "easy" },
  { question: "Who painted the Mona Lisa?", options: ["Van Gogh", "Picasso", "Da Vinci", "Michelangelo"], correctAnswer: 2, category: "art", difficulty: "easy" },
  { question: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correctAnswer: 3, category: "geography", difficulty: "easy" },
  { question: "How many bones are in the adult human body?", options: ["186", "206", "226", "246"], correctAnswer: 1, category: "science", difficulty: "medium" },
  { question: "What year did World War II end?", options: ["1943", "1944", "1945", "1946"], correctAnswer: 2, category: "history", difficulty: "easy" },
  { question: "Which element has the chemical symbol 'Au'?", options: ["Silver", "Aluminum", "Gold", "Argon"], correctAnswer: 2, category: "science", difficulty: "medium" },
  { question: "What is the smallest country in the world?", options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], correctAnswer: 1, category: "geography", difficulty: "medium" },
  { question: "Who wrote 'Romeo and Juliet'?", options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"], correctAnswer: 1, category: "literature", difficulty: "easy" },
  { question: "What is the speed of light in km/s?", options: ["200,000", "300,000", "400,000", "500,000"], correctAnswer: 1, category: "science", difficulty: "medium" },
  // More questions
  { question: "Which country has the most natural lakes?", options: ["USA", "Russia", "Canada", "Brazil"], correctAnswer: 2, category: "geography", difficulty: "hard" },
  { question: "What is the chemical formula for water?", options: ["CO2", "H2O", "NaCl", "O2"], correctAnswer: 1, category: "science", difficulty: "easy" },
  { question: "Who discovered penicillin?", options: ["Marie Curie", "Alexander Fleming", "Louis Pasteur", "Isaac Newton"], correctAnswer: 1, category: "science", difficulty: "medium" },
  { question: "What is the tallest mountain in the world?", options: ["K2", "Kangchenjunga", "Mount Everest", "Lhotse"], correctAnswer: 2, category: "geography", difficulty: "easy" },
  { question: "Which language has the most native speakers?", options: ["English", "Spanish", "Hindi", "Mandarin Chinese"], correctAnswer: 3, category: "general", difficulty: "medium" },
  { question: "What is the currency of the United Kingdom?", options: ["Euro", "Dollar", "Pound Sterling", "Franc"], correctAnswer: 2, category: "general", difficulty: "easy" },
  { question: "How many players are on a soccer team?", options: ["9", "10", "11", "12"], correctAnswer: 2, category: "sports", difficulty: "easy" },
  { question: "What is the boiling point of water in Celsius?", options: ["90°C", "95°C", "100°C", "105°C"], correctAnswer: 2, category: "science", difficulty: "easy" },
  { question: "Who was the first person to walk on the Moon?", options: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "John Glenn"], correctAnswer: 1, category: "history", difficulty: "easy" },
  { question: "What is the hardest natural substance on Earth?", options: ["Gold", "Iron", "Diamond", "Platinum"], correctAnswer: 2, category: "science", difficulty: "easy" },
  { question: "Which continent is the Sahara Desert located on?", options: ["Asia", "Africa", "Australia", "South America"], correctAnswer: 1, category: "geography", difficulty: "easy" },
  { question: "What is the square root of 144?", options: ["10", "11", "12", "13"], correctAnswer: 2, category: "math", difficulty: "easy" },
  { question: "Which gas do plants absorb from the atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correctAnswer: 2, category: "science", difficulty: "easy" },
  { question: "What year was the Declaration of Independence signed?", options: ["1774", "1775", "1776", "1777"], correctAnswer: 2, category: "history", difficulty: "medium" },
  { question: "How many continents are there?", options: ["5", "6", "7", "8"], correctAnswer: 2, category: "geography", difficulty: "easy" },
  { question: "What is the longest river in the world?", options: ["Amazon", "Nile", "Mississippi", "Yangtze"], correctAnswer: 1, category: "geography", difficulty: "medium" },
  { question: "Which animal is known as the 'King of the Jungle'?", options: ["Tiger", "Elephant", "Lion", "Bear"], correctAnswer: 2, category: "general", difficulty: "easy" },
  { question: "What does DNA stand for?", options: ["Deoxyribonucleic Acid", "Dinitrogen Acid", "Dynamic Nuclear Acid", "Dual Nucleic Arrangement"], correctAnswer: 0, category: "science", difficulty: "medium" },
  { question: "Which planet is largest in our solar system?", options: ["Saturn", "Neptune", "Jupiter", "Uranus"], correctAnswer: 2, category: "science", difficulty: "easy" },
  { question: "What is the national sport of India?", options: ["Cricket", "Hockey", "Football", "Kabaddi"], correctAnswer: 1, category: "sports", difficulty: "medium" },
  { question: "How many states does India have?", options: ["26", "28", "29", "30"], correctAnswer: 1, category: "geography", difficulty: "medium" },
  { question: "Who invented the telephone?", options: ["Thomas Edison", "Alexander Graham Bell", "Nikola Tesla", "Guglielmo Marconi"], correctAnswer: 1, category: "history", difficulty: "easy" },
  { question: "What is the largest organ in the human body?", options: ["Heart", "Liver", "Skin", "Brain"], correctAnswer: 2, category: "science", difficulty: "medium" },
  { question: "Which ocean lies between America and Europe?", options: ["Pacific", "Indian", "Atlantic", "Arctic"], correctAnswer: 2, category: "geography", difficulty: "easy" },
  { question: "What is the currency of Japan?", options: ["Won", "Yuan", "Yen", "Ringgit"], correctAnswer: 2, category: "general", difficulty: "easy" },
  { question: "How many minutes are in a day?", options: ["1240", "1340", "1440", "1540"], correctAnswer: 2, category: "math", difficulty: "easy" },
  { question: "What is the chemical symbol for Iron?", options: ["Ir", "In", "Fe", "I"], correctAnswer: 2, category: "science", difficulty: "medium" },
  { question: "Which country invented paper?", options: ["Japan", "India", "China", "Egypt"], correctAnswer: 2, category: "history", difficulty: "medium" },
  { question: "What is the most spoken language in the world?", options: ["English", "Mandarin", "Spanish", "Hindi"], correctAnswer: 0, category: "general", difficulty: "medium" },
  { question: "Which vitamin is produced when skin is exposed to sunlight?", options: ["Vitamin A", "Vitamin B", "Vitamin C", "Vitamin D"], correctAnswer: 3, category: "science", difficulty: "medium" },
];

const seedQuestions = async () => {
  try {
    await connectDB();
    await Question.deleteMany({});
    await Question.insertMany(questions);
    console.log(`✅ Seeded ${questions.length} questions successfully`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding questions:', error);
    process.exit(1);
  }
};

seedQuestions();
