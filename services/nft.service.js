const { default: axios } = require('axios');
const { Web3 } = require('web3');
const { INFURA_CREDENTAILS, APEX_NFT_CONTRACT_ADDRESS, ETHERSCAN_CREDENTIALS, PINATA_CREDENTIALS, ERC20_CONTRACT_ADDRESS, WITHDRAW_WALLET_PRIVATE_KEY } = require('../utils/utils');
const web3 = new Web3(`${INFURA_CREDENTAILS.INFURA_URL}${INFURA_CREDENTAILS.INFURA_KEY}`);
const { isAddress } = require('web3-validator');
const CONTRACT_ABI = require('../utils/abi/abi.json');
const ERC20_CONTRACT_ABI = require('../utils/abi/erc20abi.json');
const { NFTMetadataModel, BlockchainTransactionsModel, IPFSDataModel } = require('../model');
const { PinataSDK } = require('pinata');

//TASK 1
const getNFTMetadata = async (req, res) => {
    try {
        const { tokenId } = req.body;
        if (tokenId.length < 1) { return res.json({ code: 400, message: "Token ID is required" }) }
        if (!isAddress(APEX_NFT_CONTRACT_ADDRESS)) { return res.json({ code: 400, message: "Invalid Contract Address" }) }
        const nftExists = await NFTMetadataModel.findOne({ tokenId: tokenId })
        if (nftExists) {
            return res.json({ code: 400, message: "NFT already exists" })
        }
        const contract = new web3.eth.Contract(CONTRACT_ABI.abi, APEX_NFT_CONTRACT_ADDRESS);
        const metaData = await contract.methods.tokenURI(tokenId).call();
        const response = await axios.get(metaData, { headers: { 'Content-Type': 'application/json' } });
        const nftMetaData = new NFTMetadataModel({
            name: response.data.name,
            description: response.data.description,
            imageUrl: response.data.image,
            tokenId: tokenId,
            contractAddress: APEX_NFT_CONTRACT_ADDRESS
        });
        const data = await nftMetaData.save();
        return res.json({ code: 200, message: "NFT Metadata saved successfully", data: data })
    } catch (e) {
        console.log("Error in getNFTMetadata is : ", e);
        return res.json({
            code: e.code,
            message: e.message,
            error: e
        })
    }
}

//TASK 2
const fetchUserBlockchainTransactions = async (req, res) => {
    try {
        const { address } = req.query;
        if (!address) { return res.json({ code: 400, message: "Address is required" }) }
        if (!isAddress(address)) { return res.json({ code: 400, message: "Invalid Contract Address" }) }
        const response = await axios.get(`${ETHERSCAN_CREDENTIALS.ETHERSCAN_URL}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=5&sort=desc&apikey=${ETHERSCAN_CREDENTIALS.ETHERSCAN_API_KEY}`);
        const transactionData = response.data.result.map(tx => ({
            blockNumber: tx.blockNumber,
            timeStamp: new Date(tx.timeStamp * 1000).toISOString(), // Convert UNIX timestamp to ISO string
            hash: tx.hash,
            nonce: tx.nonce,
            blockHash: tx.blockHash,
            transactionIndex: tx.transactionIndex,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            gas: tx.gas,
            gasPrice: tx.gasPrice,
            isError: tx.isError,
            txreceipt_status: tx.txreceipt_status,
            input: tx.input,
            contractAddress: tx.contractAddress,
            cumulativeGasUsed: tx.cumulativeGasUsed,
            gasUsed: tx.gasUsed,
            confirmations: tx.confirmations,
            methodId: tx.methodId,
            functionName: tx.functionName
        }));
        const data = await BlockchainTransactionsModel.insertMany(transactionData);
        return res.json({ code: 200, message: "Blockchain Transactions saved successfully", data: data })
    } catch (e) {
        console.log("Error in fetchUserBlockchainTransactions is : ", e);
        return res.json({
            code: e.code,
            message: e.message,
            error: e
        })
    }
}

const getBlockchainTransactions = async (req, res) => {
    try {
        const { address, fromDate, toDate, page = 1, limit = 10 } = req.query;
        if (address) {
            if (!isAddress(address)) { return res.json({ code: 400, message: "Invalid Contract Address" }) }
        }
        let query = {};
        // Handle date range filters
        if (fromDate || toDate) {
            query.timeStamp = {};
            if (fromDate) {
                const from = new Date(fromDate).toISOString();
                query.timeStamp.$gte = from; // Start of the range
            }
            if (toDate) {
                const to = new Date(toDate);
                query.timeStamp.$lte = new Date(to.setHours(23, 59, 59, 999)).toISOString(); // End of the range
            }
        }
        if (address) {
            query = {
                ...query,
                from: { $regex: new RegExp(address, "i") } // Case-insensitive match
            }
        }
        console.log("query", query)
        // Calculate pagination values
        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
        const skip = (pageNumber - 1) * pageSize;
        // Fetch total transaction count for pagination info
        const totalTransactions = await BlockchainTransactionsModel.countDocuments(query);
        // Fetch paginated transactions
        const transactions = await BlockchainTransactionsModel.find(query)
            .sort({ timeStamp: -1 })
            .skip(skip)
            .limit(pageSize);
        // Prepare pagination metadata
        const totalPages = Math.ceil(totalTransactions / pageSize);
        return res.json({
            code: 200,
            message: "Blockchain Transactions fetched successfully",
            data: {
                transactions,
                pagination: {
                    totalTransactions,
                    totalPages,
                    currentPage: pageNumber,
                    pageSize
                }
            }
        });
    } catch (e) {
        console.log("Error in getBlockchainTransactions is : ", e);
        return res.json({
            code: e.code,
            message: e.message,
            error: e
        })
    }
}

//TASK 3
const pinata = new PinataSDK({
    pinataJwt: PINATA_CREDENTIALS.PINATA_JWT_TOKEN,
    pinataGateway: PINATA_CREDENTIALS.PINATA_GATEWAY_URL,
    pinataGatewayKey: PINATA_CREDENTIALS.PINATA_GATEWAY_KEY
});
const pushDataToIPFS = async (req, res) => {
    try {
        const { data } = req.body;
        if (!data) { return res.json({ code: 400, message: "Data is required" }) }
        const file = new File([JSON.stringify(data)], 'metadata3.json', { type: 'application/json' });
        const upload = await pinata.upload.file(file);
        console.log("upload", upload);
        const record = new IPFSDataModel({ data: data, hash: upload.cid, });
        const recordSaved = await record.save();
        return res.json({ code: 200, message: "Data pushed to IPFS successfully", data: recordSaved })
    } catch (e) {
        console.log("Error in pushDataToIPFS is : ", e);
        return res.json({
            code: e.code,
            message: e.message,
            error: e
        })
    }
}

const fetchIPFSData = async (req, res) => {
    try {
        const { ipfs_hash } = req.query;
        if (!ipfs_hash) { return res.json({ code: 400, message: "ipfs_hash is required" }) };
        const checkHash = await IPFSDataModel.findOne({ hash: ipfs_hash });
        if (!checkHash) { return res.json({ code: 404, message: 'ipfs_hash does not exist' }) }
        const data = await pinata.gateways.get(ipfs_hash);
        console.log("data", data);
        const url = await pinata.gateways.createSignedURL({
            cid: ipfs_hash,
            expires: 1800
        });
        console.log("Url is : ", url);
        return res.json({ code: 200, message: "Url generated successfully", url: url });
    } catch (e) {
        console.log("Error in fetchIPFSData is : ", e);
        return res.json({
            code: e.code,
            message: e.message,
            error: e
        })
    }
}

//TASK 4
const tokenBalance = async (req, res) => {
    try {
        const { address } = req.query;
        if (!address) { return res.json({ code: 400, message: "Address is required" }) }
        if (!isAddress(address)) { return res.json({ code: 400, message: "Invalid Contract Address" }) }
        //USDT ADDRESS OF TESTNET - SEPOLIA
        const contract = new web3.eth.Contract(ERC20_CONTRACT_ABI.abi, ERC20_CONTRACT_ADDRESS);
        const balance = await contract.methods.balanceOf(address).call();
        //CONVERTING THE BALANCE TO DECIMALS
        const tokenBalance = Number(balance) / 10 ** 6; //USDT has 6 decimals
        return res.json({ code: 200, message: "Token Balance fetched successfully", data: tokenBalance });
    } catch (e) {
        console.log("Error in tokenBalance is : ", e);
        return res.json({
            code: e.code,
            message: e.message,
            error: e
        })
    }
}

//TASK 5
const contractInteraction = async (req, res) => {
    try {
        const { toAddress, amount } = req.body;
        if (!toAddress || !amount) { return res.json({ code: 400, message: "fromAddress, toAddress and amount are required" }) }
        if (!isAddress(toAddress)) { return res.json({ code: 400, message: "Invalid Contract Address" }) }
        if (amount <= 0) { return res.json({ code: 400, message: "Amount should be greater than 0" }) }
        const contract = new web3.eth.Contract(ERC20_CONTRACT_ABI.abi, ERC20_CONTRACT_ADDRESS);
        const wallet = web3.eth.accounts.privateKeyToAccount(`0x${WITHDRAW_WALLET_PRIVATE_KEY}`);
        const existingWallet = web3.eth.wallet?.find(account => account.address.toLowerCase() === wallet.address.toLowerCase());
        if (!existingWallet) { web3.eth.wallet?.add(wallet); }
        const walletEthBalance = await web3.eth.getBalance(wallet.address);
        const convertedEthBalance = web3.utils.fromWei(walletEthBalance, 'ether');
        if (Number(convertedEthBalance) < 0.01) { return { code: 409, message: 'Unable to process at the moment' } };
        const usdtBalance = await contract.methods.balanceOf(wallet.address).call();
        const convertedUsdtBalance = Number(usdtBalance) / 10 ** 6; //USDT has 6 decimals
        if (convertedUsdtBalance < 0 || convertedUsdtBalance < Number(amount)) { return { code: 409, message: 'Unable to process at the moment, Contact Admin' }; }
        const transaction = await contract.methods.transfer(toAddress, amount * 10 ** 6).send({
            from: wallet.address
        });
        if (!transaction) { return { code: 409, message: 'Unable to process at the moment' } };
        const transactionData = new BlockchainTransactionsModel({
            blockHash: transaction.blockHash,
            blockNumber: String(Number(transaction.blockNumber)),
            cumulativeGasUsed: String(Number(transaction.cumulativeGasUsed)),
            from: transaction.from,
            to: toAddress,
            gasUsed: String(Number(transaction.gasUsed)),
            hash: transaction.transactionHash,
            transactionIndex: String(Number(transaction.transactionIndex)),
            amount: convertedUsdtBalance
        });
        const savedData = await transactionData.save();
        return res.json({ code: 200, message: "Transaction successful", data: savedData });
    } catch (e) {
        console.log("Error in contractInteraction is : ", e);
        return res.json({
            code: e.code,
            message: e.message,
            error: e
        })
    }
}

module.exports = {
    getNFTMetadata,
    fetchUserBlockchainTransactions,
    getBlockchainTransactions,
    pushDataToIPFS,
    fetchIPFSData,
    tokenBalance,
    contractInteraction
}
