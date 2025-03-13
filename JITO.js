import axios from 'axios';
import bs58 from 'bs58';
import { bundle as Bundle } from 'jito-ts';
import {
    PublicKey,
    Connection,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';

const JITO_TIMEOUT = 10000;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export const getTipAccounts = async () => {
    const tipAddrs = [
        'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
        'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
        '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
        '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
        'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
        'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
        'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
        'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe'
    ];
    return tipAddrs;
}

export const getTipAccountsWithSDK = async (client) => {
    try {
        return client.getTipAccounts();
    }
    catch (err) {
        console.log(err);
        return [];
    }
}

const getRandomNumber = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const getTipTrx = async (tipPayer) => {
    try {
        const tipAddrs = await this.getTipAccounts();
        const tipAddr = tipAddrs[getRandomNumber(0, tipAddrs.length - 1)]
        const tipAccount = new PublicKey(tipAddr);

        const tipTx = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: tipPayer.publicKey,
                toPubkey: tipAccount,
                lamports: LAMPORTS_PER_SOL * 0.005,
            })
        );
        const SOLANA_CONNECTION = new Connection(process.env.SOLANA_RPC_URL);

        tipTx.recentBlockhash = (await SOLANA_CONNECTION.getLatestBlockhash("finalized")).blockhash;
        tipTx.sign(tipPayer);

        return tipTx;
    }
    catch (err) {
        console.log(err);
    }
    return null;
}

export const sendBundles = async (transactions) => {
    try {
        if (transactions.length === 0) {
            console.log("Error! Empty transactions.")
            return false;
        }

        console.log("Sending bundles...", transactions.length);
        let bundleIds = [];

        // console.log("\n\n***********\n", transactions)


        for (let i = 0; i < transactions.length; i++) {
            const rawTransactions = transactions[i].map(item => {
                return bs58.encode(item.serialize())
            });

            // console.log(rawTransactions)

            const { data } = await axios.post(`https://${process.env.JITO_MAINNET_URL}/api/v1/bundles`,
                {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "sendBundle",
                    params: [
                        rawTransactions
                    ],
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            if (data) {
                console.log(data);
                bundleIds = [
                    ...bundleIds,
                    data.result,
                ];
            }
        }

        console.log("Checking bundle's status...", bundleIds);
        const sentTime = Date.now();
        while (Date.now() - sentTime < JITO_TIMEOUT) {
            try {
                const { data } = await axios.post(`https://${process.env.JITO_MAINNET_URL}/api/v1/bundles`,
                    {
                        jsonrpc: "2.0",
                        id: 1,
                        method: "getBundleStatuses",
                        params: [
                            bundleIds
                        ],
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );

                if (data) {
                    const bundleStatuses = data.result.value;
                    console.log("Bundle Statuses:", bundleStatuses);
                    let success = true;
                    for (let i = 0; i < bundleIds.length; i++) {
                        const matched = bundleStatuses.find(item => item && item.bundle_id === bundleIds[i]);
                        if (!matched || matched.confirmation_status !== "confirmed") {    // finalized
                            success = false;
                            break;
                        }
                    }

                    if (success)
                        return true;
                }
            }
            catch (err) {
                console.log("JITO ERROR:", err);
            }

            await sleep(1000);
        }
    }
    catch (err) {
        console.log(err);
        console.log("JITO request failed")
    }
    return false;
}

export const sendBatchBundles = async (transactions) => {
    try {
        if (transactions.length === 0) {
            console.log("Error! Empty transactions.")
            return false;
        }

        console.log("Sending bundles...", transactions.length);
        let bundleIds = [];

        // console.log("\n\n***********\n", transactions)

        const JITO_URLS = [
            "amsterdam.mainnet.block-engine.jito.wtf",
            "frankfurt.mainnet.block-engine.jito.wtf",
            "ny.mainnet.block-engine.jito.wtf",
            "tokyo.mainnet.block-engine.jito.wtf",
            "slc.mainnet.block-engine.jito.wtf",
            "mainnet.block-engine.jito.wtf",
        ];


        for (let i = 0; i < transactions.length; i++) {
            const rawTransactions = transactions[i].map(item => {
                return bs58.encode(item.serialize())
            });

            // console.log(rawTransactions)

            const { data } = await axios.post(`https://${JITO_URLS[(i % JITO_URLS.length)]}/api/v1/bundles`,
                {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "sendBundle",
                    params: [
                        rawTransactions
                    ],
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            if (data) {
                console.log(data);
                bundleIds = [
                    ...bundleIds,
                    data.result,
                ];
            }
        }

        console.log("Checking bundle's status...", bundleIds);
        const sentTime = Date.now();
        while (Date.now() - sentTime < JITO_TIMEOUT) {
            try {
                const { data } = await axios.post(`https://${process.env.JITO_MAINNET_URL}/api/v1/bundles`,
                    {
                        jsonrpc: "2.0",
                        id: 1,
                        method: "getBundleStatuses",
                        params: [
                            bundleIds
                        ],
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );

                if (data) {
                    const bundleStatuses = data.result.value;
                    console.log("Bundle Statuses:", bundleStatuses);
                    let success = true;
                    for (let i = 0; i < bundleIds.length; i++) {
                        const matched = bundleStatuses.find(item => item && item.bundle_id === bundleIds[i]);
                        if (!matched || matched.confirmation_status !== "confirmed") {    // finalized
                            success = false;
                            break;
                        }
                    }

                    if (success)
                        return true;
                }
            }
            catch (err) {
                console.log("JITO ERROR:", err);
            }

            await sleep(1000);
        }
    }
    catch (err) {
        console.log(err);
        console.log("JITO request failed")
    }
    return false;
}

export const sendBundleTrxWithTip = async (transactions, tipPayer) => {
    const tipTrx = await this.getTipTrx(tipPayer)
    return await this.sendBundles([[...transactions, tipTrx]]);
}

export const sendBundlesWithSDK = async (client, transactions) => {
    try {
        console.log("Sending bundles...", transactions.length);
        let promiseBundleIds = [];
        for (let i = 0; i < transactions.length; i++) {
            const bundle = new Bundle(transactions[i], transactions[i].length);
            promiseBundleIds.push(client.sendBundle(bundle));
        }

        let code = {};
        let bundleIds = await Promise.all(promiseBundleIds);
        client.onBundleResult(
            (result) => {
                console.log("received bundle result:", result);
                let foundIndex = -1;
                for (let i = 0; i < bundleIds.length; i++) {
                    if (result.bundleId === bundleIds[i]) {
                        foundIndex = i;
                        break;
                    }
                }
                if (foundIndex < 0 || code[foundIndex] === 1)
                    return;

                // if (log)
                //     addLog("DEBUG", log.title, log.description + ": " + JSON.stringify(result));
                // else
                //     addLog("DEBUG", "Jito Execution", JSON.stringify(result));
                if (result.finalized || result.accepted)
                    code[foundIndex] = 1; // SUCCESS
                else if (result.rejected && !result.rejected.simulationFailure && !result.rejected.internalError && result.rejected.droppedBundle)
                    code[foundIndex] = 1; // SUCCESS
                else if (result.rejected && result.rejected.simulationFailure && result.rejected.simulationFailure.msg.includes("error=This transaction has already been processed"))
                    code[foundIndex] = 1; // SUCCESS
            },
            (err) => {
                console.log(err);
            }
        );

        const sentTime = Date.now();
        let success = false;
        while (!success) {
            success = true;
            for (let i = 0; i < bundleIds.length; i++) {
                if (!code[i]) {
                    success = false;
                    break;
                }
            }

            if (Date.now() - sentTime >= JITO_TIMEOUT)
                break;
            await sleep(1000);
        }

        return success;
    }
    catch (err) {
        console.log(err);
    }

    return false;
}
