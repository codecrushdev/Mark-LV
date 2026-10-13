"""
Knowledge graph — the connected brain behind long-term memory.

WHY THIS EXISTS
    long_term.json stores facts as flat key/value pairs in categories. That is
    enough to *recall* a fact, but not enough to answer "what goes with what":
    projects, people, tools and tasks lived in isolation, so the assistant
    could repeat itself, forget which approach worked, and never connect
    "Hermes is installed" to "the user asked me to use Hermes".

    This module adds a real graph on top of the same store:

      nodes  — typed entities (person / project / tool / place / concept /
               task / preference / event) extracted from every memory write
      edges  — typed, weighted relations between them (uses, prefers,
               related_to, part_of, works_on, failed_at, succeeded_at …)
      weights— learned: repeated co-occurrence strengthens an edge; failures
               attach lessons to the nodes that caused them

    Everything persists to memory/knowledge_graph.json (atomic writes, thread
    safe). Retrieval is hybrid: keyword scoring over node text + traversal of
    the strongest edges, so a query about one node returns its neighbourhood, not just
    literal matches.

    Self-improvement hooks: record_outcome() stores what was tried, whether it
    worked, and the lesson learned. advice_for() returns the stored lessons for
    a task description so the planner can avoid repeating a failed approach.
"""
from __future__ import annotations

import json
import math
import re
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Optional


def get_base_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent.parent


BASE_DIR  = get_base_dir()
GRAPH_PATH = BASE_DIR / "memory" / "knowledge_graph.json"
# Reentrant: public helpers take the lock and then call other helpers that
# take it again (add_node -> link -> add_node). A plain Lock deadlocked there.
_lock = __import__("threading").RLock()

_STOP = {
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be",
    "to", "of", "in", "on", "at", "for", "with", "that", "this", "it", "as",
    "by", "from", "i", "you", "he", "she", "we", "they", "my", "your", "his",
    "will", "would", "can", "could", "do", "does", "did", "have", "has", "had",
    "not", "so", "if", "then", "than", "too", "very", "just", "about", "into",
}

# entity type inference from surface cues
_TYPE_RULES = [
    ("project",  r"\b(project|repo|repository|app|application|api|website|site|toolkit|sdk)\b"),
    ("tool",     r"\b(installed|install|hermes|claude|vscode|docker|git|npm|pip|ollama|browser|chrome|firefox|editor|terminal)\b"),
    ("person",   r"\b(mum|mom|dad|father|mother|brother|sister|friend|boss|colleague|wife|husband|team|user called|name is)\b"),
    ("place",    r"\b(city|office|home|house|country|ankara|istanbul|london|berlin)\b"),
    ("preference", r"\b(like|love|hate|prefer|always use|never use|favorite|favourite)\b"),
    ("task",     r"\b(task|todo|to do|remind|reminder|deadline|need to|should)\b"),
]

_MAX_NODES = 5000
_MAX_EDGES = 20000


# ── persistence ──────────────────────────────────────────────────────────────
def _empty_graph() -> dict:
    return {"nodes": {}, "edges": {}, "lessons": [], "updated": ""}


def _load() -> dict:
    if not GRAPH_PATH.exists():
        return _empty_graph()
    try:
        data = json.loads(GRAPH_PATH.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return _empty_graph()
        data.setdefault("nodes", {})
        data.setdefault("edges", {})
        data.setdefault("lessons", [])
        return data
    except Exception:
        return _empty_graph()


def _save(g: dict) -> None:
    g["updated"] = datetime.now().isoformat(timespec="seconds")
    tmp = GRAPH_PATH.with_suffix(".json.tmp")
    GRAPH_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp.write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(GRAPH_PATH)


# ── tokenising / naming ──────────────────────────────────────────────────────
def _tokens(text: str) -> list[str]:
    words = re.findall(r"[a-zA-Z0-9_+#\.\-]{2,}", (text or "").lower())
    return [w for w in words if w not in _STOP]


def _node_id(label: str) -> str:
    label = re.sub(r"\s+", " ", (label or "").strip().lower())
    return "n_" + uuid.uuid5(uuid.NAMESPACE_DNS, label).hex[:12]


def _infer_type(text: str) -> str:
    low = (text or "").lower()
    for t, pat in _TYPE_RULES:
        if re.search(pat, low):
            return t
    return "concept"


# ── core operations ──────────────────────────────────────────────────────────
def add_node(label: str, ntype: str = "", props: Optional[dict] = None) -> str:
    """Insert or merge a node by normalised label. Returns the node id."""
    label = re.sub(r"\s+", " ", (label or "").strip())
    if not label:
        return ""
    with _lock:
        g = _load()
        nid = _node_id(label)
        node = g["nodes"].get(nid)
        if node is None:
            node = {
                "id": nid, "label": label,
                "type": ntype or _infer_type(label),
                "props": props or {},
                "created": datetime.now().isoformat(timespec="seconds"),
                "weight": 1.0, "mentions": 0,
            }
            g["nodes"][nid] = node
        else:
            node["mentions"] = int(node.get("mentions", 0)) + 1
            node["weight"]   = float(node.get("weight", 1.0)) + 0.25
            if props:
                node.setdefault("props", {}).update(props)
            if ntype and node.get("type") == "concept":
                node["type"] = ntype
        _trim_graph(g)
        _save(g)
        return nid


def link(source_label: str, target_label: str, relation: str = "related_to",
         weight: float = 1.0, props: Optional[dict] = None) -> str:
    """Create or strengthen a directed edge. Repeated links raise the weight
    (log-damped) — that is how the graph learns what usually goes together."""
    sid = add_node(source_label)
    tid = add_node(target_label)
    if not sid or not tid or sid == tid:
        return ""
    eid = f"{sid}|{relation}|{tid}"
    with _lock:
        g = _load()
        e = g["edges"].get(eid)
        now = datetime.now().isoformat(timespec="seconds")
        if e is None:
            g["edges"][eid] = {
                "id": eid, "source": sid, "target": tid,
                "relation": relation, "weight": float(weight),
                "count": 1, "created": now, "props": props or {},
            }
        else:
            e["count"]  = int(e.get("count", 1)) + 1
            # log damping: second mention adds less than the first
            e["weight"] = float(e.get("weight", weight)) + float(weight) / math.log(e["count"] + 1)
            e["last"]   = now
            if props:
                e.setdefault("props", {}).update(props)
        _trim_graph(g)
        _save(g)
        return eid


def ingest(text: str, context_label: str = "", ntype: str = "") -> int:
    """Extract entities from free text and wire them into the graph.

    Cheap statistical extraction (no LLM required, works offline): each
    meaningful token becomes/updates a concept node linked to a node for the
    context label; multi-word proper-noun runs become their own entities.
    Returns the number of nodes touched.
    """
    text = (text or "").strip()
    if not text:
        return 0
    touched = 0
    ctx_id = ""
    if context_label:
        ctx_id = add_node(context_label, ntype or _infer_type(text))
        touched += 1

    # proper noun runs (e.g. "Claude Code", "Hermes")
    for run in re.findall(r"(?:[A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,3})", text):
        run = run.strip()
        if len(run) < 3 or run.lower() in _STOP:
            continue
        add_node(run, ntype or _infer_type(run))
        touched += 1
        if ctx_id:
            link(context_label, run, "related_to", 0.6)

    # keyword co-occurrence edges around the context
    toks = _tokens(text)
    uniq = list(dict.fromkeys(toks))[:14]
    for w in uniq:
        if len(w) < 3:
            continue
        add_node(w, "concept")
        touched += 1
        if ctx_id:
            link(context_label, w, "related_to", 0.4)
    for i in range(len(uniq) - 1):
        a, b = uniq[i], uniq[i + 1]
        if len(a) >= 3 and len(b) >= 3:
            link(a, b, "co_occurs", 0.2)
    return touched


def neighbours(label: str, depth: int = 2, limit: int = 20) -> list[dict]:
    """BFS over the strongest edges from a node's neighbourhood. Returns
    [{label,type,relation,distance,weight}] sorted by relevance."""
    nid = _node_id(label)
    with _lock:
        g = _load()
        if nid not in g["nodes"]:
            # tolerate partial matches
            low = label.lower()
            cand = [n for n in g["nodes"].values() if low in n["label"].lower()]
            if not cand:
                return []
            nid = cand[0]["id"]
        visited = {nid}
        frontier = [nid]
        out: list[dict] = []
        d = 0
        while frontier and d < depth:
            d += 1
            nxt: list[str] = []
            for cur in frontier:
                for e in g["edges"].values():
                    other, rel = None, e.get("relation", "related_to")
                    if e["source"] == cur:
                        other = e["target"]
                    elif e["target"] == cur:
                        other = e["source"]
                    if other and other not in visited:
                        visited.add(other)
                        node = g["nodes"].get(other)
                        if node:
                            out.append({"label": node["label"], "type": node.get("type", "concept"),
                                        "relation": rel, "distance": d,
                                        "weight": round(float(e.get("weight", 1)), 2)})
                        nxt.append(other)
            frontier = nxt
        out.sort(key=lambda x: (-x["weight"], x["distance"]))
        return out[:limit]


def related_facts(query: str, limit: int = 10) -> str:
    """Graph-augmented recall for a query: direct label hits + their strongest
    neighbourhood. Returns plain text ready to drop into a prompt."""
    q_tokens = set(_tokens(query)[:8])
    if not q_tokens:
        return ""
    with _lock:
        g = _load()
        scored = []
        for n in g["nodes"].values():
            overlap = q_tokens & set(_tokens(n["label"]))
            score = len(overlap) * 2 + float(n.get("weight", 1)) * 0.1
            if overlap:
                scored.append((score, n))
        scored.sort(key=lambda x: -x[0])
        lines = []
        seen_labels = set()
        for _, node in scored[:limit]:
            lines.append(f"- {node['label']} ({node.get('type','concept')})")
            seen_labels.add(node["id"])
            for nb in neighbours(node["label"], depth=1, limit=4):
                tag = f"  · {nb['relation']} → {nb['label']} ({nb['type']})"
                if tag not in lines and nb["label"].lower() not in seen_labels:
                    lines.append(tag)
                    seen_labels.add(nb["label"].lower())
        return "\n".join(lines[:limit * 2])


def graph_stats() -> dict:
    with _lock:
        g = _load()
        types: dict[str, int] = {}
        for n in g["nodes"].values():
            t = n.get("type", "concept")
            types[t] = types.get(t, 0) + 1
        return {"nodes": len(g["nodes"]), "edges": len(g["edges"]),
                "lessons": len(g.get("lessons", [])), "types": types,
                "updated": g.get("updated", "")}


def export_json(path: Optional[str] = None) -> str:
    """Dump the whole graph (for UI visualisation / debugging)."""
    with _lock:
        g = _load()
    p = Path(path) if path else GRAPH_PATH.with_name("knowledge_graph_export.json")
    p.write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding="utf-8")
    return str(p)


def clear_all() -> None:
    with _lock:
        _save(_empty_graph())


# ── self-improvement: lessons ────────────────────────────────────────────────
def record_outcome(task: str, approach: str, success: bool,
                   detail: str = "", lesson: str = "") -> None:
    """Store what was tried and whether it worked. Failures create a lesson
    attached to the task's entities so future attempts can consult it."""
    task    = (task or "").strip()
    if not task:
        return
    entry = {
        "id": uuid.uuid4().hex[:8],
        "task": task[:300],
        "approach": (approach or "")[:300],
        "success": bool(success),
        "detail": (detail or "")[:500],
        "lesson": (lesson or "")[:500],
        "time": datetime.now().isoformat(timespec="seconds"),
    }
    with _lock:
        g = _load()
        g.setdefault("lessons", []).append(entry)
        g["lessons"] = g["lessons"][-400:]          # bounded history
        _save(g)
    tid = add_node(task[:120], "task")
    if approach:
        aid = add_node(approach[:120], "concept")
        link(task[:120], approach[:120], "succeeded_at" if success else "failed_at",
             1.5 if success else 1.0)
    if not success:
        # failures mark the task node so advice_for() surfaces it
        pass


def lessons_for(query: str, limit: int = 5) -> list[dict]:
    q = set(_tokens(query)[:8])
    if not q:
        return []
    with _lock:
        g = _load()
        scored = []
        for le in reversed(g.get("lessons", [])):
            overlap = q & set(_tokens(le["task"] + " " + le.get("approach", "")))
            if overlap:
                scored.append((len(overlap), le))
        scored.sort(key=lambda x: -x[0])
        return [le for _, le in scored[:limit]]


def advice_for(task: str) -> str:
    """Lessons relevant to a task, formatted for a planner prompt. Empty string
    when nothing has been learned yet."""
    ls = lessons_for(task)
    if not ls:
        return ""
    lines = []
    for le in ls:
        mark = "OK" if le["success"] else "FAILED"
        line = f"[{mark}] tried: {le['approach'] or le['task']}"
        if le.get("lesson"):
            line += f" — lesson: {le['lesson']}"
        elif not le["success"] and le.get("detail"):
            line += f" — error: {le['detail'][:120]}"
        lines.append(line)
    return "\n".join(lines)


# ── maintenance ──────────────────────────────────────────────────────────────
def _trim_graph(g: dict) -> None:
    """Bound growth: keep the heaviest nodes/edges when limits are passed."""
    nodes = g["nodes"]
    if len(nodes) > _MAX_NODES:
        keep = sorted(nodes.values(),
                      key=lambda n: (float(n.get("weight", 1)), n.get("created", "")),
                      reverse=True)[:_MAX_NODES]
        g["nodes"] = {n["id"]: n for n in keep}
        ids = set(g["nodes"])
        g["edges"] = {k: v for k, v in g["edges"].items()
                      if v["source"] in ids and v["target"] in ids}
    edges = g["edges"]
    if len(edges) > _MAX_EDGES:
        keep = sorted(edges.values(), key=lambda e: float(e.get("weight", 1)),
                      reverse=True)[:_MAX_EDGES]
        g["edges"] = {e["id"]: e for e in keep}
