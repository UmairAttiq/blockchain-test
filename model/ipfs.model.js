const mongoose = require('mongoose');

const IPFSDataSchema = new mongoose.Schema({
    data: {
        type: String,
        require: true
    },
    hash: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports.IPFSDataModel = mongoose.model('IPFSData', IPFSDataSchema);