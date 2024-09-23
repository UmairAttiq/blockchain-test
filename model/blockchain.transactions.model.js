const mongoose = require('mongoose');

const BlockchainTransactionsSchema = new mongoose.Schema({
    blockNumber: {
        type: String,
        required: true,
        unique: true
    },
    timeStamp: {
        type: String,
    },
    hash: {
        type: String,
        required: true,
        unique: true
    },
    nonce: {
        type: String,
    },
    blockHash: {
        type: String,
    },
    transactionIndex: {
        type: String,
    },
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    value: {
        type: String,
    },
    gas: {
        type: String,
    },
    gasPrice: {
        type: String,
    },
    isError: {
        type: String,
    },
    txreceipt_status: {
        type: String,
    },
    input: {
        type: String,
    },
    contractAddress: {
        type: String,
    },
    cumulativeGasUsed: {
        type: String,
    },
    gasUsed: {
        type: String,
    },
    confirmations: {
        type: String,
    },
    methodId: {
        type: String,
    },
    functionName: {
        type: String,
    },
    effectiveGasPrice: {
        type: String,
    },
    status: {
        type: String,
    },
    amount: {
        type: Number
    }
});

module.exports.BlockchainTransactionsModel = mongoose.model('BlockchainTransactions', BlockchainTransactionsSchema);