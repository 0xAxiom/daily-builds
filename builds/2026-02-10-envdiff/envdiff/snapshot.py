"""
Snapshot module - orchestrates data collection from all collectors.
"""

import uuid
from datetime import datetime
from typing import Dict, Any, List

from .collectors import ALL_COLLECTORS


class SnapshotEngine:
    """Engine for capturing environment snapshots."""

    def __init__(self, collectors: List = None):
        """
        Initialize snapshot engine with collectors.
        
        Args:
            collectors: List of collector instances. Defaults to all collectors.
        """
        self.collectors = collectors or ALL_COLLECTORS

    def capture(self) -> Dict[str, Any]:
        """
        Capture a complete environment snapshot.
        
        Returns:
            Dictionary containing data from all collectors.
        """
        snapshot = {}
        
        for collector in self.collectors:
            collector_name = collector.__class__.__name__.replace('Collector', '').lower()
            
            try:
                data = collector.collect()
                snapshot[collector_name] = data
            except Exception as e:
                # If a collector fails, record the error but continue
                snapshot[collector_name] = {'error': f'Collection failed: {str(e)}'}
        
        return snapshot

    def generate_snapshot_id(self, name: str = None) -> str:
        """
        Generate a unique snapshot ID.
        
        Args:
            name: Optional custom name. If not provided, uses timestamp.
            
        Returns:
            Snapshot ID string.
        """
        if name:
            return name
        else:
            # Generate timestamp-based ID
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            return f"snapshot-{timestamp}"

    def capture_named(self, name: str = None) -> tuple[str, Dict[str, Any]]:
        """
        Capture a snapshot with a specific name.
        
        Args:
            name: Snapshot name. If not provided, auto-generates from timestamp.
            
        Returns:
            Tuple of (snapshot_id, snapshot_data).
        """
        snapshot_id = self.generate_snapshot_id(name)
        snapshot_data = self.capture()
        
        return snapshot_id, snapshot_data