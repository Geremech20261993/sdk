---
layout: home

hero:
  name: "SoroSave SDK"
  text: "Group Savings on Soroban"
  tagline: TypeScript SDK for decentralized savings groups (Ajo, Susu, Chit Fund)
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/sorosave-protocol/sdk

features:
  - title: 🏦 Group Savings
    details: Create and manage rotating savings groups on the Stellar blockchain
  - title: 🔐 Secure & Transparent
    details: Smart contract-based trustless savings with on-chain transparency
  - title: ⚡ Easy Integration
    details: Simple TypeScript API for web and mobile applications
  - title: 📚 Complete Docs
    details: Comprehensive guides, API reference, and tutorials
---

## Quick Start

```bash
npm install @sorosave/sdk
```

```typescript
import { SoroSaveClient } from '@sorosave/sdk';

const client = new SoroSaveClient({
  rpcUrl: 'https://soroban-testnet.stellar.org',
  contractId: 'CONTRACT_ID',
  networkPassphrase: 'Test SDF Network ; September 2015'
});
```