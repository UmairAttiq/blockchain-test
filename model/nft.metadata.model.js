const mongoose = require('mongoose');

const NFTMetadataSchema = new mongoose.Schema({
    tokenId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true,
        unique: true
    },
    contractAddress: {
        type: String,
        required: true
    }
});

module.exports.NFTMetadataModel = mongoose.model('NFTMetadata', NFTMetadataSchema);