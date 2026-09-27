"""Envelope encryption for secrets at rest (integration credentials, agent tokens).

Single source of truth for turning a plaintext secret into the value stored in
the database and back. Replaces the previous base64 "encoding" that offered no
confidentiality (audit findings H1 and H2).

Design
──────
* Encryption uses Fernet (AES-128-CBC + HMAC-SHA256) with a key read from the
  ``INTEGRATION_KEY`` environment variable. Generate one with::

      python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

* ``decrypt_secret`` is backward compatible: it accepts a current Fernet token,
  and, failing that, a legacy base64 value, and, failing that, returns the input
  unchanged (legacy plaintext). This lets existing rows keep working while a
  one-time migration re-encrypts them, and lets already-deployed agents whose
  token was stored as plaintext keep authenticating until re-minted.

* ``hash_token`` gives a deterministic SHA-256 hex digest used for O(1) lookups
  of tokens that are *also* stored encrypted (agent ``mcp_token`` /
  ``llm_api_key``): Fernet is non-deterministic, so it cannot be queried by
  equality — we store the ciphertext for recovery and the hash for lookup.

Key management
──────────────
If ``INTEGRATION_KEY`` is unset or invalid, a clearly-labelled INSECURE
development key is used and a warning is logged. Production deployments MUST set
a real key; ``integration_key_is_secure()`` reports whether a real key is in
use so services can warn or fail closed at startup.
"""
from __future__ import annotations

import base64
import hashlib
import logging
import os
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

log = logging.getLogger(__name__)

# 32 raw bytes → a valid urlsafe-base64 Fernet key. Used only when no real key
# is configured, so local development works out of the box; never for real data.
_DEV_KEY_BYTES = b"eitan-dev-insecure-key-32bytes!!"
_DEV_KEY = base64.urlsafe_b64encode(_DEV_KEY_BYTES)

_fernet: Optional[Fernet] = None
_using_dev_key: bool = False


def _get_fernet() -> Fernet:
    global _fernet, _using_dev_key
    if _fernet is not None:
        return _fernet
    key = (os.getenv("INTEGRATION_KEY") or "").strip()
    if not key:
        log.warning(
            "INTEGRATION_KEY is not set — using an INSECURE development key. "
            "Set INTEGRATION_KEY to a Fernet key before any shared deployment."
        )
        _fernet = Fernet(_DEV_KEY)
        _using_dev_key = True
        return _fernet
    try:
        _fernet = Fernet(key.encode("ascii"))
        _using_dev_key = False
    except Exception:
        log.error(
            "INTEGRATION_KEY is not a valid Fernet key — falling back to the "
            "INSECURE development key. Generate one with Fernet.generate_key()."
        )
        _fernet = Fernet(_DEV_KEY)
        _using_dev_key = True
    return _fernet


def integration_key_is_secure() -> bool:
    """True when a real (non-development) INTEGRATION_KEY is configured."""
    _get_fernet()
    return not _using_dev_key


def encrypt_secret(raw: Optional[str]) -> str:
    """Return the at-rest ciphertext for *raw* (empty string maps to '')."""
    if not raw:
        return ""
    return _get_fernet().encrypt(raw.encode("utf-8")).decode("ascii")


def decrypt_secret(enc: Optional[str], *, allow_plaintext_fallback: bool = False) -> str:
    """Recover the plaintext from a stored value.

    Tries, in order: current Fernet key → legacy base64. On an undecryptable
    value it fails soft to '' (so a corrupt credential row never crashes a
    boot-time hydrator and is treated as "not configured").

    ``allow_plaintext_fallback=True`` additionally treats an undecryptable
    value as legacy plaintext and returns it unchanged. Use it ONLY where a
    stored value might legitimately be an un-migrated raw token (agent token
    spawn injection and the one-time backfill), never for credential hydration.
    """
    if not enc:
        return ""
    token = enc.encode("ascii") if isinstance(enc, str) else enc

    # 1. Current Fernet key.
    try:
        return _get_fernet().decrypt(token).decode("utf-8")
    except InvalidToken:
        pass
    except Exception:
        pass

    # 2. Legacy base64 (the pre-encryption "encoding").
    try:
        # validate=True so arbitrary plaintext doesn't silently base64-decode
        decoded = base64.b64decode(token, validate=True)
        return decoded.decode("utf-8")
    except Exception:
        pass

    # 3. Undecryptable. Fail soft to '' unless a raw legacy token is expected.
    if allow_plaintext_fallback:
        return enc if isinstance(enc, str) else enc.decode("utf-8", "replace")
    return ""


def hash_token(raw: Optional[str]) -> str:
    """Deterministic SHA-256 hex digest of a token, for equality lookups."""
    if not raw:
        return ""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
