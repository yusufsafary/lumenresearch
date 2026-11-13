/* Lumen Research: public site configuration.
   Agents and this page read contract data from here only. Addresses are
   the deployed, Sourcify-verified contracts on BNB Chain (chain id 56),
   deployed from the project wallet. Case 1 (genesisOpen) and holder
   claims (claimOpen) open on a separate announcement; the boards read
   those switches on chain and show a standby state until they flip. */
window.LUMEN_CONFIG = {
  CONTRACT: "0x4158B701EaA30E8FaDBaA526F70780A38318c1C4", // LumenFindings NFT (FIND)
  TOKEN: "0xc5655b7653412533e733C034A6CF024776808c50", // $LUMEN token (LumenToken)
  CLAIM: "0xfBaf998334e3ad792E4b107f284D25E4c3A443C0", // LumenClaim (holder claim, tiered fees)
  AGENT_ID_REGISTRY: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F", // SPACE ID Agent ID registry
  PROJECT_WALLET: "0x6a87c90daF957cE99f220E9dEC417880dC0D65E9",
  CHAIN_ID: 56,
  CASE_SECONDS: 10800, // one Case every 3 hours, aligned to UTC boundaries
  MAX_PER_CASE: 10,
  RPCS: [
    "https://bsc-rpc.publicnode.com",
    "https://bsc-dataseed.bnbchain.org",
    "https://bsc-dataseed.binance.org",
    "https://bsc-dataseed1.binance.org"
  ]
};
