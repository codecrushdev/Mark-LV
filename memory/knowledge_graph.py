"""
Knowledge graph — the connected brain behind long-term memory.

WHY THIS EXISTS
    long_term.json stored facts as flat key/value pairs in categories. That is
    enough to *recall* a fact, but not enough to answer "what goes with what":
    projects, people, tools and tasks lived in isolation, so the assistant
    could repeat itself, forget which approach worked, and never connect
    "Hermes is installed" to "the user asked me to use Hermes".

    This module adds a real graph on top of that store, persisted in ONE
    SQLite database file for the whole project:

        memory/jarvis.db

    Tables
      kg_nodes   — typed entities (person / project / tool / place / concept /
                   task / preference / event) extracted from every memory write
      kg_edges   — typed, weighted relations between them (uses, prefers,
                   related_to, part_of, works_on, failed_at, succeeded_at …)
      kg_lessons — self-improvement log: what was tried, did it work, the lesson
      mem_facts  — mirror of long-term memory facts (keeps the DB the single
                   source of knowledge; JSON stays as the prompt-side cache)

    Weights are learned: repeated co-occurrence strengthens an edge; failures
    attach lessons to the nodes that caused them.

    Retrieval is hybrid: keyword scoring over node text + traversal of the
    strongest edges, so a query about one node returns its neighbourhood, not
    just literal matches.

    The dashboard renders the graph through graph_viz_data(): a Cytoscape-ready
    {nodes:[...], edges:[...]} document with per-type colours.
"""
from __future__ import annotations

import json
import math
import re
import sqlite3
import sys
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

DB_DIR   = Path(__file__).resolve().parent
DB_PATH  = DB_DIR / "jarvis.db"
LEGACY_JSON = DB_DIR / "knowledge_graph.json"
MEMORY_JSON = DB_DIR / "long_term.json"

# One shared connection guarded by an RLock (public helpers nest: add_node ->
# link -> add_node). check_same_thread=False because the dashboard server,
# main loop and action threads all touch the graph.
_local = threading.RLock()
_conn: Optional[sqlite3.Connection] = None

_STOP = {
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be",
    "to", "of", "in", "on", "at", "for", "with", "that", "this", "it", "as",
    "by", "from", "i", "you", "he", "she", "we", "they", "my", "your", "his",
    "will", "would", "can", "could", "do", "does", "did", "have", "has", "had",
    "not", "so", "if", "then", "than", "too", "very", "just", "about", "into",
}

# entity type inference from surface cues
_TYPE_RULES = [
    ("project",    r"\b(project|repo|repository|app|application|api|website|site|toolkit|sdk)\b"),
    ("tool",       r"\b(installed|install|hermes|claude|vscode|docker|git|npm|pip|ollama|browser|chrome|firefox|editor|terminal)\b"),
    ("person",     r"\b(mum|mom|dad|father|mother|brother|sister|friend|boss|colleague|wife|husband|team|user called|name is)\b"),
    ("place",      r"\b(city|office|home|house|country|ankara|istanbul|london|berlin)\b"),
    ("preference", r"\b(like|love|hate|prefer|always use|never use|favorite|favourite)\b"),
    ("task",       r"\b(task|todo|to do|remind|reminder|deadline|need to|should)\b"),
]

_MAX_NODES = 5000
_MAX_EDGES = 20000

# colours used by the dashboard graph renderer (Graphify-style palette)
TYPE_COLORS = {
    "person":     "#f472b6",
    "project":    "#6366f1",
    "tool":       "#22d3ee",
    "place":      "#84cc16",
    "preference": "#fbbf24",
    "task":       "#fb923c",
    "event":      "#a78bfa",
    "concept":    "#64748b",
}


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


# ── connection / schema ──────────────────────────────────────────────────────
def _get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is not None:
        return _conn
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    _conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    _conn.row_factory = sqlite3.Row
    _conn.executescript(
        """
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS kg_nodes (
            id         TEXT PRIMARY KEY,
            label      TEXT NOT NULL UNIQUE,
            type       TEXT DEFAULT 'concept',
            props      TEXT DEFAULT '{}',
            weight     REAL DEFAULT 1.0,
            mentions   INTEGER DEFAULT 0,
            created    TEXT,
            updated    TEXT
        );
        CREATE TABLE IF NOT EXISTS kg_edges (
            id         TEXT PRIMARY KEY,
            source     TEXT NOT NULL,
            target     TEXT NOT NULL,
            relation   TEXT DEFAULT 'related_to',
            weight     REAL DEFAULT 1.0,
            count      INTEGER DEFAULT 1,
            created    TEXT,
            last_seen  TEXT,
            props      TEXT DEFAULT '{}'
        );
        CREATE INDEX IF NOT EXISTS idx_edges_source ON kg_edges(source);
        CREATE INDEX IF NOT EXISTS idx_edges_target ON kg_edges(target);
        CREATE TABLE IF NOT EXISTS kg_lessons (
            id         TEXT PRIMARY KEY,
            task       TEXT,
            approach   TEXT,
            success    INTEGER,
            detail     TEXT,
            lesson     TEXT,
            time       TEXT
        );
        CREATE TABLE IF NOT EXISTS mem_facts (
            category   TEXT NOT NULL,
            key        TEXT NOT NULL,
            value      TEXT,
            updated    TEXT,
            PRIMARY KEY (category, key)
        );
        """
    )
    _conn.commit()
    _migrate_legacy(_conn)
    _sync_mem_facts(_conn)
    return _conn


def _migrate_legacy(conn: sqlite3.Connection) -> None:
    """One-time import of the old JSON graph (and any earlier empty DB)."""
    try:
        has_rows = conn.execute("SELECT COUNT(*) c FROM kg_nodes").fetchone()["c"] > 0
    except Exception:
        has_rows = False
    if has_rows or not LEGACY_JSON.exists():
        return
    try:
        data = json.loads(LEGACY_JSON.read_text(encoding="utf-8"))
    except Exception:
        return
    now = _now()
    for nid, n in (data.get("nodes") or {}).items():
        try:
            conn.execute(
                "INSERT OR IGNORE INTO kg_nodes(id,label,type,props,weight,mentions,created,updated)"
                " VALUES(?,?,?,?,?,?,?,?)",
                (n.get("id", nid), (n.get("label") or "").strip(),
                 n.get("type", "concept"), json.dumps(n.get("props") or {}),
                 float(n.get("weight", 1.0)), int(n.get("mentions", 0)),
                 n.get("created", now), now),
            )
        except Exception:
            pass
    for eid, e in (data.get("edges") or {}).items():
        try:
            conn.execute(
                "INSERT OR IGNORE INTO kg_edges(id,source,target,relation,weight,count,created,last_seen,props)"
                " VALUES(?,?,?,?,?,?,?,?,?)",
                (e.get("id", eid), e.get("source", ""), e.get("target", ""),
                 e.get("relation", "related_to"), float(e.get("weight", 1.0)),
                 int(e.get("count", 1)), e.get("created", now),
                 e.get("last", now), json.dumps(e.get("props") or {})),
            )
        except Exception:
            pass
    for le in data.get("lessons") or []:
        try:
            conn.execute(
                "INSERT OR IGNORE INTO kg_lessons(id,task,approach,success,detail,lesson,time)"
                " VALUES(?,?,?,?,?,?,?)",
                (le.get("id", uuid.uuid4().hex[:8]), le.get("task", ""),
                 le.get("approach", ""), 1 if le.get("success") else 0,
                 le.get("detail", ""), le.get("lesson", ""), le.get("time", now)),
            )
        except Exception:
            pass
    conn.commit()


def _sync_mem_facts(conn: sqlite3.Connection) -> None:
    """Mirror long_term.json facts into the DB so jarvis.db is the single store."""
    if not MEMORY_JSON.exists():
        return
    try:
        mem = json.loads(MEMORY_JSON.read_text(encoding="utf-8"))
    except Exception:
        return
    if not isinstance(mem, dict):
        return
    for cat, items in mem.items():
        if not isinstance(items, dict):
            continue
        for key, entry in items.items():
            val = entry.get("value") if isinstance(entry, dict) else entry
            if not val:
                continue
            upd = entry.get("updated", "") if isinstance(entry, dict) else ""
            try:
                conn.execute(
                    "INSERT INTO mem_facts(category,key,value,updated) VALUES(?,?,?,?)"
                    " ON CONFLICT(category,key) DO UPDATE SET"
                    " value=excluded.value, updated=excluded.updated",
                    (cat, key, str(val)[:4000], str(upd)),
                )
            except Exception:
                pass
    conn.commit()


def sync_memory_facts(memory: dict) -> None:
    """Called by memory_manager on every save: keeps the DB copy current and
    feeds new facts into the graph automatically."""
    if not isinstance(memory, dict):
        return
    with _local:
        conn = _get_conn()
        _sync_mem_facts(conn)
        # ingest anything the graph has not seen yet (bounded: only new rows)
        try:
            known = {r["key"] for r in conn.execute(
                "SELECT label FROM kg_nodes WHERE type IN ('fact','preference','project',"
                "'person','place','task')")}
        except Exception:
            known = set()
        for cat, items in memory.items():
            if not isinstance(items, dict):
                continue
            for key, entry in items.items():
                val = entry.get("value") if isinstance(entry, dict) else entry
                if not val:
                    continue
                sig = f"{key}: {val}"
                if sig.lower() in known:
                    continue
                try:
                    fid = conn.execute(
                        "SELECT id FROM kg_nodes WHERE label=?", (sig[:120],)).fetchone()
                    if fid:
                        continue
                except Exception:
                    pass
                ingest(sig, context_label=str(key)[:60],
                       ntype=_cat_type(cat))
        conn.commit()


def _cat_type(cat: str) -> str:
    return {"identity": "person", "preferences": "preference",
            "projects": "project", "relationships": "person",
            "wishes": "task", "notes": "concept"}.get(cat, "concept")


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
    with _local:
        conn = _get_conn()
        nid = _node_id(label)
        row = conn.execute("SELECT id, type, weight, mentions FROM kg_nodes WHERE id=?",
                           (nid,)).fetchone()
        now = _now()
        if row is None:
            conn.execute(
                "INSERT INTO kg_nodes(id,label,type,props,weight,mentions,created,updated)"
                " VALUES(?,?,?,?,?,?,?,?)",
                (nid, label, ntype or _infer_type(label),
                 json.dumps(props or {}), 1.0, 0, now, now),
            )
        else:
            new_type = ntype if (ntype and row["type"] == "concept") else row["type"]
            conn.execute(
                "UPDATE kg_nodes SET weight=weight+0.25, mentions=mentions+1,"
                " type=?, props=?, updated=? WHERE id=?",
                (new_type, json.dumps(_merge_props(conn, nid, props)), now, nid),
            )
        _trim(conn)
        conn.commit()
        return nid


def _merge_props(conn, nid: str, props: Optional[dict]) -> dict:
    if not props:
        row = conn.execute("SELECT props FROM kg_nodes WHERE id=?", (nid,)).fetchone()
        try:
            return json.loads(row["props"]) if row and row["props"] else {}
        except Exception:
            return {}
    return dict(props)


def link(source_label: str, target_label: str, relation: str = "related_to",
         weight: float = 1.0, props: Optional[dict] = None) -> str:
    """Create or strengthen a directed edge. Repeated links raise the weight
    (log-damped) — that is how the graph learns what usually goes together."""
    sid = add_node(source_label)
    tid = add_node(target_label)
    if not sid or not tid or sid == tid:
        return ""
    eid = f"{sid}|{relation}|{tid}"
    now = _now()
    with _local:
        conn = _get_conn()
        row = conn.execute("SELECT weight, count FROM kg_edges WHERE id=?", (eid,)).fetchone()
        if row is None:
            conn.execute(
                "INSERT INTO kg_edges(id,source,target,relation,weight,count,created,last_seen,props)"
                " VALUES(?,?,?,?,?,?,?,?,?)",
                (eid, sid, tid, relation, float(weight), 1, now, now,
                 json.dumps(props or {})),
            )
        else:
            cnt = int(row["count"]) + 1
            w = float(row["weight"]) + float(weight) / math.log(cnt + 1)
            conn.execute(
                "UPDATE kg_edges SET count=?, weight=?, last_seen=? WHERE id=?",
                (cnt, w, now, eid),
            )
        _trim(conn)
        conn.commit()
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
    with _local:
        conn = _get_conn()
        row = conn.execute("SELECT id FROM kg_nodes WHERE id=?", (nid,)).fetchone()
        if row is None:
            low = (label or "").lower()
            cand = conn.execute(
                "SELECT id FROM kg_nodes WHERE lower(label) LIKE ? ORDER BY weight DESC LIMIT 1",
                (f"%{low}%",)).fetchone()
            if not cand:
                return []
            nid = cand["id"]
        visited = {nid}
        frontier = [nid]
        out: list[dict] = []
        d = 0
        while frontier and d < depth:
            d += 1
            nxt: list[str] = []
            for cur in frontier:
                for e in conn.execute(
                        "SELECT * FROM kg_edges WHERE source=? OR target=?",
                        (cur, cur)):
                    other = e["target"] if e["source"] == cur else e["source"]
                    if other in visited:
                        continue
                    visited.add(other)
                    node = conn.execute(
                        "SELECT label, type FROM kg_nodes WHERE id=?",
                        (other,)).fetchone()
                    if node:
                        out.append({"label": node["label"],
                                    "type": node["type"] or "concept",
                                    "relation": e["relation"], "distance": d,
                                    "weight": round(float(e["weight"]), 2)})
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
    with _local:
        conn = _get_conn()
        scored = []
        for n in conn.execute("SELECT * FROM kg_nodes"):
            overlap = q_tokens & set(_tokens(n["label"]))
            score = len(overlap) * 2 + float(n["weight"] or 1) * 0.1
            if overlap:
                scored.append((score, dict(n)))
        scored.sort(key=lambda x: -x[0])
        lines = []
        seen_labels = set()
        for _, node in scored[:limit]:
            lines.append(f"- {node['label']} ({node['type'] or 'concept'})")
            seen_labels.add(node["label"].lower())
            for nb in neighbours(node["label"], depth=1, limit=4):
                if nb["label"].lower() in seen_labels:
                    continue
                lines.append(f"  · {nb['relation']} → {nb['label']} ({nb['type']})")
                seen_labels.add(nb["label"].lower())
        return "\n".join(lines[:limit * 2])


def graph_stats() -> dict:
    with _local:
        conn = _get_conn()
        nodes = conn.execute("SELECT COUNT(*) c FROM kg_nodes").fetchone()["c"]
        edges = conn.execute("SELECT COUNT(*) c FROM kg_edges").fetchone()["c"]
        lessons = conn.execute("SELECT COUNT(*) c FROM kg_lessons").fetchone()["c"]
        types: dict[str, int] = {}
        for r in conn.execute("SELECT type, COUNT(*) c FROM kg_nodes GROUP BY type"):
            types[r["type"] or "concept"] = r["c"]
        last = conn.execute("SELECT MAX(updated) m FROM kg_nodes").fetchone()["m"] or ""
        return {"nodes": nodes, "edges": edges, "lessons": lessons,
                "types": types, "updated": last, "db": str(DB_PATH)}


def graph_viz_data(max_nodes: int = 300) -> dict:
    """Cytoscape.js-ready document for the dashboard: heaviest nodes first,
    edges between kept nodes only, colour by type."""
    with _local:
        conn = _get_conn()
        rows = conn.execute(
            "SELECT * FROM kg_nodes ORDER BY weight DESC, mentions DESC LIMIT ?",
            (max_nodes,)).fetchall()
        ids = {r["id"] for r in rows}
        nodes = [{"data": {"id": r["id"], "label": r["label"],
                            "type": r["type"] or "concept",
                            "weight": round(float(r["weight"] or 1), 2),
                            "mentions": int(r["mentions"] or 0)},
                  "color": TYPE_COLORS.get(r["type"] or "concept", "#64748b")}
                 for r in rows]
        edges = []
        for e in conn.execute("SELECT * FROM kg_edges"):
            if e["source"] in ids and e["target"] in ids:
                edges.append({"data": {"id": e["id"], "source": e["source"],
                                       "target": e["target"],
                                       "relation": e["relation"],
                                       "weight": round(float(e["weight"] or 1), 2)}})
        return {"nodes": nodes, "edges": edges,
                "colors": TYPE_COLORS, "stats": graph_stats()}


def export_json(path: Optional[str] = None) -> str:
    """Dump the whole graph (for UI visualisation / debugging)."""
    with _local:
        conn = _get_conn()
        g = {
            "nodes": {r["id"]: dict(r) for r in conn.execute("SELECT * FROM kg_nodes")},
            "edges": {r["id"]: dict(r) for r in conn.execute("SELECT * FROM kg_edges")},
            "lessons": [dict(r) for r in conn.execute("SELECT * FROM kg_lessons")],
            "updated": _now(),
        }
    p = Path(path) if path else DB_DIR / "knowledge_graph_export.json"
    p.write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding="utf-8")
    return str(p)


def clear_all() -> None:
    with _local:
        conn = _get_conn()
        conn.executescript("DELETE FROM kg_nodes; DELETE FROM kg_edges;"
                           " DELETE FROM kg_lessons;")
        conn.commit()


# ── self-improvement: lessons ────────────────────────────────────────────────
def record_outcome(task: str, approach: str, success: bool,
                   detail: str = "", lesson: str = "") -> None:
    """Store what was tried and whether it worked. Failures create a lesson
    attached to the task's entities so future attempts can consult it."""
    task = (task or "").strip()
    if not task:
        return
    entry = {
        "id": uuid.uuid4().hex[:8],
        "task": task[:300],
        "approach": (approach or "")[:300],
        "success": bool(success),
        "detail": (detail or "")[:500],
        "lesson": (lesson or "")[:500],
        "time": _now(),
    }
    with _local:
        conn = _get_conn()
        conn.execute(
            "INSERT INTO kg_lessons(id,task,approach,success,detail,lesson,time)"
            " VALUES(?,?,?,?,?,?,?)",
            (entry["id"], entry["task"], entry["approach"],
             1 if entry["success"] else 0, entry["detail"],
             entry["lesson"], entry["time"]))
        # keep history bounded
        conn.execute(
            "DELETE FROM kg_lessons WHERE id NOT IN"
            " (SELECT id FROM kg_lessons ORDER BY time DESC LIMIT 400)")
        conn.commit()
    add_node(task[:120], "task")
    if approach:
        add_node(approach[:120], "concept")
        link(task[:120], approach[:120],
             "succeeded_at" if success else "failed_at",
             1.5 if success else 1.0)
    if not success and detail:
        # negative reinforcement: slightly weaken the approach node so planners
        # deprioritise strategies that keep failing
        aid = _node_id(approach[:120] if approach else task[:120])
        with _local:
            conn = _get_conn()
            conn.execute("UPDATE kg_nodes SET weight=MAX(0.2, weight-0.3) WHERE id=?",
                         (aid,))
            conn.commit()


def lessons_for(query: str, limit: int = 5) -> list[dict]:
    q = set(_tokens(query)[:8])
    if not q:
        return []
    with _local:
        conn = _get_conn()
        scored = []
        for le in conn.execute("SELECT * FROM kg_lessons ORDER BY time DESC LIMIT 200"):
            overlap = q & set(_tokens((le["task"] or "") + " " + (le["approach"] or "")))
            if overlap:
                scored.append((len(overlap), dict(le)))
        scored.sort(key=lambda x: -x[0])
        out = []
        for _, le in scored[:limit]:
            le["success"] = bool(le["success"])
            out.append(le)
        return out


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
def _trim(conn: sqlite3.Connection) -> None:
    """Bound growth: keep the heaviest nodes/edges when limits are passed."""
    c = conn.execute("SELECT COUNT(*) c FROM kg_nodes").fetchone()["c"]
    if c > _MAX_NODES:
        conn.execute(
            "DELETE FROM kg_nodes WHERE id NOT IN"
            " (SELECT id FROM kg_nodes ORDER BY weight DESC, updated DESC LIMIT ?)",
            (_MAX_NODES,))
        conn.execute(
            "DELETE FROM kg_edges WHERE source NOT IN (SELECT id FROM kg_nodes)"
            " OR target NOT IN (SELECT id FROM kg_nodes)")
    c = conn.execute("SELECT COUNT(*) c FROM kg_edges").fetchone()["c"]
    if c > _MAX_EDGES:
        conn.execute(
            "DELETE FROM kg_edges WHERE id NOT IN"
            " (SELECT id FROM kg_edges ORDER BY weight DESC LIMIT ?)",
            (_MAX_EDGES,))
