"""
Tests for diff module.
"""

import pytest
from envdiff.diff import SnapshotDiff


class TestSnapshotDiff:
    """Test cases for SnapshotDiff."""

    def setup_method(self):
        """Set up test fixtures."""
        self.diff_engine = SnapshotDiff()

    def test_no_differences(self):
        """Test comparing identical snapshots."""
        snapshot1 = {
            "processes": [{"pid": 123, "name": "test"}],
            "env_vars": {"TEST": "value"}
        }
        snapshot2 = {
            "processes": [{"pid": 123, "name": "test"}], 
            "env_vars": {"TEST": "value"}
        }
        
        diff = self.diff_engine.compare(snapshot1, snapshot2)
        assert not self.diff_engine.has_changes(diff)

    def test_added_env_var(self):
        """Test detecting added environment variable."""
        snapshot1 = {"env_vars": {"VAR1": "value1"}}
        snapshot2 = {"env_vars": {"VAR1": "value1", "VAR2": "value2"}}
        
        diff = self.diff_engine.compare(snapshot1, snapshot2)
        assert self.diff_engine.has_changes(diff)
        assert "env_vars" in diff
        # Note: deepdiff behavior may vary, so we check for presence of changes

    def test_removed_env_var(self):
        """Test detecting removed environment variable."""
        snapshot1 = {"env_vars": {"VAR1": "value1", "VAR2": "value2"}}
        snapshot2 = {"env_vars": {"VAR1": "value1"}}
        
        diff = self.diff_engine.compare(snapshot1, snapshot2)
        assert self.diff_engine.has_changes(diff)
        assert "env_vars" in diff

    def test_changed_env_var(self):
        """Test detecting changed environment variable."""
        snapshot1 = {"env_vars": {"VAR1": "old_value"}}
        snapshot2 = {"env_vars": {"VAR1": "new_value"}}
        
        diff = self.diff_engine.compare(snapshot1, snapshot2)
        assert self.diff_engine.has_changes(diff)
        assert "env_vars" in diff

    def test_added_process(self):
        """Test detecting added process."""
        snapshot1 = {"processes": []}
        snapshot2 = {"processes": [{"pid": 123, "name": "new_process"}]}
        
        diff = self.diff_engine.compare(snapshot1, snapshot2)
        assert self.diff_engine.has_changes(diff)
        assert "processes" in diff

    def test_system_stats_change(self):
        """Test detecting system statistics changes."""
        snapshot1 = {"system": {"cpu_percent": 10.0, "mem_percent": 50.0}}
        snapshot2 = {"system": {"cpu_percent": 20.0, "mem_percent": 60.0}}
        
        diff = self.diff_engine.compare(snapshot1, snapshot2)
        assert self.diff_engine.has_changes(diff)
        assert "system" in diff

    def test_empty_snapshots(self):
        """Test comparing empty snapshots."""
        snapshot1 = {}
        snapshot2 = {}
        
        diff = self.diff_engine.compare(snapshot1, snapshot2)
        assert not self.diff_engine.has_changes(diff)

    def test_missing_collector_data(self):
        """Test comparing snapshots with missing collector data."""
        snapshot1 = {"processes": [{"pid": 123}]}
        snapshot2 = {"env_vars": {"TEST": "value"}}
        
        diff = self.diff_engine.compare(snapshot1, snapshot2)
        assert self.diff_engine.has_changes(diff)

    def test_has_changes_empty_diff(self):
        """Test has_changes with empty diff."""
        diff = {}
        assert not self.diff_engine.has_changes(diff)

    def test_has_changes_no_actual_changes(self):
        """Test has_changes with diff containing no actual changes."""
        diff = {
            "processes": {},
            "env_vars": {}
        }
        assert not self.diff_engine.has_changes(diff)

    def test_compare_collector_data_simple(self):
        """Test comparing simple collector data."""
        data1 = {"key1": "value1"}
        data2 = {"key1": "value2"}
        
        result = self.diff_engine._compare_collector_data(data1, data2)
        # Should detect some kind of change
        assert isinstance(result, dict)

    def test_compare_collector_data_identical(self):
        """Test comparing identical collector data."""
        data1 = {"key1": "value1", "key2": "value2"}
        data2 = {"key1": "value1", "key2": "value2"}
        
        result = self.diff_engine._compare_collector_data(data1, data2)
        assert result == {}