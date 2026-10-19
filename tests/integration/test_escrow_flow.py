"""
End-to-end custody + adjudication + settlement against a live GenLayer Studio
(localnet or studionet). Requires a running node and a configured LLM provider
in the validators. Run with:  gltest tests/integration/ -v -s
"""
import hashlib
import json
import socket
import urllib.parse

import pytest
from gltest import create_account, get_contract_factory, get_default_account
from gltest.types import TransactionStatus

REWARD = 10**15  # 0.001 GEN
BOND = 10**14


def _studio_up() -> bool:
    try:
        u = urllib.parse.urlparse("http://127.0.0.1:4000")
        socket.create_connection((u.hostname, u.port), timeout=1).close()
        return True
    except OSError:
        return False


pytestmark = pytest.mark.skipif(not _studio_up(), reason="GenLayer Studio not reachable on 127.0.0.1:4000")


def test_fund_adjudicate_settle_flow():
    client = get_default_account()
    worker = create_account()
    factory = get_contract_factory("VerdictLayer")
    c = factory.deploy(args=[])

    c.create_agreement(args=[
        "Docs rewrite", "writing", "Rewrite the README", json.dumps(["README"]),
        json.dumps(["Has install section", "Has usage section"]), "2099-01-01", 3,
        "inline content only", "milestone", worker.address, REWARD, BOND, 3000,
    ]).transact(wait_transaction_status=TransactionStatus.FINALIZED)
    aid = "VL-0001"

    # Funding must be exact and must actually move GEN into the contract.
    c.fund_agreement(args=[aid]).transact(value=REWARD, wait_transaction_status=TransactionStatus.FINALIZED)
    custody = json.loads(c.get_custody().call())
    assert custody["balance"] == str(REWARD) and custody["held_total"] == str(REWARD)

    w = c.connect(worker)
    w.accept_agreement(args=[aid]).transact(wait_transaction_status=TransactionStatus.FINALIZED)
    w.submit_deliverables(args=[aid, json.dumps([{
        "evidence_type": "document", "title": "README",
        "inline_content": "## Install\npip install x\n## Usage\nx --help",
        "claimed_relevance": "both sections"}])]).transact(wait_transaction_status=TransactionStatus.FINALIZED)
    c.open_dispute(args=[aid, "Sections missing", "[]", "[]", "[]", "refund", "high"]).transact(
        wait_transaction_status=TransactionStatus.FINALIZED)

    # Leader + validators each authenticate the same evidence digest and judge independently.
    c.request_verdict(args=[aid]).transact(wait_transaction_status=TransactionStatus.FINALIZED, wait_retries=200)
    agreement = json.loads(c.get_agreement(args=[aid]).call())
    assert agreement["status"] == "resolved"
    verdict = json.loads(c.get_verdict(args=[aid]).call())
    assert verdict["verified_ids"] == ["EV-0001"] and verdict["terms_hash"] == agreement["terms_hash"]

    # settle() is gated by the 24h appeal window (APPEAL_WINDOW_SECONDS) for appealable verdicts, so the
    # payout leg is covered by tests/direct (time-warped) and by the manual walkthrough in REPLY.md.
    assert json.loads(c.get_custody().call())["held_total"] == str(REWARD)
