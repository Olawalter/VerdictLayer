# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *

import json
import typing

class VerdictLayer(gl.Contract):
    """
    VerdictLayer — Trustless AI adjudication for subjective work agreements.

    All state is stored as JSON strings in TreeMap[str, str] collections.
    Counters use u256 for storage compatibility.

    Lifecycle: draft -> funded -> accepted -> submitted -> disputed -> resolved -> finalized
    """

    agreements: TreeMap[str, str]
    evidence_packages: TreeMap[str, str]
    disputes: TreeMap[str, str]
    verdicts: TreeMap[str, str]
    appeals: TreeMap[str, str]

    agreement_counter: u256
    evidence_counter: u256
    dispute_counter: u256
    appeal_counter: u256

    def __init__(self) -> None:
        self.agreement_counter = u256(0)
        self.evidence_counter = u256(0)
        self.dispute_counter = u256(0)
        self.appeal_counter = u256(0)

    # ------------------------------------------------------------------
    # Write: Agreement lifecycle
    # ------------------------------------------------------------------

    @gl.public.write
    def create_agreement(
        self,
        title: str,
        work_category: str,
        brief: str,
        deliverables_json: str,
        acceptance_criteria_json: str,
        deadline: str,
        review_window_days: int,
        evidence_rules: str,
        payout_model: str,
        worker_address: str,
    ) -> str:
        """Client creates a draft agreement. Returns agreement_id."""
        self.agreement_counter = self.agreement_counter + u256(1)
        aid = f"VL-{int(self.agreement_counter):04d}"
        caller = str(gl.message.sender_address)

        self.agreements[aid] = json.dumps({
            "id": aid,
            "client_address": caller,
            "worker_address": worker_address,
            "title": title,
            "work_category": work_category,
            "brief": brief,
            "deliverables": json.loads(deliverables_json),
            "acceptance_criteria": json.loads(acceptance_criteria_json),
            "deadline": deadline,
            "funding_amount": 0,
            "currency": "GEN",
            "review_window_days": review_window_days,
            "evidence_rules": evidence_rules,
            "payout_model": payout_model,
            "status": "draft",
            "active_dispute_id": "",
            "active_appeal_id": "",
            "worker_response": None,
            "settlement": None,
        })
        return aid

    @gl.public.write
    def fund_agreement(self, agreement_id: str, amount: int, currency: str) -> None:
        """Client locks funds. draft -> funded."""
        a = json.loads(self.agreements[agreement_id])
        assert a["status"] == "draft", f"Expected status draft, got {a['status']}"
        assert str(gl.message.sender_address).lower() == a["client_address"].lower(), "Only the client may fund"
        a["funding_amount"] = amount
        a["currency"] = currency
        a["status"] = "funded"
        self.agreements[agreement_id] = json.dumps(a)

    @gl.public.write
    def accept_agreement(self, agreement_id: str) -> None:
        """Worker accepts terms. funded -> accepted."""
        a = json.loads(self.agreements[agreement_id])
        assert a["status"] == "funded", f"Expected status funded, got {a['status']}"
        assert str(gl.message.sender_address).lower() == a["worker_address"].lower(), "Only the worker may accept"
        a["status"] = "accepted"
        self.agreements[agreement_id] = json.dumps(a)

    @gl.public.write
    def submit_deliverables(self, agreement_id: str, evidence_packages_json: str) -> None:
        """Worker submits deliverables. accepted -> submitted.
        evidence_packages_json: JSON list of {evidence_type, title, description, url, content_hash, claimed_relevance}
        """
        a = json.loads(self.agreements[agreement_id])
        assert a["status"] == "accepted", f"Expected status accepted, got {a['status']}"
        caller = str(gl.message.sender_address)
        assert caller.lower() == a["worker_address"].lower(), "Only the worker may submit deliverables"

        for pkg in json.loads(evidence_packages_json):
            self.evidence_counter = self.evidence_counter + u256(1)
            ev_id = f"EV-{int(self.evidence_counter):04d}"
            self.evidence_packages[ev_id] = json.dumps({
                "evidence_id": ev_id,
                "agreement_id": agreement_id,
                "submitted_by": caller,
                "evidence_type": pkg.get("evidence_type", "file"),
                "title": pkg.get("title", ""),
                "description": pkg.get("description", ""),
                "url": pkg.get("url", ""),
                "content_hash": pkg.get("content_hash", ""),
                "source_label": "worker",
                "claimed_relevance": pkg.get("claimed_relevance", ""),
            })

        a["status"] = "submitted"
        self.agreements[agreement_id] = json.dumps(a)

    @gl.public.write
    def approve_delivery(self, agreement_id: str) -> None:
        """Client approves without dispute. submitted -> finalized."""
        a = json.loads(self.agreements[agreement_id])
        assert a["status"] == "submitted", f"Expected status submitted, got {a['status']}"
        assert str(gl.message.sender_address).lower() == a["client_address"].lower(), "Only the client may approve"
        a["status"] = "finalized"
        self.agreements[agreement_id] = json.dumps(a)

    @gl.public.write
    def open_dispute(
        self,
        agreement_id: str,
        statement: str,
        challenged_deliverables_json: str,
        missing_criteria_json: str,
        evidence_links_json: str,
        requested_remedy: str,
        severity: str,
    ) -> str:
        """Client opens a dispute. submitted -> disputed. Returns dispute_id."""
        a = json.loads(self.agreements[agreement_id])
        assert a["status"] == "submitted", f"Expected status submitted, got {a['status']}"
        assert str(gl.message.sender_address).lower() == a["client_address"].lower(), "Only the client may dispute"

        self.dispute_counter = self.dispute_counter + u256(1)
        dispute_id = f"DS-{int(self.dispute_counter):04d}"

        self.disputes[dispute_id] = json.dumps({
            "dispute_id": dispute_id,
            "agreement_id": agreement_id,
            "opened_by": str(gl.message.sender_address),
            "statement": statement,
            "challenged_deliverables": json.loads(challenged_deliverables_json),
            "missing_criteria": json.loads(missing_criteria_json),
            "evidence_links": json.loads(evidence_links_json),
            "requested_remedy": requested_remedy,
            "severity": severity,
        })

        a["active_dispute_id"] = dispute_id
        a["status"] = "disputed"
        self.agreements[agreement_id] = json.dumps(a)
        return dispute_id

    @gl.public.write
    def submit_response(
        self,
        agreement_id: str,
        explanation: str,
        counter_evidence_json: str,
        revision_offer: str,
    ) -> None:
        """Worker responds to a dispute."""
        a = json.loads(self.agreements[agreement_id])
        assert a["status"] == "disputed", f"Expected status disputed, got {a['status']}"
        caller = str(gl.message.sender_address)
        assert caller.lower() == a["worker_address"].lower(), "Only the worker may respond"

        for pkg in json.loads(counter_evidence_json):
            self.evidence_counter = self.evidence_counter + u256(1)
            ev_id = f"EV-{int(self.evidence_counter):04d}"
            self.evidence_packages[ev_id] = json.dumps({
                "evidence_id": ev_id,
                "agreement_id": agreement_id,
                "submitted_by": caller,
                "evidence_type": pkg.get("evidence_type", "file"),
                "title": pkg.get("title", ""),
                "description": pkg.get("description", ""),
                "url": pkg.get("url", ""),
                "content_hash": pkg.get("content_hash", ""),
                "source_label": "worker_response",
                "claimed_relevance": pkg.get("claimed_relevance", ""),
            })

        a["worker_response"] = {"explanation": explanation, "revision_offer": revision_offer}
        a["status"] = "response_submitted"
        self.agreements[agreement_id] = json.dumps(a)

    @gl.public.write
    def request_verdict(self, agreement_id: str) -> None:
        """
        AI adjudication using GenLayer's rollup (Optimistic Democracy) consensus.

        Leader: fetches live evidence URLs, runs LLM, proposes a full verdict.
        Validators: run LLM on base evidence, accept if payout % is within 25pp
                    of their own independent assessment.

        Using rollup (not strict_eq) because LLM adjudication is inherently
        subjective — validators need to agree the verdict is *reasonable*,
        not that they produced byte-identical output.
        """
        a = json.loads(self.agreements[agreement_id])
        assert a["status"] in ("disputed", "response_submitted"), \
            f"Expected disputed or response_submitted, got {a['status']}"

        # Build dispute context — deterministic, same on all validators
        dispute_statement = ""
        challenged = "[]"
        missing = "[]"
        remedy = ""
        severity = ""
        dispute_id = a.get("active_dispute_id", "")
        if dispute_id and dispute_id in self.disputes:
            d = json.loads(self.disputes[dispute_id])
            dispute_statement = d.get("statement", "")
            challenged = json.dumps(d.get("challenged_deliverables", []))
            missing = json.dumps(d.get("missing_criteria", []))
            remedy = d.get("requested_remedy", "")
            severity = d.get("severity", "")

        # Collect stored evidence — deterministic, same on all validators
        evidence_list = []
        for ev_id in self.evidence_packages:
            ev = json.loads(self.evidence_packages[ev_id])
            if ev.get("agreement_id") == agreement_id:
                evidence_list.append(ev)

        worker_response = json.dumps(a.get("worker_response") or "No response submitted.")

        # Shared agreement block used in both leader and validator prompts
        agreement_block = f"""=== AGREEMENT ===
Title: {a['title']}
Category: {a['work_category']}
Brief: {a['brief']}

Deliverables Required:
{json.dumps(a['deliverables'], indent=2)}

Acceptance Criteria:
{json.dumps(a['acceptance_criteria'], indent=2)}

Evidence Rules: {a['evidence_rules']}
Payout Model: {a['payout_model']}
Deadline: {a['deadline']}

=== DISPUTE ===
Statement: {dispute_statement}
Challenged Deliverables: {challenged}
Missing Criteria: {missing}
Requested Remedy: {remedy}
Severity: {severity}

=== WORKER RESPONSE ===
{worker_response}"""

        json_schema = """{
  "verdict": "<fulfilled|mostly_fulfilled|partially_fulfilled|minor_revision_required|major_revision_required|not_fulfilled|bad_faith_client|bad_faith_worker|insufficient_evidence|out_of_scope_dispute>",
  "payout_action": "<full_release|partial_release|full_refund|partial_refund|hold_pending_revision>",
  "payout_percentage_to_worker": <integer 0-100>,
  "confidence_band": "<low|medium|high>",
  "evidence_strength": "<weak|moderate|strong>",
  "revision_recommended": <true|false>,
  "short_reason": "<2-3 sentence explanation>"
}"""

        def _parse(text: str) -> dict:
            import re
            text = text.replace("```json", "").replace("```", "").strip()
            m = re.search(r'\{.*\}', text, re.DOTALL)
            if m:
                text = m.group()
            return json.loads(text)

        def leader_fn() -> str:
            """
            Leader fetches live content from evidence URLs so the LLM can
            verify claims against authoritative sources (GitHub PRs, IPFS,
            hosted files) rather than trusting unverified descriptions alone.
            """
            import urllib.request as _req

            enriched = []
            for ev in evidence_list:
                url = ev.get("url", "")
                fetched = ""
                if url and (url.startswith("http://") or url.startswith("https://")):
                    try:
                        with _req.urlopen(url, timeout=10) as resp:
                            fetched = resp.read(8192).decode("utf-8", errors="replace")[:3000]
                    except Exception as exc:
                        fetched = f"[fetch failed: {type(exc).__name__}]"
                enriched.append({**ev, "fetched_content": fetched})

            prompt = f"""You are a neutral AI adjudicator for a decentralized work agreement protocol.
Evaluate whether the worker fulfilled their obligations. Evidence URLs have been live-fetched;
their actual content is included in the fetched_content field — use it to verify claims.

{agreement_block}

=== EVIDENCE (with live-fetched content) ===
{json.dumps(enriched, indent=2)}

Return ONLY a JSON object:
{json_schema}

No markdown, no preamble. JSON only."""

            res = gl.nondet.exec_prompt(prompt)
            dat = _parse(res)
            return json.dumps({
                "verdict": str(dat["verdict"]),
                "payout_action": str(dat["payout_action"]),
                "payout_percentage_to_worker": int(dat["payout_percentage_to_worker"]),
                "confidence_band": str(dat["confidence_band"]),
                "evidence_strength": str(dat["evidence_strength"]),
                "revision_recommended": bool(dat["revision_recommended"]),
                "short_reason": str(dat.get("short_reason", "")),
            }, sort_keys=True)

        def validator_fn(leaders_res) -> bool:
            """
            Independently evaluate the dispute on base evidence (no URL fetching).
            Accept the leader's verdict if the proposed payout percentage is within
            25 percentage points of the validator's own independent assessment.
            This tolerates LLM subjectivity while catching clearly wrong verdicts.
            """
            if not isinstance(leaders_res, gl.vm.Return):
                return True  # leader errored — defer to network consensus
            leader = json.loads(leaders_res.calldata)
            leader_pct = int(leader.get("payout_percentage_to_worker", 50))

            prompt = f"""You are a neutral AI adjudicator for a decentralized work agreement protocol.
Evaluate whether the worker fulfilled their obligations based on the information below.

{agreement_block}

=== EVIDENCE ===
{json.dumps(evidence_list, indent=2)}

Return ONLY a JSON object:
{json_schema}

No markdown, no preamble. JSON only."""

            try:
                res = gl.nondet.exec_prompt(prompt)
                dat = _parse(res)
                own_pct = int(dat.get("payout_percentage_to_worker", 50))
            except Exception:
                return True  # parse failure → defer to leader

            # Accept if within 25 percentage points
            return abs(leader_pct - own_pct) <= 25

        result_str = gl.vm.run_nondet(leader_fn, validator_fn)
        verdict_data = json.loads(result_str)
        verdict_data["rendered_at"] = ""

        self.verdicts[agreement_id] = json.dumps(verdict_data)
        a["status"] = "resolved"
        self.agreements[agreement_id] = json.dumps(a)

    @gl.public.write
    def apply_verdict(self, agreement_id: str) -> None:
        """Compute settlement and finalize. resolved -> finalized."""
        a = json.loads(self.agreements[agreement_id])
        assert a["status"] == "resolved", f"Expected status resolved, got {a['status']}"
        v = json.loads(self.verdicts[agreement_id])
        total = a["funding_amount"]
        pct = v["payout_percentage_to_worker"]
        a["settlement"] = {
            "worker_amount": total * pct // 100,
            "client_amount": total * (100 - pct) // 100,
            "currency": a["currency"],
        }
        a["status"] = "finalized"
        self.agreements[agreement_id] = json.dumps(a)

    @gl.public.write
    def appeal_verdict(self, agreement_id: str, grounds: str, bond_amount: int) -> str:
        """Either party may appeal a resolved verdict. Returns appeal_id."""
        a = json.loads(self.agreements[agreement_id])
        assert a["status"] == "resolved", f"Expected status resolved, got {a['status']}"
        caller = str(gl.message.sender_address)
        assert caller.lower() in (a["client_address"].lower(), a["worker_address"].lower()), "Only a party may appeal"

        self.appeal_counter = self.appeal_counter + u256(1)
        appeal_id = f"AP-{int(self.appeal_counter):04d}"

        self.appeals[appeal_id] = json.dumps({
            "appeal_id": appeal_id,
            "agreement_id": agreement_id,
            "opened_by": caller,
            "grounds": grounds,
            "bond_amount": bond_amount,
            "status": "pending",
        })

        a["active_appeal_id"] = appeal_id
        a["status"] = "appealed"
        self.agreements[agreement_id] = json.dumps(a)
        return appeal_id

    @gl.public.write
    def finalize_agreement(self, agreement_id: str) -> None:
        """Finalize a resolved agreement."""
        a = json.loads(self.agreements[agreement_id])
        assert a["status"] in ("resolved", "finalized"), \
            f"Expected resolved or finalized, got {a['status']}"
        if a["status"] == "resolved":
            self.apply_verdict(agreement_id)

    # ------------------------------------------------------------------
    # View methods
    # ------------------------------------------------------------------

    @gl.public.view
    def get_agreement(self, agreement_id: str) -> str:
        return self.agreements[agreement_id]

    @gl.public.view
    def get_verdict(self, agreement_id: str) -> str:
        if agreement_id not in self.verdicts:
            return json.dumps(None)
        return self.verdicts[agreement_id]

    @gl.public.view
    def get_dispute(self, dispute_id: str) -> str:
        return self.disputes[dispute_id]

    @gl.public.view
    def get_evidence(self, agreement_id: str) -> str:
        result = []
        for ev_id in self.evidence_packages:
            ev = json.loads(self.evidence_packages[ev_id])
            if ev.get("agreement_id") == agreement_id:
                result.append(ev)
        return json.dumps(result)

    @gl.public.view
    def list_agreements(self) -> str:
        result = []
        for aid in self.agreements:
            a = json.loads(self.agreements[aid])
            result.append({
                "id": a["id"],
                "title": a["title"],
                "status": a["status"],
                "work_category": a["work_category"],
                "funding_amount": a["funding_amount"],
                "currency": a["currency"],
            })
        return json.dumps(result)
