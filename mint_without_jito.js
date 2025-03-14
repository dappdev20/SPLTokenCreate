import {
    Keypair,
    PublicKey,
    Connection,
    SystemProgram,
    Transaction
} from "@solana/web3.js";
import {
    MINT_SIZE,
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createInitializeMintInstruction,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    createTransferInstruction,
    getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import * as metadata from "@metaplex-foundation/mpl-token-metadata";
import bs58 from 'bs58';

import dotenv from "dotenv";
dotenv.config();

const { PROGRAM_ID, createCreateMetadataAccountV3Instruction } = metadata;

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

    // Fetch the recent blockhash for the transaction
    const recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash;

    // Create a transaction message and then a transaction object
    const transaction = new Transaction().add(...instructions);
    transaction.recentBlockhash = recentBlockhash;
    transaction.feePayer = ownerPubkey;

    // const sim = await connection.simulateTransaction(transaction);
    // console.log("------------ sim", sim);
    // return;

    // Sign the transaction with both owner and mint keypairs
    transaction.sign(ownerKeypair, mintKeypair);

    // Send the transaction to the network
    const signature = await connection.sendTransaction(transaction, [ownerKeypair, mintKeypair], {
        skipPreflight: false,
        preflightCommitment: 'processed',
    });

    console.log("Transaction signature:", signature);

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature);
    if (confirmation.value.err) {
        console.log("Failed to create tokens.");
        return null;
    }

    return { mint: mintKeypair.publicKey, transaction: transaction };
}

const disperseToken = async (connection, ownerKeypair, mint, wallets, amounts) => {
    const signers = [ownerKeypair];
    const recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash;

    const transactions = [];
    let index = 0;

    // Iterate through wallets and prepare transfers in batches (maximum 5 transfers per transaction)
    while (index < wallets.length) {
        let instructions = [];
        let count = 0;

        // Create transfer instructions for up to 5 wallets per transaction
        for (let i = index; i < wallets.length && count < 5; i++) {
            const fromTokenAccount = await getAssociatedTokenAddress(mint, ownerKeypair.publicKey);
            const toTokenAccount = await getAssociatedTokenAddress(mint, wallets[i]);

            // Check if the recipient has an associated token account, create it if not
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
            } catch (err) {
                console.log("Error getting account info for ", wallets[i], err);
            }

            // Prepare transfer instruction
            instructions.push(
                createTransferInstruction(
                    fromTokenAccount,
                    toTokenAccount,
                    ownerKeypair.publicKey,
                    amounts[i]
                )
            );

            count++;
        }

        if (instructions.length > 0) {
            // Create a transaction with the instructions
            const transaction = new Transaction().add(...instructions);
            transaction.recentBlockhash = recentBlockhash;
            transaction.feePayer = ownerKeypair.publicKey;
            transaction.sign(...signers);
            transactions.push(transaction);
        }

        // Move to the next batch of wallets
        index += count;
    }

    // Send each transaction
    for (let i = 0; i < transactions.length; i++) {
        try {
            const signature = await connection.sendTransaction(transactions[i], signers);
            console.log(`Transaction ${i + 1} sent with signature:`, signature);
            await connection.confirmTransaction(signature);
        } catch (err) {
            console.error("Failed to send transaction", i + 1, err);
        }
    }

    console.log("Token disperse completed");
};


const main = async () => {
    const ownerKeypair = Keypair.fromSecretKey(bs58.decode(process.env.OWNER_KEYPAIR));

    // const result = await createToken(connection, ownerKeypair, process.env.TOKEN_NAME, process.env.TOKEN_SYMBOL, process.env.TOKEN_URI, process.env.TOKEN_DECIMAL, process.env.TOTAL_SUPPLY);
    // if (result) {
        // console.log('mint = ', result.mint);
        const mintAddr = new PublicKey('Bm1zCMKP6fQPANq9Jm2xs1jgKg5sTpiazm3WEdnAFKnq');
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
        await disperseToken(connection, ownerKeypair, mintAddr, wallets, amounts);
    // }
}

main();