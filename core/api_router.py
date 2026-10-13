"""
Unified provider router — the single place every one-shot LLM call goes through.

WHY THIS EXISTS
    Side calls (planning, code writing, error analysis, memory graph) were wired
    to Gemini only, while the local/custom OpenAI settings in api_keys.json were
    read by llm_client but never consulted by the action layer. A user who adds
    a custom API (name + base URL + key + models) expects everything to use it;
    half the system did not. This module makes that expectation true.

ROUTING RULES (config/api_keys.json)
    "provider_mode": "auto" | "gemini" | "custom"   (default: auto)
        auto   — if an enabled custom provider has a model selected, route text/
                 code/planning calls to it; otherwise Gemini.
        gemini — always Gemini.
        custom — always the selected custom provider; falls back to Gemini when
                 the provider errors, so nothing dies.

    "custom_providers": [ {id, name, base_url, api_key, kind, models,
                           selected_model, enabled}, ... ]
        Persisted forever. Models are discovered live from the provider and any
        manually added model id is kept. The selection is persisted too.

    The legacy top-level "llm_provider" / "llm_url" / "llm_model" / "llm_api_key"
    keys keep working as the implicit built-in "local" provider.

Public API
    providers() / add_provider() / update_provider() / remove_provider()
    select_model() / fetch_models() / active_provider() / get_provider_mode()
    set_provider_mode() / generate(prompt, system, tier, ...) -> str
    generate_json(...) -> dict | None
"""
from __future__ import annotations

import json
import re
import sys
import time
import uuid
from pathlib import Path
from typing import Optional

import requests


def get_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent


BASE_DIR    = get_base_dir()
CONFIG_PATH = BASE_DIR / "config" / "api_keys.json"

_MODELS_CACHE_TTL = 300.0          # seconds
_models_cache: dict[str, tuple[float, list[str]]] = {}


# ── config primitives ────────────────────────────────────────────────────────
def _load_config() -> dict:
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _patch_config(**fields) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    data = _load_config()
    data.update(fields)
    CONFIG_PATH.write_text(json.dumps(data, indent=4), encoding="utf-8")


# ── provider normalisation ───────────────────────────────────────────────────
def _norm_base(url: str) -> str:
    u = (url or "").strip().rstrip("/")
    # accept ".../v1" style URLs and strip the suffix — we append it ourselves
    if u.endswith("/v1"):
        u = u[:-3].rstrip("/")
    return u


def _implicit_local_provider(cfg: dict) -> Optional[dict]:
    """The legacy llm_* settings become a built-in 'local' provider entry."""
    url = _norm_base(cfg.get("llm_url", ""))
    if not url:
        return None
    prov = str(cfg.get("llm_provider", "ollama")).strip().lower()
    kind = "ollama" if prov == "ollama" else "openai"
    return {
        "id":             "local",
        "name":           f"Local ({prov})",
        "base_url":       url,
        "api_key":        cfg.get("llm_api_key", "") or "",
        "kind":           kind,
        "models":         [cfg.get("llm_model", "")] if cfg.get("llm_model") else [],
        "selected_model": cfg.get("llm_model", ""),
        "enabled":        bool(cfg.get("llm_enabled", True)),
        "builtin":        True,
    }


def _normalize(p: dict) -> dict:
    out = dict(p)
    out["id"]       = str(out.get("id") or uuid.uuid4().hex[:8])
    out["name"]     = str(out.get("name") or "Custom API")
    out["base_url"] = _norm_base(str(out.get("base_url", "") or ""))
    out["api_key"]  = str(out.get("api_key", "") or "")
    out["kind"]     = "ollama" if out.get("kind") == "ollama" else "openai"
    models = out.get("models") or []
    out["models"] = sorted({str(m).strip() for m in models if str(m).strip()})
    sel = str(out.get("selected_model", "") or "").strip()
    if not sel and out["models"]:
        sel = out["models"][0]
    out["selected_model"] = sel
    out["enabled"] = bool(out.get("enabled", True))
    out.setdefault("builtin", False)
    return out


def providers(refresh_models: bool = False) -> list[dict]:
    """All configured providers, builtin local first. Never raises."""
    cfg  = _load_config()
    raw  = cfg.get("custom_providers") or []
    out: list[dict] = []
    seen: set[str] = set()
    local = _implicit_local_provider(cfg)
    if local:
        out.append(local)
        seen.add("local")
    for p in raw:
        if isinstance(p, dict):
            n = _normalize(p)
            if n["id"] in seen:
                continue
            seen.add(n["id"])
            out.append(n)
    if refresh_models:
        changed = False
        for n in out:
            live = fetch_models(n)
            if live and live != n["models"]:
                n["models"] = live
                changed = True
            if n["selected_model"] not in n["models"] and n["models"]:
                n["selected_model"] = n["models"][0]
                changed = True
        if changed:
            _save_providers(out)
    return out


def _save_providers(provs: list[dict]) -> None:
    """Persist non-builtin providers; sync builtin 'local' back to llm_* keys."""
    custom: list[dict] = []
    for p in provs:
        if p.get("id") == "local" and p.get("builtin"):
            _patch_config(
                llm_url      = p.get("base_url", ""),
                llm_model    = p.get("selected_model", ""),
                llm_provider = "ollama" if p.get("kind") == "ollama" else "openai",
                llm_api_key  = p.get("api_key", ""),
                llm_enabled  = bool(p.get("enabled", True)),
            )
        else:
            custom.append({k: v for k, v in p.items() if k != "builtin"})
    _patch_config(custom_providers=custom)


# ── CRUD (settings UI + tools call these) ────────────────────────────────────
def add_provider(name: str, base_url: str, api_key: str = "",
                 models: Optional[list[str]] = None, enabled: bool = True,
                 kind: str = "openai") -> dict:
    prov = _normalize({
        "id": uuid.uuid4().hex[:8], "name": name, "base_url": base_url,
        "api_key": api_key, "models": models or [], "enabled": enabled,
        "kind": kind,
    })
    provs = providers()
    provs.append(prov)
    _save_providers(provs)
    live = fetch_models(prov)
    if live:
        prov["models"] = live
        if not prov["selected_model"]:
            prov["selected_model"] = live[0]
        _save_providers([p for p in providers() if p["id"] != prov["id"]] + [prov])
    return prov


def update_provider(pid: str, **fields) -> Optional[dict]:
    refresh = bool(fields.pop("refresh", False))
    provs = providers()
    target = None
    for i, p in enumerate(provs):
        if p["id"] == pid:
            merged = dict(p)
            for k, v in fields.items():
                if v is not None:
                    merged[k] = v
            target = _normalize(merged)
            target["id"] = pid
            target["builtin"] = p.get("builtin", False)
            if target["selected_model"] not in target["models"] and target["models"]:
                target["selected_model"] = target["models"][0]
            provs[i] = target
            break
    if target is None:
        return None
    _save_providers(provs)
    if refresh or fields.get("base_url") is not None:
        _models_cache.pop(pid, None)
        live = fetch_models(target)
        if live:
            target["models"] = live
            if target["selected_model"] not in live:
                target["selected_model"] = live[0]
            _save_providers(provs)
    return target


def add_model(pid: str, model_id: str) -> Optional[dict]:
    """Manually add a model id to a provider (kept saved even if discovery
    cannot reach the server)."""
    model_id = (model_id or "").strip()
    if not model_id:
        return None
    provs = providers()
    for i, p in enumerate(provs):
        if p["id"] == pid:
            models = list(p["models"])
            if model_id not in models:
                models.append(model_id)
            p = dict(p, models=sorted(set(models)), selected_model=model_id)
            provs[i] = p
            _save_providers(provs)
            return p
    return None


def remove_provider(pid: str) -> bool:
    provs = providers()
    kept = [p for p in provs if p["id"] != pid]
    if len(kept) == len(provs):
        return False
    _save_providers(kept)
    _models_cache.pop(pid, None)
    return True


def select_model(pid: str, model: str) -> bool:
    model = (model or "").strip()
    if not model:
        return False
    provs = providers()
    found = False
    for i, p in enumerate(provs):
        if p["id"] == pid:
            models = set(p["models"])
            models.add(model)                      # manual selections persist
            provs[i] = dict(p, models=sorted(models), selected_model=model)
            found = True
            break
    if not found:
        return False
    _save_providers(provs)
    return True


# ── model discovery ──────────────────────────────────────────────────────────
def fetch_models(prov: dict) -> list[str]:
    """List models from a provider. Ollama: GET /api/tags; OpenAI-compat:
    GET /v1/models (+ POST /v1/models/list fallback for gated servers).
    Cached per provider id for _MODELS_CACHE_TTL seconds."""
    pid  = prov.get("id", "")
    base = prov.get("base_url", "")
    if not base:
        return list(prov.get("models") or [])
    hit = _models_cache.get(pid)
    if hit and time.time() - hit[0] < _MODELS_CACHE_TTL:
        return hit[1]

    headers = {"Content-Type": "application/json"}
    if prov.get("api_key"):
        headers["Authorization"] = f"Bearer {prov['api_key']}"
    models: list[str] = []
    try:
        if prov.get("kind") == "ollama":
            r = requests.get(f"{base}/api/tags", headers=headers, timeout=10)
            r.raise_for_status()
            models = [m.get("name", "") for m in r.json().get("models", []) if m.get("name")]
        else:
            r = requests.get(f"{base}/v1/models", headers=headers, timeout=10)
            if r.status_code == 200:
                data = r.json().get("data") or r.json().get("models") or []
                models = sorted({str(m.get("id") or m.get("name") or "")
                                 for m in data if isinstance(m, dict)} - {""})
            elif r.status_code in (404, 405):
                r2 = requests.post(f"{base}/v1/models/list", headers=headers,
                                   json={}, timeout=10)
                if r2.status_code == 200:
                    data = r2.json().get("data") or []
                    models = sorted({str(m.get("id") or m.get("name") or "")
                                     for m in data if isinstance(m, dict)} - {""})
    except Exception as e:
        print(f"[Router] model discovery failed for '{prov.get('name')}': {e}")

    if not models:
        models = list(prov.get("models") or [])   # keep whatever was saved
    _models_cache[pid] = (time.time(), models)
    return models


# ── routing decision ─────────────────────────────────────────────────────────
def get_provider_mode() -> str:
    mode = str(_load_config().get("provider_mode", "auto")).strip().lower()
    return mode if mode in ("auto", "gemini", "custom") else "auto"


def set_provider_mode(mode: str) -> None:
    mode = str(mode).strip().lower()
    if mode in ("auto", "gemini", "custom"):
        _patch_config(provider_mode=mode)


def active_provider() -> Optional[dict]:
    """The custom provider that should handle text calls right now, or None
    (meaning: use Gemini)."""
    mode = get_provider_mode()
    if mode == "gemini":
        return None
    for p in providers():
        if p.get("enabled") and p.get("base_url") and p.get("selected_model"):
            return p
    return None


# ── generation ───────────────────────────────────────────────────────────────
def strip_fences(text: str) -> str:
    t = (text or "").strip()
    t = re.sub(r"^```[a-zA-Z0-9_+-]*\r?\n?", "", t)
    t = re.sub(r"\r?\n?```\s*$", "", t)
    return t.strip()


def _call_openai_compat(prov: dict, messages: list, temperature: float,
                        max_tokens: int, json_mode: bool, timeout: int) -> str:
    endpoint = f"{prov['base_url']}/v1/chat/completions"
    payload = {
        "model":       prov["selected_model"],
        "messages":    messages,
        "stream":      False,
        "max_tokens":  max_tokens,
        "temperature": temperature,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    headers = {"Content-Type": "application/json"}
    if prov.get("api_key"):
        headers["Authorization"] = f"Bearer {prov['api_key']}"
    resp = requests.post(endpoint, json=payload, headers=headers, timeout=timeout)
    resp.raise_for_status()
    choice = (resp.json().get("choices") or [{}])[0]
    content = (choice.get("message") or {}).get("content") or ""
    return content.strip()


def _call_ollama_native(prov: dict, messages: list, temperature: float,
                        max_tokens: int, timeout: int) -> str:
    endpoint = f"{prov['base_url']}/api/chat"
    payload = {
        "model":      prov["selected_model"],
        "messages":   messages,
        "stream":     False,
        "keep_alive": -1,
        "options":    {"num_predict": max_tokens, "temperature": temperature},
    }
    resp = requests.post(endpoint, json=payload, timeout=timeout)
    resp.raise_for_status()
    return ((resp.json().get("message") or {}).get("content") or "").strip()


def generate(prompt: str, system: str = "", tier: str = "fast",
             temperature: float = 0.4, max_tokens: int = 1600,
             json_mode: bool = False, timeout: int = 120,
             allow_gemini_fallback: bool = True) -> str:
    """One-shot text generation routed through the active provider.

    A custom provider gets one attempt with its selected model; on failure (or
    when no custom provider is active) the Gemini ladder in core.gemini handles
    it — that ladder already has cooldown/fallback behaviour.
    """
    prov = active_provider()
    if prov is not None:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        try:
            capped = max(64, min(max_tokens, 8192))
            if prov.get("kind") == "ollama":
                out = _call_ollama_native(prov, messages, temperature, capped, timeout)
            else:
                out = _call_openai_compat(prov, messages, temperature, capped,
                                          json_mode, timeout)
            if out:
                return out
            raise RuntimeError("empty completion")
        except Exception as e:
            print(f"[Router] provider '{prov.get('name')}' failed: {e}")
            if not allow_gemini_fallback:
                raise
            print("[Router] falling back to Gemini ladder")

    # ── Gemini path (also the fallback) ──────────────────────────────────────
    try:
        from core import gemini
        contents = prompt if not system else [system, prompt]
        txt = gemini.text(contents, tier=tier, timeout_ms=timeout * 1000)
        return txt or ""
    except Exception as e:
        print(f"[Router] Gemini fallback failed: {e}")
        return ""


def generate_json(prompt: str, system: str = "", tier: str = "fast",
                  default=None, **kw):
    """generate() parsed as JSON, tolerating fences and prose wrappers."""
    raw = generate(prompt, system=system, tier=tier, json_mode=True, **kw)
    if not raw:
        return default
    raw = strip_fences(raw)
    if "{" in raw and "}" in raw:
        raw = raw[raw.find("{"): raw.rfind("}") + 1]
    elif "[" in raw and "]" in raw:
        raw = raw[raw.find("["): raw.rfind("]") + 1]
    try:
        return json.loads(raw)
    except Exception as e:
        print(f"[Router] reply was not JSON: {e}")
        return default
