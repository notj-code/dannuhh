const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Flashcard = require('../models/Flashcard');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const TRANSLATE_API = process.env.TRANSLATE_API || 'https://libretranslate.de/translate';

async function translateText(q, target='ko'){
  try{
    const res = await fetch(TRANSLATE_API, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ q, source: 'en', target, format: 'text' })
    });
    const data = await res.json();
    return data.translatedText || '';
  }catch(err){
    console.error('translate error', err.message);
    return '';
  }
}

// translate single
router.post('/translate', async (req, res) => {
  try {
    const { text, target } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    const translated = await translateText(text, target || 'ko');
    res.json({ translated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// save a flashcard list
router.post('/add', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    let ownerId = null;
    if (authHeader.startsWith('Bearer ')){
      try {
        const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
        ownerId = payload.id;
      } catch (err) {
        // ignore, proceed as anonymous
      }
    }

    const { listTitle, words } = req.body;
    if (!words || !Array.isArray(words) || words.length === 0) return res.status(400).json({ error: 'words required' });

    // each word: { term, meaning? }
    const enriched = await Promise.all(words.map(async (w) => {
      if (w.meaning && w.meaning.trim()) return { term: w.term, meaning: w.meaning, favorite: !!w.favorite };
      const translated = await translateText(w.term);
      return { term: w.term, meaning: translated || '', favorite: !!w.favorite };
    }));

    const doc = new Flashcard({ owner: ownerId, listTitle: listTitle || 'My list', words: enriched });
    await doc.save();
    res.json({ saved: true, id: doc._id, doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// list flashcards (for user or all)
router.get('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    let ownerId = null;
    if (authHeader.startsWith('Bearer ')){
      try { const payload = jwt.verify(authHeader.slice(7), JWT_SECRET); ownerId = payload.id; } catch(e){}
    }
    const q = ownerId ? { owner: ownerId } : {};
    const docs = await Flashcard.find(q).sort({ createdAt: -1 }).lean();
    res.json({ docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// toggle favorite on a specific word in a flashcard list
router.post('/:listId/toggle-favorite', async (req, res) => {
  try {
    const { listId } = req.params;
    const { index } = req.body; // index of the word
    if (typeof index !== 'number') return res.status(400).json({ error: 'index required' });
    const doc = await Flashcard.findById(listId);
    if (!doc) return res.status(404).json({ error: 'not found' });
    const w = doc.words[index];
    if (!w) return res.status(400).json({ error: 'invalid index' });
    w.favorite = !w.favorite;
    await doc.save();
    res.json({ ok: true, favorite: w.favorite });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
