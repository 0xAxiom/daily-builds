"""
Storage module for managing SQLite snapshots database.
"""

import json
import sqlite3
import time
from pathlib import Path
from typing import Dict, List, Optional


class SnapshotStorage:
    """SQLite storage for environment snapshots."""

    def __init__(self, db_path: Optional[str] = None):
        """Initialize storage with database path."""
        if db_path is None:
            # Default to ~/.envdiff/snapshots.db
            home_dir = Path.home()
            envdiff_dir = home_dir / ".envdiff"
            envdiff_dir.mkdir(exist_ok=True)
            db_path = str(envdiff_dir / "snapshots.db")
        
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initialize the database with required tables."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS snapshots (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    data JSON NOT NULL
                )
            """)
            conn.commit()

    def save_snapshot(self, snapshot_id: str, name: str, data: Dict) -> None:
        """Save a snapshot to the database."""
        timestamp = time.time()
        data_json = json.dumps(data, indent=2)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO snapshots (id, name, timestamp, data) VALUES (?, ?, ?, ?)",
                (snapshot_id, name, timestamp, data_json)
            )
            conn.commit()

    def get_snapshot(self, snapshot_id: str) -> Optional[Dict]:
        """Get a snapshot by ID."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT data FROM snapshots WHERE id = ? OR name = ?",
                (snapshot_id, snapshot_id)
            )
            row = cursor.fetchone()
            if row:
                return json.loads(row[0])
        return None

    def list_snapshots(self) -> List[Dict]:
        """List all snapshots with metadata."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT id, name, timestamp FROM snapshots ORDER BY timestamp DESC"
            )
            snapshots = []
            for row in cursor.fetchall():
                snapshots.append({
                    "id": row[0],
                    "name": row[1],
                    "timestamp": row[2]
                })
            return snapshots

    def delete_snapshot(self, snapshot_id: str) -> bool:
        """Delete a snapshot by ID or name."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "DELETE FROM snapshots WHERE id = ? OR name = ?",
                (snapshot_id, snapshot_id)
            )
            conn.commit()
            return cursor.rowcount > 0

    def snapshot_exists(self, snapshot_id: str) -> bool:
        """Check if a snapshot exists by ID or name."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT 1 FROM snapshots WHERE id = ? OR name = ?",
                (snapshot_id, snapshot_id)
            )
            return cursor.fetchone() is not None