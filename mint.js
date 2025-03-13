import {
    Keypair,
    PublicKey,
    Connection,
    SystemProgram,
    TransactionMessage,
    VersionedTransaction,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createInitializeMintInstruction,
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    createTransferInstruction,
    getMinimumBalanceForRentExemptMint ,
} from "@solana/spl-token";
import {
    LOOKUP_TABLE_CACHE,
} from "@raydium-io/raydium-sdk";
import * as metadata from "@metaplex-foundation/mpl-token-metadata";
import bs58 from 'bs58';
import { getTipAccounts, sendBundles, getTipTrx, getRandomNumber } from "./JITO.js";

import dotenv from "dotenv";
dotenv.config();

const { PROGRAM_ID, createCreateMetadataAccountV3Instruction } = metadata;

const addLookupTableInfo = (process.env.REACT_APP_DEVNET_MODE === "true") ? undefined : LOOKUP_TABLE_CACHE;

const connection = new Connection(process.env.RPC_URL, "finalized");

const createToken = async (connection, ownerKeypair, name, symbol, uri, decimals, totalSupply) => {

    let mintKeypair = Keypair.generate()

    const ownerPubkey = ownerKeypair.publicKey;

    console.log("----- new mint address: ", mintKeypair.publicKey);

    const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, ownerPubkey);

    const [metadataPDA] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            PROGRAM_ID.toBuffer(),
            mintKeypair.publicKey.toBuffer()
        ],
        PROGRAM_ID
    );

    const tokenMetadata = {
        name: name,
        symbol: symbol,
        uri: uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
    };

    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    const instructions = [
        SystemProgram.createAccount({
            fromPubkey: ownerPubkey,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports: lamports,
            programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
            mintKeypair.publicKey,
            decimals,
            ownerPubkey,
            null,
            TOKEN_PROGRAM_ID
        ),
        createAssociatedTokenAccountInstruction(
            ownerPubkey,
            tokenATA,
            ownerPubkey,
            mintKeypair.publicKey,
        ),
        createMintToInstruction(
            mintKeypair.publicKey,
            tokenATA,
            ownerPubkey,
            totalSupply * Math.pow(10, decimals),
        ),
        createCreateMetadataAccountV3Instruction(
            {
                metadata: metadataPDA,
                mint: mintKeypair.publicKey,
                mintAuthority: ownerPubkey,
                payer: ownerPubkey,
                updateAuthority: ownerPubkey,
            },
            {
                createMetadataAccountArgsV3: {
                    data: tokenMetadata,
                    isMutable: true,
                    collectionDetails: null,
                },
            }
        )
    ];
    const recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash;
    const message = new TransactionMessage({
        payerKey: ownerPubkey,
        recentBlockhash,
        instructions,
    });
    const transaction = new VersionedTransaction(message.compileToV0Message());
    transaction.sign([ownerKeypair, mintKeypair]);

    // const sim = await connection.simulateTransaction(transaction);
    // console.log("------------ sim", sim);
    // return;

    const tipTrx = await getTipTrx(ownerKeypair);
    // send transaction
    const ret = await sendBundles([[transaction, tipTrx]]);
    

    if (!ret) {
        console.log("Failed to create tokens");
        return null;
    }

    return { mint: mintKeypair.publicKey, transaction: transaction };
}


const disperseToken = async (ownerKeypair, mint, wallets, amounts) => {
    let bundleItems = [];
    let bundleIndex = -1;

    const tipAddrs = await getTipAccounts();

    const signers = [ownerKeypair];
    let index = 0;
    while (index < wallets.length) {
        let count = 0;
        let instructions = [];
        for (let i = index; i < wallets.length; i++) {
            const fromTokenAccount = getAssociatedTokenAddressSync(mint, ownerKeypair.publicKey);
            if (!fromTokenAccount)
                continue;

            const toTokenAccount = getAssociatedTokenAddressSync(mint, wallets[i]);
            try {
                const info = await connection.getAccountInfo(toTokenAccount);
                if (!info) {
                    instructions.push(
                        createAssociatedTokenAccountInstruction(
                            ownerKeypair.publicKey,
                            toTokenAccount,
                            wallets[i],
                            mint
                        )
                    );
                }
            }
            catch (err) {
                console.log(err);
            }

            instructions.push(
                createTransferInstruction(
                    fromTokenAccount,
                    toTokenAccount,
                    ownerKeypair.publicKey,
                    amounts[i]
                )
            );

            count++;
            if (count === 5)
                break;
        }

        if (instructions.length > 0) {
            console.log("Transferring tokens...", index, index + count - 1);
            if (bundleIndex >= 0 && bundleItems[bundleIndex] && bundleItems[bundleIndex].length < 5) {
                bundleItems[bundleIndex].push({
                    instructions: instructions,
                    signers: signers,
                    payer: ownerKeypair.publicKey,
                });
            }
            else {
                bundleItems.push([
                    {
                        instructions: instructions,
                        signers: signers,
                        payer: ownerKeypair.publicKey,
                    }
                ]);
                bundleIndex++;
            }
        }
        else
            break;

        index += count;
    }

    console.log("Bundle Items:", bundleItems.length);
    let bundleTxns = [];
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    for (let i = 0; i < bundleItems.length; i++) {
        let bundleItem = bundleItems[i];
        console.log("Bundle", i, bundleItem.length);

        const tipAccount = new PublicKey(tipAddrs[getRandomNumber(0, tipAddrs.length - 1)]);

        let verTxns = [];
        for (let j = 0; j < bundleItem.length; j++) {
            if (j === bundleItem.length - 1) {
                bundleItem[j].instructions = [
                    SystemProgram.transfer({
                        fromPubkey: bundleItem[j].payer,
                        toPubkey: tipAccount,
                        lamports: LAMPORTS_PER_SOL * 0.0005,
                    }),
                    ...bundleItem[j].instructions
                ];
            }
            const transactionMessage = new TransactionMessage({
                payerKey: bundleItem[j].payer,
                instructions: bundleItem[j].instructions,
                recentBlockhash,
            });
            const tx = new VersionedTransaction(transactionMessage.compileToV0Message());
            tx.sign(bundleItem[j].signers);

            const sim = await connection.simulateTransaction(tx);
            // console.log("------------------ simulate  ", i, j, sim);

            verTxns.push(tx);
        }

        bundleTxns.push(verTxns);
    }

    const ret = await sendBundles(bundleTxns);
    if (!ret) {
        console.log("Failed to transfer tokens");
        dispersed = false;
    }
}

const main = async () => {
    const ownerKeypair = Keypair.fromSecretKey(bs58.decode(process.env.OWNER_KEYPAIR));

    const result = await createToken(connection, ownerKeypair, process.env.TOKEN_NAME, process.env.TOKEN_SYMBOL, process.env.TOKEN_URI, process.env.TOKEN_DECIMAL, process.env.TOTAL_SUPPLY);
    if (result) {
        console.log('mint = ', result.mint);
        const mintAddr = new PublicKey('A1vpqMpYNQkKgde6vdirSDmkNtagCYrstErPqo3Y5esJ');
        const wallets = [
            new PublicKey(process.env.PRIVATE_PRESALE_ADDRESS),
            new PublicKey(process.env.PRESALE_SALE_ADDRESS),
            new PublicKey(process.env.AI_DEVELOPMENT_ADDRESS),
            new PublicKey(process.env.MARKETING_PARTNERSHIPS_ADDRESS),
            new PublicKey(process.env.LIQUIDITY_ADDRESS),
            new PublicKey(process.env.TEAM_ADDRESS),
            new PublicKey(process.env.TREASURY_ADDRESS),
            new PublicKey(process.env.COMMUNITY_REWARDS_ADDRESS)
        ];
        const amounts = [
            Number(process.env.PRIVATE_PRESALE_AMOUNT * 10 ** process.env.TOKEN_DECIMAL),
            Number(process.env.PRESALE_SALE_AMOUNT * 10 ** process.env.TOKEN_DECIMAL),
            Number(process.env.AI_DEVELOPMENT_AMOUNT * 10 ** process.env.TOKEN_DECIMAL),
            Number(process.env.MARKETING_PARTNERSHIPS_AMOUNT * 10 ** process.env.TOKEN_DECIMAL),
            Number(process.env.LIQUIDITY_AMOUNT * 10 ** process.env.TOKEN_DECIMAL),
            Number(process.env.TEAM_AMOUNT * 10 ** process.env.TOKEN_DECIMAL),
            Number(process.env.TREASURY_AMOUNT * 10 ** process.env.TOKEN_DECIMAL),
            Number(process.env.COMMUNITY_REWARDS_AMOUNT * 10 ** process.env.TOKEN_DECIMAL),
        ];
        await disperseToken(ownerKeypair, result.mint, wallets, amounts);
    }
}

main();