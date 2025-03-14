# SPLTokenCreate
 Create SPL Token and disperse tokens to multi wallets on Solana chain

## Prerequisites

- Node.js (v18+ recommended)
- Access to a Solana RPC endpoint

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure your environment:
   - Copy `.env.example` to `.env`
   - Fill in your private keys, token mint, and preferred network configuration
  
 3. Run
    npm start

## Configuration

The project uses environment variables for configuration. Key settings include:

| Variable | Description |
|----------|-------------|
| `RPC_URL` | RPC endpoint URL |
| `OWNER_KEYPAIR` | Private key for the authority wallet |
| `TOKEN_NAME` | Human-readable identifier for the token, typically used to distinguish it from other tokens. For example, the token name for Bitcoin is "Bitcoin," and for Ethereum, it's "Ether." This name is usually displayed on wallets, exchanges, and other platforms to represent the token. |
| `TOKEN_SYMBOL` | Shorthand or abbreviation of the token's name. It is a unique identifier typically consisting of 3-5 characters and is used to represent the token in transactions or on platforms. For example, "BTC" is the symbol for Bitcoin, and "ETH" is the symbol for Ethereum. It is often used in wallets and exchanges to quickly reference the token. |
| `TOKEN_DECIMAL` | Decimal places for token precision. For example, if the TOKEN_DECIMAL is 6, a single token can be divided into 10^6 smaller units. |
| `TOKEN_URI` | Link to a metadata file that provides additional information about the token, such as its name, description, image, or any other relevant details. For instance, in non-fungible tokens (NFTs), the TOKEN_URI could point to a JSON file that contains detailed metadata about the token's properties. |
| `TOTAL_SUPPLY` | Total number of tokens that will ever be created or issued. It represents the maximum supply of the token.  |
| `PRIVATE_PRESALE_ADDRESS` | Public key for the Private/Presale Round wallet |
| `PRESALE_SALE_ADDRESS` | Public key for the Presale Sale wallet |
| `AI_DEVELOPMENT_ADDRESS` | Public key for AI Development wallet |
| `MARKETING_PARTNERSHIPS_ADDRESS` | Public key for Marketing and Partnerships wallet |
| `LIQUIDITY_ADDRESS` | Public key for Liquidity wallet |
| `LIQUIDITY_ADDRESS` | Public key for Team wallet |
| `TREASURY_ADDRESS` | Public key for Treasury wallet |
| `COMMUNITY_REWARDS_ADDRESS` | Public key for Treasury Community Rewards |
| `PRIVATE_PRESALE_AMOUNT` | Token amount of Private/Presale Round wallet |
| `PRESALE_SALE_AMOUNT` | Token amount of Private/Presale Round wallet |
| `AI_DEVELOPMENT_AMOUNT` | Token amount of AI Development wallet |
| `MARKETING_PARTNERSHIPS_AMOUNT` | Token amount of Marketing and Partnerships wallet |
| `LIQUIDITY_AMOUNT` | Token amount of Liquidity wallet |
| `TEAM_AMOUNT` | Token amount of Team wallet |
| `TREASURY_AMOUNT` | Token amount of Treasury wallet |
| `COMMUNITY_REWARDS_AMOUNT` | Token amount of Community Rewards wallet |
