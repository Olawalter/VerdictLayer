"""Real settlement: transfers, accounting, double-payment protection, recovery paths."""
import json

from tests.direct.conftest import (REWARD, BOND, EVIDENCE_URL, EVIDENCE_BODY, llm_reply, to_disputed,
                                   to_submitted, make_agreement, warp)

LATER = "2100-01-01T00:00:00Z"


def resolve_with(vm, chain, c, alice, bob, verdict, bps):
    aid = to_disputed(vm, chain, c, alice, bob)
    vm.mock_web(EVIDENCE_URL, {"method": "GET", "status": 200, "body": EVIDENCE_BODY})
    vm.mock_llm("neutral adjudicator", llm_reply(verdict, bps))
    vm.sender = alice
    c.request_verdict(aid)
    return aid


def paid(chain, vm, who):
    key = bytes(vm._to_bytes(who))
    return sum(m["value"] for m in chain.messages if m["to"] == key)


def agreement(c, aid):
    return json.loads(c.get_agreement(aid))


def test_full_lifecycle_partial_award_real_transfers(direct_vm, chain, world, direct_alice, direct_bob, direct_charlie):
    aid = resolve_with(direct_vm, chain, world, direct_alice, direct_bob, "partially_fulfilled", 6000)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("appeal_window_open"):  # verdict is appealable: no instant payout
        world.settle(aid)
    warp(direct_vm, LATER)
    world.settle(aid)  # permissionless caller; recipients are fixed by state

    assert paid(chain, direct_vm, direct_bob) == REWARD * 6000 // 10000
    assert paid(chain, direct_vm, direct_alice) == REWARD - REWARD * 6000 // 10000
    assert paid(chain, direct_vm, direct_charlie) == 0
    assert all(m["on"] == "finalized" for m in chain.messages)
    a = agreement(world, aid)
    assert a["status"] == "settlement_pending"  # requested != completed
    assert a["reward_deposited"] == "0"
    cust = json.loads(world.get_custody())
    assert cust["held_total"] == "0" and cust["pending_total"] == str(REWARD)

    with direct_vm.expect_revert("expected_status_resolved"):  # no second settlement
        world.settle(aid)
    with direct_vm.expect_revert("transfers_not_yet_delivered"):
        world.confirm_settlements()
    assert agreement(world, aid)["status"] == "settlement_pending"

    chain.deliver()
    world.confirm_settlements()
    assert agreement(world, aid)["status"] == "settled"
    assert chain.balance() == 0
    assert chain.balance(direct_bob) == REWARD * 6000 // 10000
    assert json.loads(world.get_custody())["pending_total"] == "0"
    with direct_vm.expect_revert("nothing_queued"):
        world.confirm_settlements()


def test_inconclusive_uses_frozen_rule_not_an_invented_winner(direct_vm, chain, world, direct_alice, direct_bob):
    aid = to_disputed(direct_vm, chain, world, direct_alice, direct_bob)
    direct_vm.mock_web(EVIDENCE_URL, {"method": "GET", "status": 500, "body": ""})
    direct_vm.sender = direct_bob
    world.request_verdict(aid)
    warp(direct_vm, LATER)
    world.settle(aid)
    assert paid(chain, direct_vm, direct_bob) == REWARD * 3000 // 10000
    assert paid(chain, direct_vm, direct_alice) == REWARD * 7000 // 10000


def test_exact_integer_arithmetic_with_odd_reward(direct_vm, chain, world, direct_alice, direct_bob):
    odd = 1_000_000_000_000_000_007
    aid = make_agreement(direct_vm, world, direct_alice, direct_bob, reward=odd, bond=0)
    chain.pay(world, direct_alice, "fund_agreement", odd, aid)
    direct_vm.sender = direct_bob
    world.accept_agreement(aid)
    world.propose_settlement(aid, 3333)
    direct_vm.sender = direct_alice
    world.accept_settlement(aid, 3333)
    world.settle(aid)
    w, c = paid(chain, direct_vm, direct_bob), paid(chain, direct_vm, direct_alice)
    assert w == odd * 3333 // 10000 and w + c == odd


def test_client_approval_pays_worker_in_full_immediately(direct_vm, chain, world, direct_alice, direct_bob, direct_charlie):
    aid = to_submitted(direct_vm, chain, world, direct_alice, direct_bob)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("only_client_may_approve"):
        world.approve_delivery(aid)
    direct_vm.sender = direct_alice
    world.approve_delivery(aid)
    world.settle(aid)
    assert paid(chain, direct_vm, direct_bob) == REWARD and len(chain.messages) == 1


def test_review_window_lapse_releases_to_worker(direct_vm, chain, world, direct_alice, direct_bob):
    aid = to_submitted(direct_vm, chain, world, direct_alice, direct_bob)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("review_window_still_open"):
        world.claim_after_review_window(aid)
    warp(direct_vm, LATER)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("review_window_closed"):
        world.open_dispute(aid, "late", "[]", "[]", "[]", "r", "low")
    world.claim_after_review_window(aid)
    world.settle(aid)
    assert paid(chain, direct_vm, direct_bob) == REWARD


def test_cancel_and_decline_refund_funded_reward(direct_vm, chain, world, direct_alice, direct_bob, direct_charlie):
    a1 = make_agreement(direct_vm, world, direct_alice, direct_bob)
    chain.pay(world, direct_alice, "fund_agreement", REWARD, a1)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("only_client_may_cancel"):
        world.cancel_agreement(a1)
    direct_vm.sender = direct_alice
    world.cancel_agreement(a1)
    world.settle(a1)
    assert paid(chain, direct_vm, direct_alice) == REWARD
    chain.deliver()
    world.confirm_settlements()

    a2 = make_agreement(direct_vm, world, direct_alice, direct_bob)
    chain.pay(world, direct_alice, "fund_agreement", REWARD, a2)
    direct_vm.sender = direct_bob
    world.decline_agreement(a2)
    world.settle(a2)
    assert paid(chain, direct_vm, direct_alice) == REWARD

    a3 = make_agreement(direct_vm, world, direct_alice, direct_bob)  # unfunded draft: cancel moves nothing
    direct_vm.sender = direct_alice
    world.cancel_agreement(a3)
    assert agreement(world, a3)["status"] == "cancelled"
    with direct_vm.expect_revert("expected_status_resolved"):
        world.settle(a3)


def test_expired_agreement_recovery_is_client_only_and_time_gated(direct_vm, chain, world, direct_alice, direct_bob):
    aid = make_agreement(direct_vm, world, direct_alice, direct_bob)
    chain.pay(world, direct_alice, "fund_agreement", REWARD, aid)
    direct_vm.sender = direct_bob
    world.accept_agreement(aid)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("agreement_not_expired"):
        world.reclaim_expired(aid)
    warp(direct_vm, LATER)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("only_client_may_reclaim"):
        world.reclaim_expired(aid)
    direct_vm.sender = direct_alice
    world.reclaim_expired(aid)
    world.settle(aid)
    assert paid(chain, direct_vm, direct_alice) == REWARD


def test_mutual_settlement_needs_the_counterparty_and_matching_terms(direct_vm, chain, world, direct_alice, direct_bob, direct_charlie):
    aid = to_submitted(direct_vm, chain, world, direct_alice, direct_bob)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("only_a_party_may_propose"):
        world.propose_settlement(aid, 5000)
    direct_vm.sender = direct_alice
    world.propose_settlement(aid, 2500)
    with direct_vm.expect_revert("counterparty_must_accept"):
        world.accept_settlement(aid, 2500)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("proposal_mismatch"):
        world.accept_settlement(aid, 9000)
    world.accept_settlement(aid, 2500)
    world.settle(aid)
    assert paid(chain, direct_vm, direct_bob) == REWARD // 4


def test_appeal_bond_returned_when_outcome_changes(direct_vm, chain, world, direct_alice, direct_bob):
    aid = resolve_with(direct_vm, chain, world, direct_alice, direct_bob, "not_fulfilled", 0)
    with direct_vm.expect_revert("value_must_equal_appeal_bond"):
        chain.pay(world, direct_bob, "appeal_verdict", 0, aid, "unfair")
    chain.pay(world, direct_bob, "appeal_verdict", BOND - 1, aid, "unfair")  # parked, appeal not opened
    assert agreement(world, aid)["status"] == "resolved"
    chain.pay(world, direct_bob, "appeal_verdict", BOND, aid, "unfair")
    assert chain.balance() == REWARD + 2 * BOND - 1
    cust = json.loads(world.get_custody())
    assert cust["held_total"] == str(REWARD + BOND) and cust["credit_total"] == str(BOND - 1)
    chain.pay(world, direct_alice, "appeal_verdict", BOND, aid, "again")  # only one appeal: parked
    assert agreement(world, aid)["appeal_count"] == 1
    direct_vm.clear_mocks()
    direct_vm.mock_web(EVIDENCE_URL, {"method": "GET", "status": 200, "body": EVIDENCE_BODY})
    direct_vm.mock_llm("neutral adjudicator", llm_reply("fulfilled", 10000))
    direct_vm.sender = direct_alice
    world.request_verdict(aid)
    world.settle(aid)  # post-appeal outcome is final, no further window
    assert paid(chain, direct_vm, direct_bob) == REWARD + BOND  # reward + bond back
    assert paid(chain, direct_vm, direct_alice) == 0
    chain.deliver()
    world.confirm_settlements()  # only the parked credit remains in custody
    cust = json.loads(world.get_custody())
    assert cust["solvent"] and cust["balance"] == cust["credit_total"] == str(2 * BOND - 1)  # both refused deposits


def test_appeal_bond_forfeited_to_counterparty_when_outcome_unchanged(direct_vm, chain, world, direct_alice, direct_bob):
    aid = resolve_with(direct_vm, chain, world, direct_alice, direct_bob, "not_fulfilled", 0)
    chain.pay(world, direct_bob, "appeal_verdict", BOND, aid, "unfair")
    direct_vm.sender = direct_alice
    world.request_verdict(aid)  # same mocked verdict -> unchanged
    world.settle(aid)
    assert paid(chain, direct_vm, direct_alice) == REWARD + BOND
    assert paid(chain, direct_vm, direct_bob) == 0


def test_appeal_window_closes(direct_vm, chain, world, direct_alice, direct_bob):
    aid = resolve_with(direct_vm, chain, world, direct_alice, direct_bob, "fulfilled", 10000)
    warp(direct_vm, LATER)
    chain.pay(world, direct_bob, "appeal_verdict", BOND, aid, "late")  # parked, not applied
    assert agreement(world, aid)["status"] == "resolved" and agreement(world, aid)["bond_deposited"] == "0"
    assert json.loads(world.get_custody())["credit_total"] == str(BOND)


def test_conservation_of_funds_across_many_agreements(direct_vm, chain, world, direct_alice, direct_bob):
    ids = []
    for _ in range(3):
        aid = to_submitted(direct_vm, chain, world, direct_alice, direct_bob)
        direct_vm.sender = direct_alice
        world.approve_delivery(aid)
        ids.append(aid)
    assert chain.balance() == 3 * REWARD == int(json.loads(world.get_custody())["held_total"])
    for aid in ids:
        world.settle(aid)
    assert sum(m["value"] for m in chain.messages) == 3 * REWARD
    chain.deliver()
    world.confirm_settlements()
    assert chain.balance() == 0
    assert all(agreement(world, a)["status"] == "settled" for a in ids)
