from spm.codeguard import SAMPLE_REPO, gate, redact, scan_files, summarize


def test_sample_repo_raises_the_expected_rules():
    findings = scan_files(SAMPLE_REPO)
    ids = {f.rule_id for f in findings}
    for expected in ("SEC-001", "SEC-004", "SEC-005", "AI-001", "AI-002", "AI-003", "AI-004", "AI-006", "AI-007", "AI-008", "AI-009", "AI-010"):
        assert expected in ids, expected


def test_readme_placeholders_are_not_findings():
    findings = scan_files([("README.md", "Set OPENAI_API_KEY=sk-... in your environment.\n")])
    assert findings == []


def test_snippets_never_carry_the_secret():
    findings = scan_files([("cfg.py", "api_key = \"sk-proj-1234567890abcdefghijklmnopqrstuvwxyz\"\n")])
    assert findings
    for f in findings:
        assert "1234567890abcdefghijklmnopqrstuvwxyz" not in f.snippet


def test_gate_fails_on_high_and_passes_on_low_only():
    high = scan_files([("m.py", "model = AutoModel.from_pretrained('x', trust_remote_code=True)\n")])
    assert gate(high) is False
    low = scan_files([("m.py", "model = 'gpt-4o:latest'\n")])
    assert gate(low) is True
    assert gate(low, fail_on="LOW") is False


def test_skips_lockfiles_and_binaries():
    findings = scan_files([
        ("node_modules/x/index.js", "api_key = \"sk-proj-1234567890abcdefghijklmnopqrstuvwxyz\"\n"),
        ("package-lock.json", "api_key = \"sk-proj-1234567890abcdefghijklmnopqrstuvwxyz\"\n"),
        ("weights.pt", "sk-proj-1234567890abcdefghijklmnopqrstuvwxyz"),
    ])
    assert findings == []


def test_summary_counts_by_severity():
    counts = summarize(scan_files(SAMPLE_REPO))
    assert counts["CRITICAL"] >= 3 and counts["HIGH"] >= 3


def test_redact_masks_long_tokens_only():
    assert "abcdefghijklmnop" not in redact("key=abcdefghijklmnopqrstuv")
    assert redact("short ok") == "short ok"
