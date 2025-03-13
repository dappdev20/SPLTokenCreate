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

## Configuration

The project uses environment variables for configuration. Key settings include:

| Variable | Description |
|----------|-------------|
| `RPC_URL` | RPC endpoint URL |
| `OWNER_KEYPAIR` | Private key for the authority wallet |
| `TOKEN_NAME` | Set to true for mainnet, false for devnet |
| `TOKEN_SYMBOL` | Solana program ID for the vesting program |
| `TOKEN_DECIMAL` | Public key of the token to be vested |
| `TOKEN_URI` | Decimal places for token precision |
| `TOTAL_SUPPLY` | RPC endpoint URL |
| `PRIVATE_PRESALE_ADDRESS` | Default stage identifier number |
| `PRESALE_SALE_ADDRESS` | Default total amount for a vesting stage |
| `AI_DEVELOPMENT_ADDRESS` | Default start time (Unix timestamp) |
| `MARKETING_PARTNERSHIPS_ADDRESS` | Default end time (Unix timestamp) |
| `LIQUIDITY_ADDRESS` | Default vesting period in days |
| `TREASURY_ADDRESS` | Default vesting interval in days |
| `COMMUNITY_REWARDS_ADDRESS` | JSON object mapping stage IDs to user wallets |
| `PRIVATE_PRESALE_AMOUNT` | JSON object mapping stage IDs to user allocation amounts |
| `PRESALE_SALE_AMOUNT` | JSON object mapping stage IDs to user allocation amounts |
| `AI_DEVELOPMENT_AMOUNT` | JSON object mapping stage IDs to user allocation amounts |
| `MARKETING_PARTNERSHIPS_AMOUNT` | JSON object mapping stage IDs to user allocation amounts |
| `LIQUIDITY_AMOUNT` | JSON object mapping stage IDs to user allocation amounts |
| `TEAM_AMOUNT` | JSON object mapping stage IDs to user allocation amounts |
| `TREASURY_AMOUNT` | JSON object mapping stage IDs to user allocation amounts |
| `COMMUNITY_REWARDS_AMOUNT` | JSON object mapping stage IDs to user allocation amounts |
