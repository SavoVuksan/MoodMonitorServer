const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
    title: String,
    tags: [String],
    text: String,
    user: {type: mongoose.Schema.Types.ObjectId,  ref: 'User'},
    positiveEmotions: [{type: mongoose.Schema.Types.ObjectId, ref: 'Emotion'}],
    negativeEmotions: [{type: mongoose.Schema.Types.ObjectId, ref: 'Emotion'}],
    createdOn: {type: Date, default: Date.now}
});

const Entry = mongoose.model('Entry',EntrySchema);

module.exports = Entry;