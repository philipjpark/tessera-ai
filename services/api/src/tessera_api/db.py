from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Iterator

SCHEMA = r"""
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  domain TEXT NOT NULL,
  task_type TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  sensitive_area TEXT,
  constraints_json TEXT NOT NULL,
  repository_path TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS routing_decisions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  workflow TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  history_cutoff_at TEXT NOT NULL,
  reason_codes_json TEXT NOT NULL,
  rationale TEXT NOT NULL,
  candidate_scores_json TEXT NOT NULL,
  decided_at TEXT NOT NULL,
  forced_experiment INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  routing_decision_id TEXT NOT NULL REFERENCES routing_decisions(id),
  runtime TEXT NOT NULL,
  workflow TEXT NOT NULL,
  base_commit TEXT,
  result_commit TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  elapsed_ms REAL,
  cost_usd REAL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES executions(id),
  verdict TEXT NOT NULL,
  checks_json TEXT NOT NULL,
  evidence_artifact_ids_json TEXT NOT NULL,
  evaluated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS outcomes (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL UNIQUE REFERENCES executions(id),
  task_id TEXT NOT NULL REFERENCES tasks(id),
  workflow TEXT NOT NULL,
  verified INTEGER NOT NULL,
  failure_category TEXT,
  observed_elapsed_ms REAL,
  recorded_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS evidence_artifacts (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES executions(id),
  artifact_type TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_outcomes_task_workflow ON outcomes(task_id, workflow);
CREATE INDEX IF NOT EXISTS idx_decisions_task ON routing_decisions(task_id, decided_at);
"""


class Database:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connection() as conn:
            conn.executescript(SCHEMA)

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def execute(self, sql: str, params: tuple[Any, ...] = ()) -> None:
        with self.connection() as conn:
            conn.execute(sql, params)

    def one(self, sql: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
        with self.connection() as conn:
            row = conn.execute(sql, params).fetchone()
            return dict(row) if row else None

    def all(self, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
        with self.connection() as conn:
            return [dict(r) for r in conn.execute(sql, params).fetchall()]


def dumps(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), sort_keys=True, default=str)


def loads(value: str | None) -> Any:
    return json.loads(value) if value else None


def dt(value: str | None) -> datetime | None:
    return datetime.fromisoformat(value) if value else None
