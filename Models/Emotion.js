const mongoose = require('mongoose');

const EmotionSchema = new mongoose.Schema({
    type: String,
    name: String
});

const Emotion = mongoose.model('Emotion',EmotionSchema);

module.exports = Emotion;