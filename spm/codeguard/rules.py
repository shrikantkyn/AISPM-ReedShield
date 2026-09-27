"""
Code Guardrails — the shift-left rule set.

Pure Python, no framework imports, so the same rules run inside spm-api
(`/codeguard/scan`), in the CLI (`scripts/reedshield_codeguard.py`), and in CI.

A rule matches a line of source. Findings carry a *redacted* snippet: any
secret-looking token is masked before it leaves this module, so a finding
never reproduces the credential it reports.
"""
from __future__ import annotations

import fnmatch
import re
from dataclasses import dataclass
from typing import Iterable, Iterator

SEVERITIES = ("CRITICAL", "HIGH", "MEDIUM", "LOW")

SKIP_DIRS = {"node_modules", "dist", "build", ".git", ".venv", "venv", "__pycache__", ".next", "coverage", "target", ".idea", ".vscode"}
SKIP_FILES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "Pipfile.lock", "Cargo.lock", "go.sum"}
BINARY_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".pdf", ".zip", ".gz", ".tar", ".bin", ".pt", ".pth", ".onnx", ".safetensors", ".pkl", ".h5", ".woff", ".woff2", ".ttf", ".mp4", ".mp3"}
MAX_FILE_BYTES = 1_000_000

_OUTPUT_VARS = r"(?:response|completion|llm_output|model_output|answer|generated|assistant_reply|result_text|reply)"
_INPUT_VARS = r"(?:user_input|user_message|query|request|input_text|question|message|prompt_text)"


@dataclass(frozen=True)
class Rule:
    id: str
    severity: str
    title: str
    pattern: re.Pattern
    remediation: str
    globs: tuple[str, ...] = ("*",)
    exclude_globs: tuple[str, ...] = ()
    redact: bool = False


@dataclass
class Finding:
    rule_id: str
    severity: str
    title: str
    file_path: str
    line: int
    snippet: str
    remediation: str

    def as_dict(self) -> dict:
        return {
            "rule_id": self.rule_id, "severity": self.severity, "message": self.title,
            "file_path": self.file_path, "line": self.line, "snippet": self.snippet,
            "remediation": self.remediation,
        }


RULES: tuple[Rule, ...] = (
    Rule("SEC-001", "CRITICAL", "Hardcoded provider API key",
         re.compile(r"(sk-ant-api\d{2}-[A-Za-z0-9_\-]{20,}|sk-or-v1-[a-f0-9]{20,}|sk-proj-[A-Za-z0-9_\-]{20,}|sk-[A-Za-z0-9]{32,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_\-]{30,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9\-]{10,}|tvly-[A-Za-z0-9\-]{20,}|gsk_[A-Za-z0-9]{20,})"),
         "Remove the key from source, rotate it at the provider, and read it from the environment or the secret store at runtime.",
         redact=True),
    Rule("SEC-002", "HIGH", "Secret assigned as a literal",
         re.compile(r"(?i)\b(api[_-]?key|secret[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|password|passwd|private[_-]?key)\s*[:=]\s*[\"'][^\"'\s]{8,}[\"']"),
         "Load the value from an environment variable or secret manager; never commit literal credentials.",
         exclude_globs=("*.md", "*.example", "*.sample", "*test*", "*spec*"), redact=True),
    Rule("SEC-003", "CRITICAL", "Private key material committed",
         re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
         "Delete the key from the repository and its history, rotate it, and store keys outside source control."),
    Rule("SEC-004", "HIGH", "Connection string with embedded password",
         re.compile(r"(?i)(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp|mssql)://[^:\s/]+:[^@\s/]{3,}@"),
         "Use a password-less connection string with credentials injected from the environment.",
         exclude_globs=("*.example", "*.sample", "*.md"), redact=True),
    Rule("SEC-005", "HIGH", "Environment file with values committed",
         re.compile(r"^[A-Z][A-Z0-9_]{2,}=(?!\s*$)(?!\$\{)[^\s#]{6,}"),
         "Commit only a .env.example with placeholders; keep the real .env out of the repository.",
         globs=(".env", ".env.*", "*/.env", "*/.env.*"), exclude_globs=("*.example", "*.sample", "*.template"), redact=True),
    Rule("AI-001", "CRITICAL", "Model output passed to eval/exec",
         re.compile(rf"\b(?:eval|exec)\s*\(\s*[^)]*{_OUTPUT_VARS}"),
         "Never execute model output. Parse it into a strict schema and dispatch to allow-listed functions."),
    Rule("AI-002", "CRITICAL", "Model output used to build a shell command",
         re.compile(rf"(?:subprocess\.(?:run|Popen|call|check_output)|os\.system|os\.popen|child_process\.exec)\s*\([^)]*(?:{_OUTPUT_VARS}|f[\"']|\+)"),
         "Do not build shell commands from model text. Use argument lists with validated, allow-listed values."),
    Rule("AI-003", "HIGH", "Remote code execution enabled when loading a model",
         re.compile(r"trust_remote_code\s*=\s*True"),
         "Load only vetted models with trust_remote_code=False; scan the artefact with ModelScan before use."),
    Rule("AI-004", "HIGH", "Unsafe deserialization of a model or data file",
         re.compile(r"\b(?:pickle\.load(?:s)?|torch\.load|joblib\.load|yaml\.load)\s*\((?![^)]*(?:weights_only\s*=\s*True|SafeLoader|safe_load))"),
         "Use safetensors, torch.load(weights_only=True), yaml.safe_load, and scan artefacts before loading."),
    Rule("AI-005", "MEDIUM", "TLS certificate verification disabled",
         re.compile(r"(?:verify\s*=\s*False|rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['\"]?0)"),
         "Keep certificate verification on; pin a CA bundle if a private CA is in use."),
    Rule("AI-006", "MEDIUM", "Prompt built directly from user input without a guard call",
         re.compile(rf"(?i)(?:prompt|messages|system)\w*\s*[:=+]\s*.*(?:f[\"'].*\{{\s*{_INPUT_VARS}|\+\s*{_INPUT_VARS}|\$\{{\s*{_INPUT_VARS})"),
         "Route user input through the guard model before it reaches the prompt, and keep system instructions separate from user content."),
    Rule("AI-007", "LOW", "Model reference is not pinned",
         re.compile(r"(?i)model\s*[:=]\s*[\"'][^\"']*(?::latest|-latest)[\"']"),
         "Pin the model version so behaviour changes are deliberate and reviewable."),
    Rule("AI-008", "MEDIUM", "Model output rendered as raw HTML",
         re.compile(rf"(?:dangerouslySetInnerHTML|\.innerHTML\s*=|v-html\s*=)[^\n]*{_OUTPUT_VARS}"),
         "Render model output as text or through a sanitizing markdown renderer; never as raw HTML."),
    Rule("AI-009", "MEDIUM", "Secret written to logs",
         re.compile(r"(?i)(?:print|console\.log|logger?\.(?:info|debug|warning|error))\s*\([^)]*(?:api_key|apikey|secret|password|token)\b"),
         "Log identifiers and outcomes, never credential values; redact before logging."),
    Rule("AI-010", "MEDIUM", "CORS opened to every origin",
         re.compile(r"(?:allow_origins\s*=\s*\[\s*[\"']\*[\"']\s*\]|Access-Control-Allow-Origin[\"']?\s*[:,]\s*[\"']\*|cors\(\s*\)\s*;?\s*$)"),
         "List the exact origins that may call the API."),
    Rule("AI-011", "HIGH", "Tool or function allowed to run without a server-side allow-list",
         re.compile(r"(?i)(?:tool_choice\s*[:=]\s*[\"']any[\"']|allow_all_tools\s*=\s*True|function_call\s*[:=]\s*[\"']auto[\"'].*\bexec\b)"),
         "Constrain tool calls to an explicit allow-list and validate arguments server-side before execution."),
    Rule("AI-012", "LOW", "Debug mode enabled",
         re.compile(r"(?i)(?:debug\s*=\s*True|app\.run\([^)]*debug\s*=\s*True|DEBUG\s*=\s*['\"]?(?:true|1))"),
         "Disable debug mode outside local development; it exposes stack traces and internals.",
         exclude_globs=("*test*", "*.md")),
)

_MASK = re.compile(r"(?<=[A-Za-z0-9_\-]{4})[A-Za-z0-9_\-+/=]{4,}(?=[A-Za-z0-9_\-]{0,2})")


def redact(text: str) -> str:
    """Mask the middle of any long token so a snippet never carries a usable secret."""
    def _mask(m: re.Match) -> str:
        s = m.group(0)
        return "*" * min(len(s), 12)
    out = _MASK.sub(_mask, text)
    return out[:160]


def _applies(rule: Rule, path: str) -> bool:
    name = path.replace("\\", "/")
    base = name.rsplit("/", 1)[-1]
    if not any(fnmatch.fnmatch(base, g) or fnmatch.fnmatch(name, g) for g in rule.globs):
        return False
    if any(fnmatch.fnmatch(base, g) or fnmatch.fnmatch(name, g) for g in rule.exclude_globs):
        return False
    return True


def should_scan_path(path: str) -> bool:
    parts = path.replace("\\", "/").split("/")
    if any(p in SKIP_DIRS for p in parts[:-1]):
        return False
    base = parts[-1]
    if base in SKIP_FILES:
        return False
    dot = base.rfind(".")
    if dot >= 0 and base[dot:].lower() in BINARY_SUFFIXES:
        return False
    return True


def scan_text(path: str, text: str) -> Iterator[Finding]:
    if len(text) > MAX_FILE_BYTES:
        text = text[:MAX_FILE_BYTES]
    rules = [r for r in RULES if _applies(r, path)]
    if not rules:
        return
    for lineno, line in enumerate(text.splitlines(), start=1):
        if len(line) > 2000:
            continue
        for rule in rules:
            if rule.pattern.search(line):
                snippet = redact(line.strip()) if rule.redact else line.strip()[:160]
                yield Finding(rule.id, rule.severity, rule.title, path, lineno, snippet, rule.remediation)


def scan_files(files: Iterable[tuple[str, str]]) -> list[Finding]:
    out: list[Finding] = []
    for path, text in files:
        if not should_scan_path(path):
            continue
        out.extend(scan_text(path, text))
    order = {s: i for i, s in enumerate(SEVERITIES)}
    out.sort(key=lambda f: (order[f.severity], f.file_path, f.line))
    return out


def summarize(findings: Iterable[Finding]) -> dict:
    counts = {s: 0 for s in SEVERITIES}
    for f in findings:
        counts[f.severity] += 1
    return counts


def gate(findings: Iterable[Finding], fail_on: str = "HIGH") -> bool:
    """True when the scan passes the gate: no finding at or above `fail_on`."""
    threshold = SEVERITIES.index(fail_on.upper())
    return not any(SEVERITIES.index(f.severity) <= threshold for f in findings)


SAMPLE_REPO: tuple[tuple[str, str], ...] = (
    ("app/llm.py", "import os\nimport subprocess\nfrom openai import OpenAI\n\nclient = OpenAI(api_key=\"sk-proj-1234567890abcdefghijklmnopqrstuvwxyz\")\n\ndef ask(user_input):\n    prompt = f\"You are a helpful bot. {user_input}\"\n    response = client.responses.create(model=\"gpt-4o:latest\", input=prompt)\n    subprocess.run(f\"echo {response}\", shell=True)\n    return eval(response.output_text)\n"),
    ("app/loader.py", "import torch\nfrom transformers import AutoModel\n\nmodel = AutoModel.from_pretrained(\"org/model\", trust_remote_code=True)\nweights = torch.load(\"weights.pt\")\n"),
    ("web/Chat.jsx", "export function Reply({ response }) {\n  return <div dangerouslySetInnerHTML={{ __html: response }} />\n}\n"),
    ("infra/api.py", "from fastapi.middleware.cors import CORSMiddleware\napp.add_middleware(CORSMiddleware, allow_origins=[\"*\"])\nprint(\"using api_key\", api_key)\n"),
    (".env", "DATABASE_URL=postgres://app:SuperSecret123@db:5432/app\nOPENAI_API_KEY=sk-live-abcdefghijklmnopqrstuvwxyz123456\n"),
    ("README.md", "# Sample\nSet OPENAI_API_KEY=sk-... in your environment.\n"),
)
