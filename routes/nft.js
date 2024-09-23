var express = require('express');
var router = express.Router();
const { getNFTMetadata, fetchUserBlockchainTransactions, getBlockchainTransactions, pushDataToIPFS, fetchIPFSData, tokenBalance, contractInteraction } = require('../services/nft.service');

router.post('/get-metadata', async function (req, res, next) {
    return await getNFTMetadata(req, res);
});

router.get('/get-latest-transactions', async function (req, res, next) {
    return await fetchUserBlockchainTransactions(req, res);
});

router.get('/get-transactions', async function (req, res, next) {
    return await getBlockchainTransactions(req, res);
});

router.post('/post-data-ipfs', async function (req, res, next) {
    return await pushDataToIPFS(req, res);
});

router.get('/get-ipfs-data', async function (req, res, next) {
    return await fetchIPFSData(req, res);
})

router.get('/token-balance', async function (req, res, next) {
    return await tokenBalance(req, res);
});

router.post('/contract-interaction', async function (req, res, next) {
    return await contractInteraction(req, res);
});


module.exports = router;