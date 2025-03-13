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
} from "@solana/spl-token";
import {
    LOOKUP_TABLE_CACHE,
} from "@raydium-io/raydium-sdk";
import * as metadata from "@metaplex-foundation/mpl-token-metadata";
import { getTipAccounts, sendBundles } from "./JITO.js";

import dotenv from "dotenv";
dotenv.config();

const {PROGRAM_ID, createCreateMetadataAccountV3Instruction} = metadata;

const addLookupTableInfo = (process.env.REACT_APP_DEVNET_MODE === "true") ? undefined : LOOKUP_TABLE_CACHE;

const connection = new Connection(process.env.RPC_URL, "finalized");

async function createToken(connection, ownerKeypair, name, symbol, uri, decimals, totalSupply) {

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
    const transaction = new VersionedTransaction(message.compileToV0Message(Object.values({ ...(addLookupTableInfo ?? {}) })));
    transaction.sign([ownerKeypair, mintKeypair]);

    // send transaction
    const ret = await sendBundles([[transaction]]);

    if (!ret) {
        console.log("Failed to create tokens");
        dispersed = false;
    }

    return { mint: mintKeypair.publicKey, transaction: transaction };
}


const disperseToken = async (ownerKeypair, mint, wallets, amounts) => {
    let bundleItems = [];
    let bundleIndex = -1;

    tipAddrs = await getTipAccounts();

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
            console.log("Transferring tokens...", from, index, index + count - 1);
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
                        lamports: LAMPORTS_PER_SOL * jitoTip,
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
            console.log("------------------ simulate  ", i, j, sim);

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