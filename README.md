# StakersPro Affiliate Backend V2

## Main Rules

- Affiliate becomes eligible after 100 approved StakersPro wallets.
- Weekly reward is ₦120,000 / $80.
- Wallet verification uses your existing StakersPro MongoDB database.
- If a wallet was rejected because it was not yet a StakersPro user, the same affiliate can upload it again later.
- If the wallet later exists in the StakersPro database, the previous rejected record is updated to approved.
- Approved wallet addresses cannot be used by another affiliate.

## Run Locally

```bash
npm install
cp .env.example .env
npm run dev
```

Set `STAKERSPRO_DB_NAME` to the database name used by your main StakersPro referral/staking backend.
