"""Shared harness: models chain custody (value credit) and finalized transfer delivery.

The direct VM does not move balances itself, so these helpers play the *chain's*
role only: crediting msg.value to the contract on a payable call, and delivering
emitted `finalized` messages. All contract-side accounting is the contract's own.
"""
import hashlib
import json

import pytest

GEN = 10**18
REWARD = 5 * GEN
BOND = GEN // 2
EVIDENCE_URL = "https://evidence.example/work.txt"
EVIDENCE_BODY = "Landing page shipped. All 3 sections, responsive, WCAG AA verified."


def sha(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


class Chain:
    def __init__(self, vm):
        self.vm = vm
        self.messages = []  # PostMessage emissions, in order
        vm._gl_call_hook = self._hook

    @property
    def addr(self) -> bytes:
        return bytes(self.vm._to_bytes(self.vm._contract_address))

    def balance(self, who=None) -> int:
        key = self.addr if who is None else self.vm._to_bytes(who)
        return self.vm._balances.get(key, 0)

    def _hook(self, vm, request):
        if "EthSend" in request:  # EVM plain send: how the contract pays ordinary accounts
            m = request["EthSend"]
            self.messages.append({"to": bytes(m["address"].as_bytes), "value": int(m["value"]), "on": m.get("on", "finalized"), "method": None})
            return {"ok": None}
        if "PostMessage" in request:
            m = request["PostMessage"]
            self.messages.append({"to": bytes(m["address"].as_bytes), "value": int(m["value"]), "on": m["on"], "method": m["calldata"].get("method")})
            return {"ok": None}
        return None

    def pay(self, contract, sender, method, amount, *args):
        """Payable call: chain credits msg.value to the contract only if the call succeeds."""
        self.vm.sender = sender
        self.vm.value = amount
        before = self.balance()
        try:
            getattr(contract, method)(*args)
        finally:
            self.vm.value = 0
        self.vm.deal(self.vm._contract_address, before + amount)

    def deliver(self):
        """Protocol delivers every emitted `finalized` message."""
        for m in self.messages:
            assert m["on"] == "finalized"
            self.vm._balances[self.addr] = self.balance() - m["value"]
            self.vm._balances[m["to"]] = self.vm._balances.get(m["to"], 0) + m["value"]
        self.messages.clear()


@pytest.fixture
def chain(direct_vm):
    return Chain(direct_vm)


@pytest.fixture
def world(direct_vm, direct_deploy, chain, direct_alice, direct_bob, direct_charlie):
    """client=alice, worker=bob, stranger=charlie."""
    c = direct_deploy("contract/verdict_layer.py")
    chain.contract = c
    return c


def make_agreement(vm, c, client, worker, reward=REWARD, bond=BOND, inconclusive=3000):
    vm.sender = client
    return c.create_agreement(
        "Landing page", "design", "Build a landing page",
        json.dumps(["Landing page"]),
        json.dumps(["Has 3 sections", "Responsive", "WCAG AA"]),
        "2099-01-01", 3, "Evidence must be a hosted file", "milestone",
        "0x" + bytes(vm._to_bytes(worker)).hex(), reward, bond, inconclusive,
    )


def evidence_json(body=EVIDENCE_BODY, url=EVIDENCE_URL, digest=None):
    return json.dumps([{"evidence_type": "link", "title": "Work", "description": "d",
                        "url": url, "content_hash": digest or sha(body), "claimed_relevance": "all"}])


def to_submitted(vm, chain, c, alice, bob, body=EVIDENCE_BODY):
    aid = make_agreement(vm, c, alice, bob)
    chain.pay(c, alice, "fund_agreement", REWARD, aid)
    vm.sender = bob
    c.accept_agreement(aid)
    c.submit_deliverables(aid, evidence_json(body))
    return aid


def to_disputed(vm, chain, c, alice, bob, body=EVIDENCE_BODY):
    aid = to_submitted(vm, chain, c, alice, bob, body)
    vm.sender = alice
    c.open_dispute(aid, "Not responsive", "[]", "[]", "[]", "refund", "high")
    return aid


def llm_reply(verdict="fulfilled", bps=10000):
    return json.dumps({"verdict": verdict, "payout_bps_to_worker": bps,
                       "criteria_findings": ["met", "met", "met"], "short_reason": "ok"})


def warp(vm, iso):
    """Advance block time. The direct VM's warp() does not refresh gl.message_raw['datetime']."""
    import sys
    vm.warp(iso)
    sys.modules["genlayer.gl"].message_raw["datetime"] = iso
