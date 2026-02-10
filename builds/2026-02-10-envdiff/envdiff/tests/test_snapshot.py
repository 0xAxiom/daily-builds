"""
Tests for snapshot module.
"""

import pytest
from unittest.mock import Mock, patch
from envdiff.snapshot import SnapshotEngine
from envdiff.collectors import ProcessCollector


class TestSnapshotEngine:
    """Test cases for SnapshotEngine."""

    def test_init_with_default_collectors(self):
        """Test initialization with default collectors."""
        engine = SnapshotEngine()
        assert len(engine.collectors) > 0
        assert any(isinstance(c, ProcessCollector) for c in engine.collectors)

    def test_init_with_custom_collectors(self):
        """Test initialization with custom collectors."""
        mock_collector = Mock()
        engine = SnapshotEngine([mock_collector])
        assert len(engine.collectors) == 1
        assert engine.collectors[0] == mock_collector

    def test_generate_snapshot_id_with_name(self):
        """Test snapshot ID generation with custom name."""
        engine = SnapshotEngine()
        snapshot_id = engine.generate_snapshot_id("test-snapshot")
        assert snapshot_id == "test-snapshot"

    def test_generate_snapshot_id_auto(self):
        """Test automatic snapshot ID generation."""
        engine = SnapshotEngine()
        snapshot_id = engine.generate_snapshot_id()
        assert snapshot_id.startswith("snapshot-")
        assert len(snapshot_id) > 10

    def test_capture(self):
        """Test snapshot capture."""
        # Mock collector
        mock_collector = Mock()
        mock_collector.__class__.__name__ = "TestCollector"
        mock_collector.collect.return_value = {"test": "data"}
        
        engine = SnapshotEngine([mock_collector])
        snapshot = engine.capture()
        
        assert "test" in snapshot
        assert snapshot["test"] == {"test": "data"}
        mock_collector.collect.assert_called_once()

    def test_capture_with_collector_error(self):
        """Test snapshot capture when a collector fails."""
        # Mock collector that raises exception
        mock_collector = Mock()
        mock_collector.__class__.__name__ = "FailingCollector"
        mock_collector.collect.side_effect = Exception("Test error")
        
        engine = SnapshotEngine([mock_collector])
        snapshot = engine.capture()
        
        assert "failing" in snapshot
        assert "error" in snapshot["failing"]
        assert "Test error" in snapshot["failing"]["error"]

    def test_capture_named(self):
        """Test named snapshot capture."""
        mock_collector = Mock()
        mock_collector.__class__.__name__ = "TestCollector"
        mock_collector.collect.return_value = {"test": "data"}
        
        engine = SnapshotEngine([mock_collector])
        snapshot_id, snapshot_data = engine.capture_named("test-capture")
        
        assert snapshot_id == "test-capture"
        assert "test" in snapshot_data
        assert snapshot_data["test"] == {"test": "data"}

    def test_capture_named_auto_id(self):
        """Test named snapshot capture with auto-generated ID."""
        mock_collector = Mock()
        mock_collector.__class__.__name__ = "TestCollector"
        mock_collector.collect.return_value = {"test": "data"}
        
        engine = SnapshotEngine([mock_collector])
        snapshot_id, snapshot_data = engine.capture_named()
        
        assert snapshot_id.startswith("snapshot-")
        assert "test" in snapshot_data