# ProofBoard — Local Blockchain dApp (Truffle & Ganache)

ProofBoard is a decentralized contribution recognition dApp built on Ethereum. It allows developers to register pull requests and project deliverables on-chain. The repository maintainer verifies submissions through an administrative panel and mints verifiable ERC-721 badge tokens containing generative SVG metadata directly to contributor wallets.

---

## Evaluation & Deployment Overview

- **Framework:** Truffle Suite (`v5.11.5`)
- **Local Blockchain:** Ganache CLI (`v7.9.2`)
- **Smart Contract Language:** Solidity (`^0.8.20`)
- **Token Standard:** ERC-721 (OpenZeppelin Implementation)
- **Frontend:** React 18, HTM, Vite, Ethers.js
- **Network RPC:** `http://127.0.0.1:7545`
- **Chain ID:** `1337`
- **Deployed Contract Address:** `0x68Eee9155291F7Da8061a5C8914C0b3f6e796C43`
- **Deployer / Owner Address:** `0x752b6273Bd00B686c2Bf8f434d952ABdb1d479C5`
- **Deployment Transaction:** `0xcce11874abbfa5e301df314c25e63328cb4bb227ed74294e6e8612cbf77dfef1`

---

## Project Structure

```text
ProofBoard/
├── build/contracts/          # Compiled contract artifacts (ABI & bytecode)
├── contracts/
│   └── ProofBoard.sol        # ERC-721 smart contract
├── migrations/
│   └── 1_deploy_contract.js  # Truffle deployment migration script
├── screenshots/              # Evidence screenshots for assignment grading
│   ├── 1_compilation.png
│   ├── 2_migration.png
│   ├── 3_dapp_interaction.png
│   └── 4_terminal_tx_logs.png
├── ProofBoard/               # Client-side Vite dApp
│   ├── public/
│   ├── src/
│   │   ├── main.js           # Ethers.js connection, web3 handlers & UI logic
│   │   └── styles.css        # Custom UI styling & dynamic 3D tilt effects
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── truffle-config.js         # Truffle compiler & Ganache network configuration
├── package.json              # Root project dependencies
└── README.md

## Core Smart Contract Features

1. **`submitContribution(string title, string proofUrl, string category)`**
   - Any contributor can submit work under categories (`Code`, `Docs`, `Design`, `Security`).
   - Sets status to `Pending` and records it on the local blockchain ledger.

2. **`approveContribution(uint256 contributionId)`**
   - Restricted to contract deployer (`onlyOwner`).
   - Automatically mints an ERC-721 badge NFT to the contributor's wallet.
   - Generates pure on-chain SVG metadata.

3. **`rejectContribution(uint256 contributionId)`**
   - Restricted to contract deployer (`onlyOwner`).
   - Marks the submission status as `Rejected`.

4. **`getContribution(uint256 contributionId)` & `getContributionCount()`**
   - Public view getters for querying contribution status, contributor address, and token IDs.