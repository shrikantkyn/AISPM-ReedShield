"""
llm_client.py
─────────────
Provider-agnostic LLM client shim.

app.py's /chat and /chat/stream tool loops are written directly against the
Anthropic Messages API shape: `.messages.create(...)` / `.messages.stream(...)`,
response `.content` (list of blocks typed "text" | "tool_use"), `.stop_reason`,
and Anthropic's tool schema (`input_schema`). Rather than rewrite those call
sites per provider, this module exposes objects that mimic that exact surface
but transport the request over OpenRouter's OpenAI-compatible endpoint when
configured — so the tool loop, retry logic, and streaming code in app.py are
completely unchanged regardless of which provider is active underneath.

Provider selection (env-driven, checked by the two factory functions below):
  1. OPENROUTER_API_KEY set  → OpenRouterAdapter / AsyncOpenRouterAdapter,
     talking to https://openrouter.ai/api/v1 (OpenAI-compatible) using the
     real `openai` SDK, routed to a Claude model by default.
  2. ANTHROPIC_API_KEY set   → the real `anthropic` SDK, unchanged.
  3. Neither                → None (existing app.py `if anthropic_client:`
     gates already skip the LLM call entirely in this case).
"""
from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from typing import Any, Optional

log = logging.getLogger("api.llm_client")

OPENROUTER_BASE_URL = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "anthropic/claude-sonnet-5")


# ── Anthropic-shaped response objects (what app.py's call sites expect) ──────

@dataclass
class Block:
    type: str
    text: Optional[str] = None
    id: Optional[str] = None
    name: Optional[str] = None
    input: Optional[dict] = None


@dataclass
class Msg:
    content: list[Block] = field(default_factory=list)
    stop_reason: str = "end_turn"


def _anthropic_tools_to_openai(tools: list[dict]) -> list[dict]:
    """Anthropic {name, description, input_schema} → OpenAI {type:"function", function:{...}}."""
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t.get("description", ""),
                "parameters": t.get("input_schema", {"type": "object", "properties": {}}),
            },
        }
        for t in tools
    ]


def _block_get(block: Any, key: str, default: Any = None) -> Any:
    """Read a field off a content block that may be EITHER a plain dict
    (round 1 — app.py builds `{"role": "user", "content": req.prompt}` and
    tool_result dicts fresh) OR one of this module's own `Block` dataclass
    instances (round 2+ — app.py round-trips a prior `message.content` we
    returned straight back into `messages` for the next tool-loop turn, per
    the same pattern the real Anthropic SDK supports for its own objects).
    Anthropic's `tool_use_id` field has no equivalent on `Block` (we only
    ever produce that key inside plain dicts app.py builds itself for
    tool_result turns), so this only needs to bridge `type`/`text`/`id`/
    `name`/`input` — the fields `Block` actually carries.
    """
    if isinstance(block, dict):
        return block.get(key, default)
    return getattr(block, key, default)


def _anthropic_messages_to_openai(system: str, messages: list[dict]) -> list[dict]:
    """Anthropic message list (system separate, tool_use/tool_result content
    blocks) → OpenAI message list (system role in-list, one message per tool
    result, assistant tool_calls array)."""
    out: list[dict] = [{"role": "system", "content": system}]
    for m in messages:
        role, content = m["role"], m["content"]
        if isinstance(content, str):
            out.append({"role": role, "content": content})
            continue

        # content is a list of content blocks — dicts on round 1, or this
        # module's own Block dataclass instances on round 2+ (see _block_get).
        if role == "assistant":
            text_parts = [_block_get(b, "text") for b in content if _block_get(b, "type") == "text"]
            tool_calls = [
                {
                    "id": _block_get(b, "id"),
                    "type": "function",
                    "function": {"name": _block_get(b, "name"), "arguments": json.dumps(_block_get(b, "input"))},
                }
                for b in content if _block_get(b, "type") == "tool_use"
            ]
            entry: dict[str, Any] = {"role": "assistant", "content": "\n".join(filter(None, text_parts)) or None}
            if tool_calls:
                entry["tool_calls"] = tool_calls
            out.append(entry)
        else:
            # user turn carrying tool_result blocks — OpenAI wants one
            # standalone {"role":"tool", ...} message per result, not a
            # single user message with a list content. tool_result blocks
            # are always plain dicts (app.py builds them fresh every round;
            # this module never returns a tool_result-shaped Block), so a
            # dict .get() here is safe without routing through _block_get.
            for b in content:
                if b.get("type") == "tool_result":
                    out.append({
                        "role": "tool",
                        "tool_call_id": b["tool_use_id"],
                        "content": b.get("content", ""),
                    })
                elif b.get("type") == "text":
                    out.append({"role": "user", "content": b["text"]})
    return out


def _openai_message_to_anthropic_msg(message: Any, finish_reason: str) -> Msg:
    blocks: list[Block] = []
    if getattr(message, "content", None):
        blocks.append(Block(type="text", text=message.content))
    for tc in (getattr(message, "tool_calls", None) or []):
        try:
            parsed_input = json.loads(tc.function.arguments)
        except (json.JSONDecodeError, TypeError):
            parsed_input = {}
        blocks.append(Block(type="tool_use", id=tc.id, name=tc.function.name, input=parsed_input))
    stop_reason = "tool_use" if finish_reason == "tool_calls" else "end_turn"
    return Msg(content=blocks, stop_reason=stop_reason)


# ── Sync (non-streaming) adapter — used by /chat ─────────────────────────────

class _SyncMessages:
    def __init__(self, client: Any, default_model: str) -> None:
        self._client = client
        self._default_model = default_model

    def create(self, *, model: str, max_tokens: int, system: str, tools: list[dict], messages: list[dict]) -> Msg:
        resp = self._client.chat.completions.create(
            model=self._default_model,
            max_tokens=max_tokens,
            messages=_anthropic_messages_to_openai(system, messages),
            tools=_anthropic_tools_to_openai(tools) if tools else None,
        )
        choice = resp.choices[0]
        return _openai_message_to_anthropic_msg(choice.message, choice.finish_reason)


class OpenRouterAdapter:
    """Drop-in replacement for `anthropic.Anthropic()` — exposes `.messages.create(...)`."""

    def __init__(self, api_key: str, model: str = OPENROUTER_MODEL) -> None:
        import openai
        self._raw = openai.OpenAI(api_key=api_key, base_url=OPENROUTER_BASE_URL)
        self.messages = _SyncMessages(self._raw, model)


# ── Async streaming adapter — used by /chat/stream ───────────────────────────

class _StreamCtx:
    """Mimics anthropic's `async with client.messages.stream(...) as stream:`
    context manager: `.text_stream` yields text deltas as they arrive,
    `.get_final_message()` returns the accumulated Msg once the stream is
    exhausted (matches the real SDK's usage pattern — text_stream is drained
    first, then get_final_message() is called).

    `openai.AsyncOpenAI().chat.completions.create(..., stream=True)` returns
    a *coroutine* (not yet an async iterator) — it must be awaited once to
    get the actual stream object. app.py calls `.stream(...)` synchronously
    (`async with async_client.messages.stream(...) as stream:`, no await on
    the call itself, matching the real Anthropic SDK's usage pattern), so
    that await has to happen lazily in here rather than in `.stream()`
    itself — hence `_create_coro` is stored un-awaited and only resolved
    inside `__aenter__`.
    """

    def __init__(self, create_coro) -> None:
        self._create_coro = create_coro
        self._raw_stream = None
        self._final_text = ""
        self._tool_call_parts: dict[int, dict] = {}
        self._finish_reason = "stop"

    async def __aenter__(self) -> "_StreamCtx":
        self._raw_stream = await self._create_coro
        return self

    async def __aexit__(self, *exc) -> None:
        pass

    @property
    async def text_stream(self):
        async for chunk in self._raw_stream:
            choice = chunk.choices[0] if chunk.choices else None
            if choice is None:
                continue
            if choice.finish_reason:
                self._finish_reason = choice.finish_reason
            delta = choice.delta
            if getattr(delta, "content", None):
                self._final_text += delta.content
                yield delta.content
            for tc_delta in (getattr(delta, "tool_calls", None) or []):
                slot = self._tool_call_parts.setdefault(
                    tc_delta.index, {"id": "", "name": "", "arguments": ""},
                )
                if tc_delta.id:
                    slot["id"] = tc_delta.id
                if tc_delta.function and tc_delta.function.name:
                    slot["name"] = tc_delta.function.name
                if tc_delta.function and tc_delta.function.arguments:
                    slot["arguments"] += tc_delta.function.arguments

    async def get_final_message(self) -> Msg:
        blocks: list[Block] = []
        if self._final_text:
            blocks.append(Block(type="text", text=self._final_text))
        for slot in self._tool_call_parts.values():
            try:
                parsed_input = json.loads(slot["arguments"]) if slot["arguments"] else {}
            except json.JSONDecodeError:
                parsed_input = {}
            blocks.append(Block(type="tool_use", id=slot["id"], name=slot["name"], input=parsed_input))
        stop_reason = "tool_use" if self._tool_call_parts else "end_turn"
        return Msg(content=blocks, stop_reason=stop_reason)


class _AsyncMessages:
    def __init__(self, client: Any, default_model: str) -> None:
        self._client = client
        self._default_model = default_model

    def stream(self, *, model: str, max_tokens: int, system: str, tools: list[dict], messages: list[dict]) -> _StreamCtx:
        # NOT awaited here — see _StreamCtx docstring. .create() just builds
        # the coroutine object; __aenter__ awaits it once the caller enters
        # the `async with` block.
        create_coro = self._client.chat.completions.create(
            model=self._default_model,
            max_tokens=max_tokens,
            messages=_anthropic_messages_to_openai(system, messages),
            tools=_anthropic_tools_to_openai(tools) if tools else None,
            stream=True,
        )
        return _StreamCtx(create_coro)


class AsyncOpenRouterAdapter:
    """Drop-in replacement for `anthropic.AsyncAnthropic()` — exposes `.messages.stream(...)`."""

    def __init__(self, api_key: str, model: str = OPENROUTER_MODEL) -> None:
        import openai
        self._raw = openai.AsyncOpenAI(api_key=api_key, base_url=OPENROUTER_BASE_URL)
        self.messages = _AsyncMessages(self._raw, model)
