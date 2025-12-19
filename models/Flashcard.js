const mongoose = require('mongoose');

const WordSchema = new mongoose.Schema({
  term: String,
  meaning: String,
  favorite: { type: Boolean, default: false }
});

const FlashcardSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  listTitle: String,
  words: [WordSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Flashcard', FlashcardSchema);
