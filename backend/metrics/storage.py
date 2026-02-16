"""SQLite-backed persistent storage for benchmark metrics."""

from __future__ import annotations

import sqlite3
import threading
import time
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "metrics.db"


class MetricsStorage:
    """Persists inference metrics to SQLite for historical analysis."""

    def __init__(self, db_path: Path = DB_PATH):
        self._db_path = db_path
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._local = threading.local()
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, "conn") or self._local.conn is None:
            self._local.conn = sqlite3.connect(str(self._db_path))
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn

    def _init_db(self) -> None:
        conn = self._get_conn()
        conn.execute("""
            CREATE TABLE IF NOT EXISTS metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                optimization_mode TEXT NOT NULL,
                latency_ms REAL NOT NULL,
                tokens_per_sec REAL NOT NULL,
                memory_mb REAL NOT NULL,
                tokens_generated INTEGER NOT NULL,
                timestamp REAL NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_mode ON metrics(optimization_mode)
        """)
        conn.commit()

    def save(
        self,
        optimization_mode: str,
        latency_ms: float,
        tokens_per_sec: float,
        memory_mb: float,
        tokens_generated: int,
    ) -> None:
        conn = self._get_conn()
        conn.execute(
            """INSERT INTO metrics
               (optimization_mode, latency_ms, tokens_per_sec, memory_mb, tokens_generated, timestamp)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (optimization_mode, latency_ms, tokens_per_sec, memory_mb, tokens_generated, time.time()),
        )
        conn.commit()

    def get_history(self, mode: str | None = None, limit: int = 1000) -> list[dict]:
        conn = self._get_conn()
        if mode:
            rows = conn.execute(
                "SELECT * FROM metrics WHERE optimization_mode = ? ORDER BY timestamp DESC LIMIT ?",
                (mode, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM metrics ORDER BY timestamp DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [dict(r) for r in rows]

    def get_total_count(self) -> int:
        conn = self._get_conn()
        row = conn.execute("SELECT COUNT(*) as cnt FROM metrics").fetchone()
        return row["cnt"]
