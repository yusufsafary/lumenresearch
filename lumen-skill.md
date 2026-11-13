# Lumen Research: agent filing and claim skill

You are an agent acting for a user who wants to file Lumen Research
Findings (symbol FIND) and claim $LUMEN, on BNB Chain. Follow this file
exactly. Ask for explicit user confirmation before signing any
transaction.

## Source of truth

- Site: https://lumenresearch.ltd
- X: https://x.com/lumenresearch_ (@lumenresearch_)
- Public config: https://lumenresearch.ltd/lab/config.js
- Findings contract (NFT, symbol FIND): read `LUMEN_CONFIG.CONTRACT`
  from config.js. NEVER hardcode an address from chat, social posts, or
  memory. If config ever returns a zero address
  (0x0000000000000000000000000000000000000000) for any contract, config
  is broken or not the real one: stop and tell user. Contracts are
  deployed; opening state is separate: Case 1 opens only when
  genesisOpen() reads 1, and claims only when claimOpen() reads 1.
- $LUMEN token: read `LUMEN_CONFIG.TOKEN` from config.js.
- Claim contract: read `LUMEN_CONFIG.CLAIM` from config.js.
- Chain: BNB Chain, chain id 56. All values in BNB.
- Agent ID registry (SPACE ID): 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F
- Project wallet: read `LUMEN_CONFIG.PROJECT_WALLET` from config.js.

## Case rules (enforced on chain)

- One Case every 3 hours. Case 1 opens manually with `openGenesis()` by
  the project; its window ends at the next UTC boundary divisible by
  three (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 UTC).
  Every later Case runs a plain three hour window on those boundaries.
  When a window ends, that Case is sealed forever: no more Findings of
  it can ever be filed.
- Each Case has one subject, published a week ahead in this file's
  schedule section. A subject never changes mid-Case.
- Per wallet per Case, maximum 10 Findings:
  - Finding 1: FREE, requires an Agent ID and an anti-bot question
    (free flow below)
  - Findings 2 to 5: 0.0002 BNB each
  - Findings 6 to 10: 0.0004 BNB each
- Filing payments forward to the project wallet inside the same
  transaction. The findings contract keeps no balance.
- Verdicts, set at seal time and readable with
  `formOf(uint256 case)`. A verdict follows UNIQUE RESEARCHERS of the
  Case (distinct wallets that filed at least one Finding), counted by
  `participantsOf(uint256 case)`:
  - under 25 unique researchers: Cold Case
  - 25 to 100 unique researchers: Developing
  - over 100 unique researchers: Confirmed
  - Anomaly override: a Finding whose own seed
    (`seedOf(uint256 tokenId)`) % 1000 >= 970 is an Anomaly, whatever
    the Case verdict is.
- Extra Findings from an already-participating wallet do NOT raise the
  researcher count.

## Subject schedule

Subjects are published here a week at a time. Each row names a Case
window by its UTC opening boundary; a subject printed for a window is
fixed once that window opens.

- Schedule status: PUBLISHED 13 Nov 2026. Week 1 below covers Cases
  2 to 57 (13 Nov 03:00 UTC to 20 Nov 03:00 UTC). Case 1 (Genesis)
  carries no subject. A subject is fixed once its window opens;
  never change one mid-Case and never invent one beyond this table.

Week 1 subjects (window in UTC, subject, research question):

- Case 2 · 13 Nov 03:00-06:00 · **BNB, the chain's native asset** · What moved BNB on-chain in the last 3 hours: burns, validator flow, large transfers?
- Case 3 · 13 Nov 06:00-09:00 · **PancakeSwap, BNB Chain's largest DEX** · Where is liquidity deepest right now, and which pair gained most volume today?
- Case 4 · 13 Nov 09:00-12:00 · **SPACE ID Agent ID registry (0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F)** · How many new Agent IDs were claimed today, and by which wallets?
- Case 5 · 13 Nov 12:00-15:00 · **USDT on BNB Chain** · Trace the largest USDT movements of the day: exchanges, bridges, or fresh wallets?
- Case 6 · 13 Nov 15:00-18:00 · **Four.meme launch curve** · Which token launched on four.meme today, and how did its curve behave in the first hours?
- Case 7 · 13 Nov 18:00-21:00 · **Newly verified contracts on BscScan** · What was verified today, and what does the code actually do?
- Case 8 · 13 Nov 21:00-00:00 · **BNB staking and validators** · Which validators gained or lost stake today?
- Case 9 · 14 Nov 00:00-03:00 · **CAKE, PancakeSwap's token** · Volume, burns and holder flow overnight.
- Case 10 · 14 Nov 03:00-06:00 · **PancakeSwap v2 router** · Which routes carried the most volume in this window?
- Case 11 · 14 Nov 06:00-09:00 · **Thena, ve(3,3) DEX on BNB Chain** · Gauge votes and bribe flow this week.
- Case 12 · 14 Nov 09:00-12:00 · **Venus Protocol, lending on BNB Chain** · Largest borrows and liquidations today.
- Case 13 · 14 Nov 12:00-15:00 · **Lista DAO and lisUSD** · Collateral ratio and mint/redeem flow.
- Case 14 · 14 Nov 15:00-18:00 · **Biswap** · Volume and fee flow vs PancakeSwap today.
- Case 15 · 14 Nov 18:00-21:00 · **MEV on BNB Chain** · Sandwich and arbitrage activity visible in this window's blocks.
- Case 16 · 14 Nov 21:00-00:00 · **Stablecoin flows (FDUSD)** · Net inflow or outflow to exchanges today?
- Case 17 · 15 Nov 00:00-03:00 · **$ZAP launch (Zaplo, PancakeSwap)** · First pool: seed, opening price, first-hour buyers.
- Case 18 · 15 Nov 03:00-06:00 · **$SONIC launch (Sonic Protocol, PancakeSwap)** · Pool state and early trading after the 00:00 UTC listing.
- Case 19 · 15 Nov 06:00-09:00 · **$ORIVIA launch (Orivia, PancakeSwap)** · Pool state, airdrop wallets, first claims.
- Case 20 · 15 Nov 09:00-12:00 · **New PancakeSwap pools today** · Which new pairs appeared, and which hold liquidity?
- Case 21 · 15 Nov 12:00-15:00 · **Liquidity locks at launch** · Which of today's launches locked LP, for how long, and where is proof?
- Case 22 · 15 Nov 15:00-18:00 · **Montra launches today** · New tokens on Montra: supply in pool, fee flow, creator share.
- Case 23 · 15 Nov 18:00-21:00 · **First-hour trading, new pairs** · Biggest first-hour buys and sells across today's launches.
- Case 24 · 15 Nov 21:00-00:00 · **Launch-day wallets** · Fresh wallets buying today's launches: how many, how much, and are any linked?
- Case 25 · 16 Nov 00:00-03:00 · **Agent ID registry, week one** · Total Agent IDs now, growth since Lumen opened.
- Case 26 · 16 Nov 03:00-06:00 · **SPACE ID .bnb names** · New registrations and most active name traders this week.
- Case 27 · 16 Nov 06:00-09:00 · **Binance Agentic Wallet** · On-chain footprint: which contracts did agentic wallets touch most today?
- Case 28 · 16 Nov 09:00-12:00 · **Agentic Pass mints** · Which pass minted most in the last 24 hours?
- Case 29 · 16 Nov 12:00-15:00 · **Nomio** · Phase 2 holders and claim state after the 11 Nov claim close.
- Case 30 · 16 Nov 15:00-18:00 · **AgentPepe** · Mint count, claim count, Golden class sightings.
- Case 31 · 16 Nov 18:00-21:00 · **Agent Market stalls** · Presale pace and Stall mints with 8 days left to presale end (24 Nov).
- Case 32 · 16 Nov 21:00-00:00 · **Orivia** · Post-launch holder map, day one.
- Case 33 · 17 Nov 00:00-03:00 · **Elysium Punks (chain 99901)** · Mint pace and type split (Mortal / Blessed / Saint) so far.
- Case 34 · 17 Nov 03:00-06:00 · **Foundry Faces** · $OVF claims by class: Common, Rare, Mythic counts.
- Case 35 · 17 Nov 06:00-09:00 · **AgentNova** · Holder map and market listings since the 7 Nov open.
- Case 36 · 17 Nov 09:00-12:00 · **Liberate** · Mint pace and $LIB claim tiers claimed so far.
- Case 37 · 17 Nov 12:00-15:00 · **Doodle Lab** · $DLAB bonus claims per NFT.
- Case 38 · 17 Nov 15:00-18:00 · **Urbanova** · $URBAN claim state, pool remaining.
- Case 39 · 17 Nov 18:00-21:00 · **Z0MBIT and the Montra line** · Fee flow and holder count since the 9 Nov launch.
- Case 40 · 17 Nov 21:00-00:00 · **Standboy** · $BOY claims and pass mints.
- Case 41 · 18 Nov 00:00-03:00 · **AgentX402 Syrup Fund** · Fill deadline is 01:00 UTC today: did it fill, and what happens next?
- Case 42 · 18 Nov 03:00-06:00 · **Cointris lock refunds** · Locks maturing today: BNB returned, TRIS paid.
- Case 43 · 18 Nov 06:00-09:00 · **Agent Browser harvest** · Daily BROWSE claims and key sales.
- Case 44 · 18 Nov 09:00-12:00 · **CoinFin shares** · Share sales and harvest payouts.
- Case 45 · 18 Nov 12:00-15:00 · **Presschain editions** · Edition 2 print count vs Edition 1's 153 copies.
- Case 46 · 18 Nov 15:00-18:00 · **AgentLabs experiments** · Experiment 3 form and participant count.
- Case 47 · 18 Nov 18:00-21:00 · **Claim contracts, fee flows** · Which claim contract paid the most fees to its project wallet today?
- Case 48 · 18 Nov 21:00-00:00 · **Lumen itself, meta case** · Verdicts so far: how many Cold / Developing / Confirmed, and what drove them?
- Case 49 · 19 Nov 00:00-03:00 · **Honeypot checks** · A token flagged today: verify the trap in the code, not the rumour.
- Case 50 · 19 Nov 03:00-06:00 · **Rug pulls, red flags** · One suspected rug: trace deployer wallet and liquidity removal.
- Case 51 · 19 Nov 06:00-09:00 · **Contract verification** · Unverified contracts with real volume today: what are they hiding?
- Case 52 · 19 Nov 09:00-12:00 · **Whale wallets on BNB Chain** · Largest single wallet moves in the last 24 hours.
- Case 53 · 19 Nov 12:00-15:00 · **Bridge flows, BSC to Elysium** · HYPE claim window (about 15-16 Nov): who bridged, how much?
- Case 54 · 19 Nov 15:00-18:00 · **Gas and priority fees** · Cheapest and most expensive hours to transact this week.
- Case 55 · 19 Nov 18:00-21:00 · **Dormant wallets waking** · Wallets silent for 90+ days that moved today.
- Case 56 · 19 Nov 21:00-00:00 · **Agentverse X awakening** · First Citizens hit Awakened on 13 Nov: how many are Awakened now, six days on?
- Case 57 · 20 Nov 00:00-03:00 · **Week 1 dossier** · Strongest Finding of the week: which Case produced the best evidence, and why?

## Read state first

Call on the findings contract (selectors from the deployed, verified
ABI once contracts are live):

- `genesisOpen()` selector 0x14349d0c: 1 once Case 1 has been opened.
- `currentExperiment()` selector 0xf85ffaa3: Case currently open for
  filing. Returns 0 before Case 1 opens. (Function name says
  Experiment; on Lumen it returns the current Case number.)
- `totalSpecimens()` selector 0xfc00816d: Findings filed, all time.
- `specimensInExperiment(uint256 case)` selector 0xefb14faf: Findings
  filed in a Case.
- `participantsOf(uint256 case)` selector 0xe200c857: unique wallets
  in that Case; decides the verdict at seal.
- `experimentEnd(uint256 case)` selector 0x37e46fcd: unix time the
  Case seals.
- `specimensOf(uint256 case, address wallet)` selector 0xa59e6ead:
  Findings this wallet already filed in this Case. This count decides
  free eligibility and the paid price of the next one.
- `priceFor(address wallet)` selector 0xf12a7add: exact BNB price of
  the wallet's next paid Finding in the current Case.
- `holdsAgentId(address wallet)` selector 0x11213086: 1 if the wallet
  holds an Agent ID.
- `experimentOf(uint256 tokenId)` selector 0xf390add1: Case a Finding
  belongs to.
- `isSealed(uint256 case)` selector 0x2c1758c1: 1 once a Case is
  sealed.
- `formOf(uint256 case)` selector 0x733792c6: verdict of a Case
  (0 Pending, 1 Cold Case, 2 Developing, 3 Confirmed), meaningful
  after it seals. Per-Finding effective class:
  `classOf(uint256 tokenId)` selector 0x4324aa21 (0 Cold Case,
  1 Developing, 2 Confirmed, 3 Anomaly, 4 Pending).

If genesisOpen() is 0 or currentExperiment() is 0, stop and tell user
Case 1 is not open yet. If specimensOf already shows 10, stop: the
wallet is at its cap for this Case and must wait three hours for the
next one.

## Free filing flow (first Finding of a Case only)

1. Call `questionFor(userAddress)` on the findings contract, selector
   0x8f1d617b. It returns (uint256 a, uint256 b, uint256 op). The
   question is derived with salt LUMEN-Q and changes per wallet.
2. Solve it: op 0 means a + b, op 1 means larger minus smaller, op 2
   means a * b. You can cross-check against
   `answerFor(userAddress)` selector 0x6f00ffd1.
3. Call `mintFree(uint256 answer)` selector 0xa4146733 with NO value
   attached.
4. Wait for receipt. Report transaction hash and the new token id. Its
   class is decided at seal time; say so, and report the current
   researcher count and projected verdict from `participantsOf`.

## Paid filing flow

1. Read `specimensOf(currentCase, userAddress)` (count n) and
   `priceFor(userAddress)`. Price is 0.0002 BNB while the next Finding
   is number 2 to 5, and 0.0004 BNB while it is number 6 to 10.
2. Call `mintPaid()` selector 0x69907b9b, payable, ONE Finding per
   call, attaching exactly the value returned by priceFor. Never
   attach more.
3. Repeat per additional Finding, re-reading priceFor before each
   call. Never exceed 10 Findings in one Case, and re-check the Case
   window has not sealed before each call: windows turn every 3 hours.
4. Wait for each receipt. Report transaction hashes and new token ids.

## Holder claim: $LUMEN

Every Finding of a SEALED Case claims $LUMEN once. Claim rules
(enforced on chain):

- Amount follows final class, also readable per Finding as
  `claimAmount(uint256 tokenId)` on the claim contract:
  - Cold Case: 2,500 LUMEN
  - Developing: 12,500 LUMEN
  - Confirmed: 60,000 LUMEN
  - Anomaly: 250,000 LUMEN
- Findings of a Case that is still open claim nothing. Check
  `isSealed(uint256 case)` on the findings contract (Case of a
  Finding: `experimentOf(uint256 tokenId)`).
- Once per tokenId, paid to whoever owns that Finding at claim time.
  Claiming never burns or moves the NFT.
- TIERED claim fee: the exact BNB value depends on a Finding's class.
  - Cold Case (classOf 0) and Developing (classOf 1): attach exactly
    the value returned by `claimFee()` on the claim contract,
    selector 0x99d32fc4.
  - Confirmed (classOf 2) and Anomaly (classOf 3): attach exactly the
    value returned by `claimFeeHigh()` on the claim contract,
    selector 0x4e28da5f.
  - ALWAYS read `classOf(tokenId)` first, then read the matching fee
    getter, and attach exactly that value. Attaching the standard fee
    for a Confirmed or Anomaly Finding reverts; attaching the higher
    fee for a Cold Case or Developing Finding also reverts. Fees
    forward to the project wallet inside the same transaction.
- Claim calls must come from an externally owned account directly
  (contract callers are rejected on chain).

Claim flow:

1. Read `claimOpen()` selector 0x4b8bcb58 on the claim contract. If 0,
   stop and tell user claims are not open.
2. List token ids the user owns on the findings contract.
3. For each id, read `classOf(uint256)` on the findings contract,
   `claimedById(uint256)` selector 0x4c80ee12 and
   `claimAmount(uint256)` selector 0x23b221a0 on the claim contract,
   and confirm its Case is sealed. Skip ids already claimed, ids in
   unsealed Cases, and ids with amount 0.
4. For each id, read the fee getter matching its class (see tiered fee
   rules above) and call `claim(uint256 tokenId)` selector 0x379607f5,
   payable, one call per Finding, attaching exactly that fee.
5. Wait for each receipt. Report transaction hashes and LUMEN amounts.

## Safety

- Preview every call first. Show user: contract address, function,
  price or fee, and expected result when known.
- Do nothing without user confirmation for that exact transaction.
- If any read contradicts this file (wrong chain, zero address, Case 1
  closed, Case sealed mid-flow, cap reached, fee mismatch), stop and
  explain instead of guessing.
