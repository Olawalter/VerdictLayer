# VerdictLayer — Steward Remediation

## Steward Request

> We cannot accept this submission because the claimed escrow and automatic settlement only record notional amounts; the contract never custodies or transfers assets, and validators do not verify the evidence content used to determine the payout. Please implement an enforceable funding and payout path and make every validator adjudicate the same authenticated evidence before resubmitting.

The diagnosis was correct. In the previous `contract/verdict_layer.py`:

- `fund_agreement(agreement_id, amount, currency)` stored a caller-supplied number. It was not payable, so no GEN ever entered the contract.
- `apply_verdict` computed `worker_amount` / `client_amount` and stored them. Nothing was transferred.
- The leader fetched evidence URLs but validators did not (`"no URL fetching"`). A validator whose own LLM call failed returned `True`, and so did any validator facing a leader error. Agreement was a payout-percentage check within 25 points, so validators were not judging the same evidence.

All three are changed in the contract itself. Nothing below is a UI-only or ledger-only change. The corrected contract **is deployed on GenLayer Studio (studionet): `0xD6d60c1dB4064b9EdD7fb70dc893d5B1c0284c2B`** (deploy tx `0xa802e1c5c15df5daf2780346d4ecdbf62c153a7a47ad9821593e1806e81164cd`). A full funding → adjudication → settlement run against it is in section 4 and `evidence/walkthrough-4-final.log`, including the worker's balance read with `eth_getBalance`. Studionet is a development network; see Remaining Limitations for what it could not prove.

## 1. Enforceable Funding and Custody

**Mechanism** — [contract/verdict_layer.py](contract/verdict_layer.py)

- `fund_agreement(agreement_id)` and `appeal_verdict(agreement_id, grounds)` are `@gl.public.write.payable`. The deposit is taken from `gl.message.value` and **no amount argument exists**.
- The required amount is frozen at `create_agreement` (`required_reward`, `appeal_bond`, `inconclusive_worker_bps`) and committed in `terms_hash`, a sha256 of the canonical terms. There is no setter, so terms cannot change after funding.
- Funding requires `value == required_reward` exactly. **Refused deposits do not revert.** The first live run showed that on studionet a reverted payable call leaves its value in the contract with no ledger entry. So a refused `fund_agreement` / `appeal_verdict` that carries value (wrong amount, non-client, wrong status, duplicate, closed window) is parked in `credits[sender]` / `credit_total` and returned as `"credited:<reason>"`. The sender recovers it with `withdraw_credit()`, which goes through the same finalized-transfer path. Zero-value refusals still revert normally. The UI therefore judges success from contract state, not transaction status.
- `Agreement` stores `required_reward` (the promise) separately from `reward_deposited` / `bond_deposited` (what was actually received), plus `funder`.
- `accept_agreement` additionally checks `reward_deposited == required_reward`. An unfunded agreement cannot leave `draft`, so it cannot reach adjudication or settlement.
- Contract-wide counters `held_total` (deposits not yet released), `pending_total` (transfers queued, not confirmed) and `credit_total` (parked refused deposits) are reconciled against the real `self.balance`. `get_custody()` returns all of them plus `solvent` (`balance >= held_total + credit_total`).
- All money uses `u256`; payout math is integer basis points.
- No `__receive__` is defined, so GEN cannot be sent to the contract outside these methods.

**Tests** — [tests/direct/test_custody.py](tests/direct/test_custody.py)
`test_fund_requires_exact_value_and_moves_real_balance`, `test_only_client_funds_and_no_double_funding`, `test_unfunded_agreement_cannot_progress_or_settle`, `test_non_payable_methods_reject_value`, `test_create_rejects_bad_terms`.

*Caveat:* the direct VM does not move balances itself. [tests/direct/conftest.py](tests/direct/conftest.py) (`Chain.pay`) plays the chain's role by crediting `msg.value` to the contract after a successful call. These tests prove the contract's accounting and its exact-value gate. They do **not** prove the live chain's balance movement, which needs the manual steps in section 5.

## 2. Actual Settlement and Payouts

**Transfer interface.** The SDK's EVM-style plain send: `_Recipient(to).emit_transfer(value=u256(amount), on="finalized")`, where `_Recipient` is a `gl.evm.contract_interface` stub. The SDK recommends `finalized` over `accepted` for value. `VerdictLayer._pay` is the only place in the contract that moves GEN.

**Why the EVM send (found live, fix taken from the sibling `inquest` project).** My first live run used `gl.get_contract_at(to).emit_transfer(...)`. The contract's balance dropped, but the worker's account stayed at 0: a normal contract message must reach a *contract*, so on Studio a payout to an ordinary account ends in a GenVM "Contract not found" error. The EVM plain send credits any address without a GenVM run. The final run (section 4) reads the worker's balance rising by exactly the reward.

**Lifecycle** — `resolved → settlement_pending → settled`
1. `settle(agreement_id)` is permissionless, but recipients come only from stored state (`client`, `worker`, `appellant`). It requires status `resolved`, and the appeal window closed if the verdict is appealable.
2. It checks `balance >= held_total + credit_total` (queued transfers may or may not have left yet, so they are not required; a stricter check I first wrote failed live, see section 4), computes `worker = reward * bps // 10000`, `client = reward - worker`, adds any appeal bond to its rightful party, and asserts the parts sum exactly to the deposit.
3. **Effects before interactions:** it zeroes `reward_deposited` / `bond_deposited`, moves the sum from `held_total` to `pending_total`, sets `settlement_pending`, and only then emits up to two `finalized` transfers. Transfers leave only when that transaction finalizes, so a verdict that has only been *accepted* never moves funds.
4. `settle` on a non-`resolved` agreement reverts, so settlement cannot run twice.
5. `confirm_settlements()` marks queued agreements `settled` only when `balance <= held_total + credit_total`, i.e. the contract's real balance proves the transfers left. Until then the state stays `settlement_pending`. (Seen live: it correctly refused while a surplus was stranded, and succeeded once the balance fell.)

**Every exit path goes through `settle`** (verdict, client approval, review-window lapse, `cancel_agreement`, `decline_agreement`, `reclaim_expired`, mutual `propose_settlement` + `accept_settlement`, post-appeal). Each calls `_resolve(bps, source, appealable)`, which writes only an outcome. There are no administrator withdrawals.

**Failed transfers (also from `inquest`).** If the protocol cannot deliver a finalized transfer it hands the value back through `__on_errored_message__`. The contract records it against the recipient it could not reach (`failed_payments`, `failed_total`, removed from `pending_total`). That recipient, and nobody else, can send it to any address with `recover_failed_payment(to)`; the ledger is cleared before the transfer is emitted, so it can be recovered once. The contract never resends on its own, because it cannot tell a delayed transfer from a failed one. A transfer that neither lands nor is handed back leaves the agreement `settlement_pending`, visible in `get_custody`, rather than falsely `settled`.

**Tests** — [tests/direct/test_settlement.py](tests/direct/test_settlement.py)
Partial award with exact amounts and `finalized` messages, pending vs. settled, second `settle` rejected, odd-reward integer arithmetic (`w + c == deposit`), approval, review-window lapse, cancel / decline / expiry refunds, mutual settlement authorization and mismatch, appeal-bond returned vs. forfeited, appeal window, and conservation across several agreements. Roles use separate client, worker and stranger addresses. A stranger calling `settle` pays only the stored recipients.

## 3. Authenticated Evidence and Independent Validator Verification

**Binding and freezing**
- Each evidence item stores `agreement_id`, `submitted_by`, `url`, a 64-hex sha256 `content_hash`, and an optional `inline_content`. For inline content the contract computes the digest itself and rejects a mismatched one. URL items must supply a valid digest.
- Items are append-only; there is no edit path. Evidence can only be added in `accepted` (worker) and `disputed` (worker response). Once `request_verdict` is accepted the agreement is `resolved`, so the set is fixed.
- A URL alone is not trusted. At adjudication each node re-fetches the URL (`gl.nondet.web.get`), requires HTTP 200, size ≤ 64 KiB, and `sha256(body) == content_hash`. Otherwise the item is excluded and its reason recorded (`hash_mismatch`, `http_status_*`, `fetch_failed`, `content_too_large`).
- The snapshot digest is `sha256` of the sorted `[evidence_id, content_hash]` list of items that authenticated. It is stored in the verdict with `terms_hash`.

**Leader / validator pattern** (`gl.vm.run_nondet(leader_fn, validator_fn)`, the linter-compliant custom pattern)
- The leader and each validator run the **same** `leader_fn` over the same frozen terms, dispute text, worker response and evidence list. A validator therefore authenticates the evidence itself rather than trusting the leader's summary.
- A validator agrees only if all of these hold:
  1. `terms_hash` matches;
  2. its authenticated `snapshot` and `verified_ids` equal the leader's;
  3. the leader's verdict label is supported and the payout lies in that label's band;
  4. its own independent payout is within 1500 bps of the leader's.
- A leader error returns `False`, never a free pass (the old code returned `True`). Malformed or unsupported LLM output raises and produces no verdict.
- After consensus the contract re-checks `terms_hash`, the label and the band before it stores anything.
- If no evidence authenticates, no LLM call is made. The verdict is `insufficient_evidence` and the frozen `inconclusive_worker_bps` applies, so no winner is invented.
- Nothing in the nondeterministic callbacks transfers or writes economic state. `request_verdict` only records an outcome; funds move only in a later `settle`.
- The payout is not freely chosen by the LLM. Each verdict label has a fixed band (`VERDICT_BANDS`, for example `fulfilled` is 10000 and `not_fulfilled` is 0), and the numeric payout is clamped into it.

**Tests** — [tests/direct/test_adjudication.py](tests/direct/test_adjudication.py)
Digest-required evidence; inline digest computed on-chain; verified-snapshot provenance; tampered page, 404 and `insufficient_evidence` with **no LLM call** (the test has no LLM mock, so any call would error); band clamping; malformed LLM outputs; party and status gating; and validators that:
- accept an independent matching verdict;
- reject a verdict contradicting their own judgment;
- reject when they authenticate different evidence;
- reject a forged `snapshot` / `terms_hash`;
- reject an out-of-band or unknown verdict;
- reject a leader error.

*Caveat:* these run the real contract code with mocked web and LLM responses via `direct_vm.run_validator`. They show the contract's validator logic behaves as specified, **not** that real validators reached consensus on a live network.

## 4. Verification Results

Only commands I actually ran. All paths are under the repo root.

| Check | Result |
|---|---|
| `genvm-lint check contract/verdict_layer.py --json` | **Passed**: `{"ok":true,"lint":{"ok":true,"passed":3},"validate":{"ok":true,"methods":23,"view_methods":6,"write_methods":17}}`, with one informational note (`I200`) that a newer runner exists. The pinned runner `py-genlayer:1jb45…` is unchanged and present in the linter's GenVM bundle. |
| `pytest tests/direct/ -v` (WSL Ubuntu 24.04, Python 3.12) | **36 passed** (28.3 s), after the live-found fixes below |
| Live walkthrough on studionet, `scripts/walkthrough.mjs` | **Completed**; see below |
| `gltest tests/integration/ -v -s` | **Not run**: no GenLayer Studio / LLM provider is available here. Via `pytest`, the one test is **skipped** (`GenLayer Studio not reachable on 127.0.0.1:4000`). It is written ([tests/integration/test_escrow_flow.py](tests/integration/test_escrow_flow.py)) but unexecuted. |
| `node node_modules/typescript/bin/tsc --noEmit` | **Passed** (no errors) |
| `npm run build` (Next.js 16.2.10) | **Passed**; 11 routes generated |
| `npm run lint` | **Fails: 6 errors, 10 warnings, all in files I did not modify** (`dispute/page.tsx` unescaped quotes; set-state-in-effect in `agreements/[id]/page.tsx`, `explorer/page.tsx` and `WalletModal.tsx`; an `<a>` link in `agreements/[id]/page.tsx`). I added `.venv/**` to the ESLint ignores because it was previously scanning the Python venv. I did not fix these pre-existing errors. |
| Real on-chain funding / payout | **Not executed**: no deployment, so no transaction hashes exist to report. |

Direct tests do not run on native Windows: the harness's `os.unlink` of an open temp file raises `PermissionError` there (`gltest/direct/loader.py`). I ran them under WSL. In the direct tests, GEN crediting and message delivery are simulated by `Chain` in `conftest.py`.

## 5. Reviewer Verification Steps

Prerequisites: Node 18+, Python 3.12+, a GenLayer Studio account, and two wallets (client, worker).

```bash
# 0. static + direct checks
pip install -r requirements.txt
genvm-lint check contract/verdict_layer.py --json
pytest tests/direct/ -v                       # run under Linux/WSL
```

1. **Deploy and inspect the schema** — `PRIVATE_KEY=0x… node scripts/deploy.mjs` prints the address. Inspect the schema with `genlayer schema <address>` and confirm `fund_agreement` and `appeal_verdict` are payable. Set `NEXT_PUBLIC_VERDICTLAYER_ADDRESS=<address>`.
2. **Create** — in the app, `/agreements/new` (the escrow amount, appeal bond and inconclusive split are frozen). Or call `create_agreement` with `required_reward` in wei.
3. **Fund with real GEN** — as the client, press *Fund N GEN*. Confirm that a wrong value reverts.
4. **Verify custody** — call `get_custody`: `balance` and `held_total` should equal the reward, and `get_agreement` should show `reward_deposited == required_reward`. Cross-check the contract's balance in the explorer.
5. **Evidence** — as the worker, accept the agreement, then submit evidence with either inline content or a URL plus `sha256sum` of the exact bytes served.
6. **Adjudicate** — the client opens a dispute, then someone presses *Request Verdict*. Watch the transaction reach ACCEPTED and FINALIZED. `get_verdict` shows `snapshot`, `verified_ids`, `unverified` and `terms_hash`. To see the tamper path, change the hosted file before requesting the verdict. The item should appear under `unverified` as `hash_mismatch`.
7. **Settlement state** — `get_agreement` should show `resolved`. If a bond was frozen, wait out the 24 h appeal window, then press *Settle*. The state becomes `settlement_pending`, `reward_deposited` becomes 0 and `pending_total` is non-zero.
8. **Verify the transfer** — after the settle transaction finalizes, check the worker's and client's balances in the explorer against `settlement.worker_amount` / `client_amount`. Then press *Confirm Delivery* (`confirm_settlements`), which should move the agreement to `settled`.
9. **Second settlement is rejected** — call `settle` again. It should revert with `expected_status_resolved`.

### Live studionet walkthrough (run by me, `scripts/walkthrough.mjs`)

Contract `0xD6d60c1dB4064b9EdD7fb70dc893d5B1c0284c2B`; client/deployer `0x85F6476ca798345c5110ebF6ba02983CCD73C1F9`; worker `0x9634e3907b37ac293e53867CDd2f5891146d7a42` (throwaway keys). Reward 0.001 GEN (10^15 wei), appeal bond 0, inconclusive split 30%. Full output with complete hashes: `evidence/walkthrough-4-final.log`.

| Step | Tx (prefix) | Contract state afterwards |
|---|---|---|
| (before) `eth_getBalance` | n/a | worker 0, client 0 |
| create_agreement | `0xb713a153…` | `draft`, balance 0 |
| fund with wrong value (10^15 − 1) | `0xb48cb4cf…` | still `draft`, `reward_deposited` 0; balance and `credit_total` = 999999999999999, solvent |
| withdraw_credit | `0x8dbe51a0…` | `pending_total` 999999999999999, `credit_total` 0 |
| confirm_settlements | `0x354dd25a…` | balance 0, `pending_total` 0 (the transfer actually left) |
| fund with exact value | `0x23492234…` | `funded`, `reward_deposited` 1000000000000000, balance 1000000000000000 = `held_total` |
| accept / submit inline evidence (worker) | `0xe179fc65…`, `0xdb21d52c…` | evidence stored with on-chain sha256 `57630988…a9d6`, equal to my local sha256 of the text |
| open_dispute, request_verdict | `0x87456c86…`, `0xa1b36c1d…` | `resolved`; verdict `fulfilled`, 10000 bps, `verified_ids ["EV-0001"]`, `unverified []`, snapshot and `terms_hash` recorded; balance unchanged (adjudication moves nothing) |
| settle | `0x1eee5840…` | `settlement_pending`, `reward_deposited` 0, `held_total` 0, `pending_total` 1000000000000000 |
| second settle | `0x1d0dded4…` | state unchanged (rejected inside the contract; the tx itself shows ACCEPTED) |
| confirm_settlements | `0x7da1da72…` | **`settled`**, balance 0, all counters 0, `settlement` = worker 1000000000000000 / client 0 |
| (after) `eth_getBalance` | n/a | **worker 1000000000000000 (+10^15, exactly the reward)** |

What this shows: payable funding credits real value to the contract; the ledger comes from the received value; a wrong-value deposit does not fund the agreement and is accounted for and returnable; a finalized EVM send removes the value from the contract **and credits the worker's own account by exactly the reward**; the contract does not report `settled` until the balance shows the funds left; a second `settle` changes nothing; evidence is authenticated and recorded in the consensus verdict.

What it does **not** show: the client's balance on Studio is not informative (it funded and withdrew value from a zero balance, so Studio does not appear to debit or track the sender side). The run used inline evidence only, so the URL-fetch / hash-mismatch path and the validator-rejection paths were exercised only in direct tests. `__on_errored_message__` / `recover_failed_payment` were tested only in direct tests (simulating the protocol's hand-back), because I did not cause a real transfer failure.

### Defects the live runs found and I fixed (history in `evidence/`)

1. `evidence/walkthrough-1-found-stranded-value.log`: the wrong-value deposit was rejected but its value stayed in the contract (balance 999999999999999, no liability), so `confirm_settlements` could never complete. Fix: refused deposits are parked as credits (`withdraw_credit`).
2. `evidence/walkthrough-2-found-false-shortfall.log`: after a withdrawal had been delivered but not yet confirmed, `settle` failed a `balance >= held + pending + credits` check. Fix: `balance >= held + credits (+ failed)`; regression test `test_settle_works_after_a_delivered_but_unconfirmed_withdrawal` added. (I did not re-run the old code against that test to confirm it fails without the fix.)
3. `evidence/walkthrough-3-no-wallet-delivery.log`: everything settled and the contract balance fell to 0, but the worker's `eth_getBalance` stayed 0 because `get_contract_at(...).emit_transfer` cannot credit an ordinary account. Fix: EVM plain send, as in `inquest` (`docs/ARCHITECTURE.md`, "Paying a person"). Run 4 shows the worker credited.

### Reproducing

```bash
PRIVATE_KEY=0x… node scripts/deploy.mjs
CLIENT_PRIVATE_KEY=0x… WORKER_PRIVATE_KEY=0x… NEXT_PUBLIC_VERDICTLAYER_ADDRESS=0x… node scripts/walkthrough.mjs
genlayer schema 0xD6d60c1dB4064b9EdD7fb70dc893d5B1c0284c2B      # inspect payable methods
```

Steps 1–9 above map onto that script and the app. The app itself (browser + wallet) was **not** exercised against the deployment.

## 6. Remaining Limitations

- **Studionet only; the app is untested against it.** The contract is deployed and was driven by script, not through the browser UI or an injected wallet. The frontend defaults to the address above (`DEFAULT_CONTRACT_ADDRESS` in `src/lib/genlayer.ts`); `NEXT_PUBLIC_VERDICTLAYER_ADDRESS` is only an optional override. The old `0x42248f…D6b4` deployment predates this work and must not be used. Earlier deployments from my debugging (`0xccEcAca2…5040`, `0x1bEf1260…9431`, `0x3cC31b4F…4e758`) contain the defects described above and should be ignored.
- **Non-payable methods called with value are untested live.** If Studio keeps value on a reverted non-payable call it would be stranded; `_reject_value` reverts, and I did not test that path on-chain.
- **Now verified on studionet:** value is credited on payable calls, `emit_transfer(on="finalized")` removes it from the contract, and `self.balance` behaves as `confirm_settlements` assumes. Not verified: behaviour on a production network with real balances and finality delays.
- **`gltest` integration test unexecuted** (no local Studio). The live walkthrough script replaces it for the zero-bond path. The appeal-bond path (24 h window), URL-evidence fetching and validator rejection are covered only by direct tests.
- **Settlement confirmation is all-or-nothing.** `confirm_settlements` confirms when the contract's outstanding transfers have collectively left. A transfer that is neither delivered nor handed back via `__on_errored_message__` blocks confirmation for every queued agreement. Failed-and-returned transfers are recoverable (`recover_failed_payment`), but that path is untested on a live network and has no UI.
- **Evidence trust boundaries.** A digest proves content integrity, not truth. Evidence URLs must stay reachable and serve the identical bytes to every validator, or the item is excluded and the verdict can become `insufficient_evidence`. Client-supplied dispute links and statements are passed to the LLM as unauthenticated claims. Prompt-injection hardening is limited to fencing evidence as untrusted data. Evidence is capped at 64 KiB per item, and only the first 6,000 characters of each item reach the LLM.
- **Validator agreement is a tolerance, not exact equality.** A 1500 bps (15-point) payout tolerance plus snapshot equality was chosen for subjective judgments. Criteria findings are collected but not compared across nodes.
- **Appeal is contract-level.** It is one extra adjudication round with a bond, not GenLayer's protocol-level appeal. There is no automated protocol-appeal handling.
- **Time.** Review window, expiry and appeal window use the transaction timestamp (`gl.message_raw["datetime"]`). The deadline must be an ISO date.
- **Tooling gaps.** I did not install the `genlayerlabs/skills` plugin or the GenLayer MCP servers. I verified APIs against the SDK source in the linter's GenVM bundle, the SDK reference and the boilerplate. The `ometere123/shipbond` repo URL returned 404, so it was not consulted. The linter reports a newer runner than the one pinned; I did not upgrade it.
- **Frontend.** Demo fixtures remain, labelled DEMO. The 6 pre-existing lint errors listed above are unfixed, and `npm audit` was not run. The app and its wallet flow were not exercised in a browser during this work. Frontend dependencies were not upgraded, because the pinned Next.js 16.2.10 / React 19.2.4 build passes.

This document does not claim steward acceptance. That determination is the steward's.
