"""Evidence authentication and independent validator verification."""
import json

import pytest

from tests.direct.conftest import (EVIDENCE_URL, EVIDENCE_BODY, sha, llm_reply, to_disputed,
                                   to_submitted, evidence_json, make_agreement, REWARD)

ADJ = "neutral adjudicator"


def mock_ok(vm, body=EVIDENCE_BODY, verdict="fulfilled", bps=10000):
    vm.mock_web(EVIDENCE_URL, {"method": "GET", "status": 200, "body": body})
    vm.mock_llm(ADJ, llm_reply(verdict, bps))


def verdict_of(c, aid):
    return json.loads(c.get_verdict(aid))


def test_evidence_must_be_digest_bound(direct_vm, chain, world, direct_alice, direct_bob):
    aid = make_agreement(direct_vm, world, direct_alice, direct_bob)
    chain.pay(world, direct_alice, "fund_agreement", REWARD, aid)
    direct_vm.sender = direct_bob
    world.accept_agreement(aid)
    for bad in ('[{"url": "https://x.example/a"}]',
                '[{"url": "https://x.example/a", "content_hash": "abc"}]',
                '[{"content_hash": "' + sha("x") + '"}]', "[]"):
        with direct_vm.expect_revert():
            world.submit_deliverables(aid, bad)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("only_worker_may_submit"):
        world.submit_deliverables(aid, evidence_json())


def test_inline_content_digest_computed_on_chain(direct_vm, chain, world, direct_alice, direct_bob):
    aid = make_agreement(direct_vm, world, direct_alice, direct_bob)
    chain.pay(world, direct_alice, "fund_agreement", REWARD, aid)
    direct_vm.sender = direct_bob
    world.accept_agreement(aid)
    with direct_vm.expect_revert("inline_content_hash_mismatch"):
        world.submit_deliverables(aid, json.dumps([{"inline_content": "hello", "content_hash": sha("other")}]))
    world.submit_deliverables(aid, json.dumps([{"inline_content": "hello"}]))
    ev = json.loads(world.get_evidence(aid))
    assert ev[0]["content_hash"] == sha("hello") and ev[0]["agreement_id"] == aid
    assert ev[0]["submitted_by"].lower() == "0x" + bytes(direct_vm._to_bytes(direct_bob)).hex()


def test_verdict_uses_authenticated_snapshot(direct_vm, chain, world, direct_alice, direct_bob):
    aid = to_disputed(direct_vm, chain, world, direct_alice, direct_bob)
    mock_ok(direct_vm, verdict="mostly_fulfilled", bps=8000)
    direct_vm.sender = direct_alice
    world.request_verdict(aid)
    v = verdict_of(world, aid)
    assert v["verdict"] == "mostly_fulfilled" and v["payout_bps_to_worker"] == 8000
    assert v["verified_ids"] == ["EV-0001"] and v["unverified"] == []
    assert v["snapshot"] == sha(json.dumps([["EV-0001", sha(EVIDENCE_BODY)]]))
    assert v["terms_hash"] == json.loads(world.get_agreement(aid))["terms_hash"]
    assert json.loads(world.get_agreement(aid))["status"] == "resolved"
    assert chain.messages == []  # adjudication moves no funds


def test_altered_evidence_never_reaches_llm_and_is_inconclusive(direct_vm, chain, world, direct_alice, direct_bob):
    aid = to_disputed(direct_vm, chain, world, direct_alice, direct_bob)
    # page changed after the digest was committed; no LLM mock => any LLM call would error
    direct_vm.mock_web(EVIDENCE_URL, {"method": "GET", "status": 200, "body": EVIDENCE_BODY + " tampered"})
    direct_vm.sender = direct_bob
    world.request_verdict(aid)
    v = verdict_of(world, aid)
    assert v["verdict"] == "insufficient_evidence"
    assert v["payout_bps_to_worker"] == 3000  # frozen inconclusive rule, not an invented winner
    assert v["unverified"] == [{"evidence_id": "EV-0001", "reason": "hash_mismatch"}]


def test_unavailable_evidence_is_inconclusive(direct_vm, chain, world, direct_alice, direct_bob):
    aid = to_disputed(direct_vm, chain, world, direct_alice, direct_bob)
    direct_vm.mock_web(EVIDENCE_URL, {"method": "GET", "status": 404, "body": "nope"})
    direct_vm.sender = direct_alice
    world.request_verdict(aid)
    v = verdict_of(world, aid)
    assert v["verdict"] == "insufficient_evidence"
    assert v["unverified"][0]["reason"] == "http_status_404"


def test_payout_is_bound_to_verdict_band(direct_vm, chain, world, direct_alice, direct_bob):
    aid = to_disputed(direct_vm, chain, world, direct_alice, direct_bob)
    mock_ok(direct_vm, verdict="not_fulfilled", bps=9000)  # LLM label contradicts number
    direct_vm.sender = direct_alice
    world.request_verdict(aid)
    assert verdict_of(world, aid)["payout_bps_to_worker"] == 0  # clamped into band


@pytest.mark.parametrize("reply", [
    json.dumps({"verdict": "winner_takes_all", "payout_bps_to_worker": 10000}),
    json.dumps({"verdict": "fulfilled", "payout_bps_to_worker": "lots"}),
    json.dumps(["not", "an", "object"]),
])
def test_malformed_llm_output_cannot_produce_verdict(direct_vm, chain, world, direct_alice, direct_bob, reply):
    aid = to_disputed(direct_vm, chain, world, direct_alice, direct_bob)
    direct_vm.mock_web(EVIDENCE_URL, {"method": "GET", "status": 200, "body": EVIDENCE_BODY})
    direct_vm.mock_llm(ADJ, reply)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert():
        world.request_verdict(aid)
    assert json.loads(world.get_agreement(aid))["status"] == "disputed"
    assert world.get_verdict(aid) == "null"


def test_only_parties_request_and_only_when_disputed(direct_vm, chain, world, direct_alice, direct_bob, direct_charlie):
    aid = to_submitted(direct_vm, chain, world, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("expected_disputed_or_appealed"):
        world.request_verdict(aid)
    world.open_dispute(aid, "bad", "[]", "[]", "[]", "refund", "high")
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("only_a_party_may_request"):
        world.request_verdict(aid)


# ---- validators ------------------------------------------------------------

@pytest.fixture
def adjudicated(direct_vm, chain, world, direct_alice, direct_bob):
    aid = to_disputed(direct_vm, chain, world, direct_alice, direct_bob)
    mock_ok(direct_vm, verdict="fulfilled", bps=10000)
    direct_vm.sender = direct_alice
    world.request_verdict(aid)
    return aid, world.get_verdict(aid)


def test_validator_accepts_matching_independent_verdict(direct_vm, adjudicated):
    _, out = adjudicated
    direct_vm.clear_mocks()
    direct_vm.mock_web(EVIDENCE_URL, {"method": "GET", "status": 200, "body": EVIDENCE_BODY})
    direct_vm.mock_llm(ADJ, llm_reply("fulfilled", 10000))  # independent run reaches the same verdict
    assert direct_vm.run_validator(leader_result=out) is True


def test_validator_rejects_verdict_contradicting_its_own_judgment(direct_vm, adjudicated):
    _, out = adjudicated
    direct_vm.clear_mocks()
    direct_vm.mock_web(EVIDENCE_URL, {"method": "GET", "status": 200, "body": EVIDENCE_BODY})
    direct_vm.mock_llm(ADJ, llm_reply("not_fulfilled", 0))
    assert direct_vm.run_validator(leader_result=out) is False


def test_validator_rejects_when_it_sees_different_evidence(direct_vm, adjudicated):
    _, out = adjudicated
    direct_vm.clear_mocks()
    direct_vm.mock_web(EVIDENCE_URL, {"method": "GET", "status": 200, "body": "something else entirely"})
    # validator's authenticated snapshot is empty -> differs from the leader's -> disagree
    assert direct_vm.run_validator(leader_result=out) is False


def test_validator_rejects_forged_snapshot_or_terms(direct_vm, adjudicated):
    _, out = adjudicated
    direct_vm.clear_mocks()
    direct_vm.mock_web(EVIDENCE_URL, {"method": "GET", "status": 200, "body": EVIDENCE_BODY})
    direct_vm.mock_llm(ADJ, llm_reply("fulfilled", 10000))
    for field in ("snapshot", "terms_hash"):
        forged = json.loads(out)
        forged[field] = "0" * 64
        assert direct_vm.run_validator(leader_result=json.dumps(forged)) is False


def test_validator_rejects_out_of_band_or_unknown_verdict(direct_vm, adjudicated):
    _, out = adjudicated
    bad = json.loads(out)
    bad.update(verdict="not_fulfilled", payout_bps_to_worker=10000)
    assert direct_vm.run_validator(leader_result=json.dumps(bad)) is False
    bad.update(verdict="gift", payout_bps_to_worker=10000)
    assert direct_vm.run_validator(leader_result=json.dumps(bad)) is False


def test_validator_gives_leader_error_no_free_pass(direct_vm, adjudicated):
    assert direct_vm.run_validator(leader_error=Exception("boom")) is False
