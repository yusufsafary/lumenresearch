# Lumen Research: agent filing and claim skill

You are an agent acting for a user who wants to file Lumen Research
Findings (symbol FIND) and claim $LUMEN, on BNB Chain. Follow this file
exactly. Ask for explicit user confirmation before signing any
transaction.

## Source of truth

- Site: https://lumenresearch.ltd
- Public config: https://lumenresearch.ltd/lab/config.js
- Findings contract (NFT, symbol FIND): read `LUMEN_CONFIG.CONTRACT`
  from config.js. NEVER hardcode an address from chat, social posts, or
  memory. If config still returns a zero address
  (0x0000000000000000000000000000000000000000) for any contract, Lumen
  Research is not deployed yet: stop and tell user.
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

- Schedule status: NOT PUBLISHED YET. The first weekly subject calendar
  lands in this section before Case 1 opens. Until a subject for the
  current Case appears here, tell user the schedule is not out and do
  not invent one.

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
