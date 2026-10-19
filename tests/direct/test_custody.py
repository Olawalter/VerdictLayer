import json
import pytest
from tests.direct.conftest import REWARD, BOND, make_agreement


def test_fund_requires_exact_value_and_moves_real_balance(direct_vm, chain, world, direct_alice, direct_bob):
    aid = make_agreement(direct_vm, world, direct_alice, direct_bob)
    assert chain.balance() == 0

    with direct_vm.expect_revert("value_must_equal_required_reward"):  # zero value: plain revert
        chain.pay(world, direct_alice, "fund_agreement", 0, aid)
    parked = 0
    for bad in (REWARD - 1, REWARD + 1):  # carries value: must not revert, must be tracked
        chain.pay(world, direct_alice, "fund_agreement", bad, aid)
        parked += bad
    assert json.loads(world.get_agreement(aid))["status"] == "draft"
    assert json.loads(world.get_agreement(aid))["reward_deposited"] == "0"
    cust = json.loads(world.get_custody())
    assert cust["credit_total"] == str(parked) and cust["held_total"] == "0"
    assert cust["balance"] == str(parked) and cust["solvent"]  # every wei is accounted for

    chain.pay(world, direct_alice, "fund_agreement", REWARD, aid)
    a = json.loads(world.get_agreement(aid))
    assert a["status"] == "funded"
    assert a["reward_deposited"] == str(REWARD)           # ledger from msg.value
    assert chain.balance() == REWARD + parked              # real balance = escrow + parked credits
    cust = json.loads(world.get_custody())
    assert cust["held_total"] == str(REWARD) and cust["balance"] == str(REWARD + parked) and cust["solvent"]


def test_only_client_funds_and_no_double_funding(direct_vm, chain, world, direct_alice, direct_bob, direct_charlie):
    aid = make_agreement(direct_vm, world, direct_alice, direct_bob)
    for stranger in (direct_bob, direct_charlie):
        chain.pay(world, stranger, "fund_agreement", REWARD, aid)  # parked, not applied
    assert json.loads(world.get_agreement(aid))["status"] == "draft"
    chain.pay(world, direct_alice, "fund_agreement", REWARD, aid)
    chain.pay(world, direct_alice, "fund_agreement", REWARD, aid)  # duplicate: parked
    a = json.loads(world.get_agreement(aid))
    assert a["reward_deposited"] == str(REWARD) and a["status"] == "funded"
    cust = json.loads(world.get_custody())
    assert cust["held_total"] == str(REWARD) and cust["credit_total"] == str(3 * REWARD)
    assert cust["balance"] == str(4 * REWARD) and cust["solvent"]


def test_parked_value_is_withdrawable_exactly_once(direct_vm, chain, world, direct_alice, direct_bob, direct_charlie):
    aid = make_agreement(direct_vm, world, direct_alice, direct_bob)
    chain.pay(world, direct_charlie, "fund_agreement", 777, aid)  # stranger's deposit is parked
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("no_credit"):
        world.withdraw_credit()
    direct_vm.sender = direct_charlie
    world.withdraw_credit()
    assert [m["value"] for m in chain.messages] == [777]
    with direct_vm.expect_revert("no_credit"):
        world.withdraw_credit()
    with direct_vm.expect_revert("transfers_not_yet_delivered"):
        world.confirm_settlements()
    chain.deliver()
    world.confirm_settlements()
    cust = json.loads(world.get_custody())
    assert cust["balance"] == "0" and cust["credit_total"] == "0" and cust["pending_total"] == "0"


def test_unfunded_agreement_cannot_progress_or_settle(direct_vm, world, direct_alice, direct_bob):
    aid = make_agreement(direct_vm, world, direct_alice, direct_bob)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("expected_status_funded"):
        world.accept_agreement(aid)
    with direct_vm.expect_revert("expected_status_resolved"):
        world.settle(aid)


def test_non_payable_methods_reject_value(direct_vm, world, direct_alice, direct_bob):
    aid = make_agreement(direct_vm, world, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    direct_vm.value = 1
    with direct_vm.expect_revert("unexpected_value"):
        world.cancel_agreement(aid)


def test_create_rejects_bad_terms(direct_vm, world, direct_alice, direct_bob):
    with direct_vm.expect_revert("reward_must_be_positive"):
        make_agreement(direct_vm, world, direct_alice, direct_bob, reward=0)
    with direct_vm.expect_revert("worker_must_differ_from_client"):
        make_agreement(direct_vm, world, direct_alice, direct_alice)
    with direct_vm.expect_revert("invalid_inconclusive_bps"):
        make_agreement(direct_vm, world, direct_alice, direct_bob, inconclusive=10001)


def test_settle_works_after_a_delivered_but_unconfirmed_withdrawal(direct_vm, chain, world, direct_alice, direct_bob, direct_charlie):
    """Regression (found live on studionet): delivered-but-unconfirmed transfers lower the balance below held+pending."""
    stray = make_agreement(direct_vm, world, direct_alice, direct_bob)
    chain.pay(world, direct_charlie, "fund_agreement", 999, stray)  # refused, parked
    direct_vm.sender = direct_charlie
    world.withdraw_credit()
    chain.deliver()  # funds left; confirm_settlements deliberately not called yet
    aid = make_agreement(direct_vm, world, direct_alice, direct_bob)
    chain.pay(world, direct_alice, "fund_agreement", REWARD, aid)
    direct_vm.sender = direct_alice
    world.cancel_agreement(aid)
    world.settle(aid)  # must not trip a false custody_shortfall
    assert sum(m["value"] for m in chain.messages) == REWARD


def test_failed_outgoing_transfer_is_recoverable_exactly_once(direct_vm, chain, world, direct_alice, direct_bob, direct_charlie):
    """Protocol hands a failed transfer back via __on_errored_message__; only the unreachable recipient can recover it."""
    aid = make_agreement(direct_vm, world, direct_alice, direct_bob)
    chain.pay(world, direct_alice, "fund_agreement", REWARD, aid)
    direct_vm.sender = direct_alice
    world.cancel_agreement(aid)
    world.settle(aid)  # refund to alice queued
    assert chain.messages[0]["value"] == REWARD
    # the transfer fails: value never leaves the contract, and the protocol reports it for alice
    chain.messages.clear()
    direct_vm.sender = direct_alice
    direct_vm.value = REWARD
    getattr(world, "__on_errored_message__")()
    direct_vm.value = 0
    cust = json.loads(world.get_custody())
    assert cust["failed_total"] == str(REWARD) and cust["pending_total"] == "0" and cust["solvent"]

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("nothing_to_recover"):  # nobody else can claim it
        world.recover_failed_payment("0x" + bytes(direct_vm._to_bytes(direct_charlie)).hex())
    direct_vm.sender = direct_alice
    world.recover_failed_payment("0x" + bytes(direct_vm._to_bytes(direct_bob)).hex())  # to any address
    assert [m["value"] for m in chain.messages] == [REWARD]
    with direct_vm.expect_revert("nothing_to_recover"):  # and only once
        world.recover_failed_payment("0x" + bytes(direct_vm._to_bytes(direct_alice)).hex())
