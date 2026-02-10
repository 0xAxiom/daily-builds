"""
Tests for CLI module.
"""

import pytest
import tempfile
import os
from unittest.mock import patch, Mock
from click.testing import CliRunner
from envdiff.cli import cli


class TestCLI:
    """Test cases for CLI commands."""

    def setup_method(self):
        """Set up test fixtures."""
        self.runner = CliRunner()
        self.temp_db = None

    def teardown_method(self):
        """Clean up test fixtures."""
        if self.temp_db and os.path.exists(self.temp_db):
            os.remove(self.temp_db)

    def get_temp_db(self):
        """Get a temporary database path."""
        if not self.temp_db:
            fd, self.temp_db = tempfile.mkstemp(suffix='.db')
            os.close(fd)
        return self.temp_db

    def test_cli_help(self):
        """Test CLI help command."""
        result = self.runner.invoke(cli, ['--help'])
        assert result.exit_code == 0
        assert 'envdiff' in result.output
        assert 'Environment change detector' in result.output

    @patch('envdiff.cli.SnapshotEngine')
    @patch('envdiff.cli.SnapshotStorage')
    def test_snap_command(self, mock_storage_class, mock_engine_class):
        """Test snap command."""
        # Mock engine
        mock_engine = Mock()
        mock_engine.capture_named.return_value = ('test-snap', {'test': 'data'})
        mock_engine_class.return_value = mock_engine
        
        # Mock storage
        mock_storage = Mock()
        mock_storage_class.return_value = mock_storage
        
        result = self.runner.invoke(cli, ['snap', 'test-snapshot'])
        assert result.exit_code == 0
        
        mock_engine.capture_named.assert_called_once_with('test-snapshot')
        mock_storage.save_snapshot.assert_called_once()

    @patch('envdiff.cli.SnapshotEngine')
    @patch('envdiff.cli.SnapshotStorage')
    def test_snap_command_auto_name(self, mock_storage_class, mock_engine_class):
        """Test snap command with auto-generated name."""
        # Mock engine
        mock_engine = Mock()
        mock_engine.capture_named.return_value = ('auto-snap-123', {'test': 'data'})
        mock_engine_class.return_value = mock_engine
        
        # Mock storage
        mock_storage = Mock()
        mock_storage_class.return_value = mock_storage
        
        result = self.runner.invoke(cli, ['snap'])
        assert result.exit_code == 0
        
        mock_engine.capture_named.assert_called_once_with(None)

    @patch('envdiff.cli.SnapshotEngine')
    @patch('envdiff.cli.SnapshotStorage')
    def test_snap_command_error(self, mock_storage_class, mock_engine_class):
        """Test snap command with error."""
        mock_engine_class.side_effect = Exception("Test error")
        
        result = self.runner.invoke(cli, ['snap', 'test'])
        assert result.exit_code == 1
        assert 'Failed to create snapshot' in result.output

    @patch('envdiff.cli.SnapshotStorage')
    def test_list_command(self, mock_storage_class):
        """Test list command."""
        # Mock storage
        mock_storage = Mock()
        mock_storage.list_snapshots.return_value = [
            {'id': 'snap1', 'name': 'snapshot1', 'timestamp': 1234567890},
            {'id': 'snap2', 'name': 'snapshot2', 'timestamp': 1234567891}
        ]
        mock_storage_class.return_value = mock_storage
        
        result = self.runner.invoke(cli, ['list'])
        assert result.exit_code == 0
        
        mock_storage.list_snapshots.assert_called_once()

    @patch('envdiff.cli.SnapshotStorage')
    def test_list_command_error(self, mock_storage_class):
        """Test list command with error."""
        mock_storage_class.side_effect = Exception("Test error")
        
        result = self.runner.invoke(cli, ['list'])
        assert result.exit_code == 1
        assert 'Failed to list snapshots' in result.output

    @patch('envdiff.cli.SnapshotEngine')
    @patch('envdiff.cli.SnapshotStorage')
    @patch('envdiff.cli.SnapshotDiff')
    def test_compare_command_two_snapshots(self, mock_diff_class, mock_storage_class, mock_engine_class):
        """Test compare command with two snapshots."""
        # Mock storage
        mock_storage = Mock()
        mock_storage.get_snapshot.side_effect = [
            {'processes': []},  # snap1
            {'processes': [{'pid': 123}]}  # snap2
        ]
        mock_storage_class.return_value = mock_storage
        
        # Mock diff engine
        mock_diff = Mock()
        mock_diff.compare.return_value = {'processes': {'added': {'pid': 123}}}
        mock_diff.has_changes.return_value = True
        mock_diff_class.return_value = mock_diff
        
        result = self.runner.invoke(cli, ['compare', 'snap1', 'snap2'])
        assert result.exit_code == 1  # Exit code 1 indicates changes found
        
        mock_storage.get_snapshot.assert_called()
        mock_diff.compare.assert_called_once()

    @patch('envdiff.cli.SnapshotEngine')
    @patch('envdiff.cli.SnapshotStorage')
    @patch('envdiff.cli.SnapshotDiff')
    def test_compare_command_with_current(self, mock_diff_class, mock_storage_class, mock_engine_class):
        """Test compare command with current state."""
        # Mock storage
        mock_storage = Mock()
        mock_storage.get_snapshot.return_value = {'processes': []}
        mock_storage_class.return_value = mock_storage
        
        # Mock engine for current state
        mock_engine = Mock()
        mock_engine.capture.return_value = {'processes': [{'pid': 123}]}
        mock_engine_class.return_value = mock_engine
        
        # Mock diff engine
        mock_diff = Mock()
        mock_diff.compare.return_value = {}
        mock_diff.has_changes.return_value = False
        mock_diff_class.return_value = mock_diff
        
        result = self.runner.invoke(cli, ['compare', 'snap1'])
        assert result.exit_code == 0  # No changes
        
        mock_engine.capture.assert_called_once()

    @patch('envdiff.cli.SnapshotStorage')
    def test_compare_command_snapshot_not_found(self, mock_storage_class):
        """Test compare command with nonexistent snapshot."""
        mock_storage = Mock()
        mock_storage.get_snapshot.return_value = None
        mock_storage_class.return_value = mock_storage
        
        result = self.runner.invoke(cli, ['compare', 'nonexistent'])
        assert result.exit_code == 1
        assert 'not found' in result.output

    @patch('envdiff.cli.SnapshotStorage')
    def test_delete_command(self, mock_storage_class):
        """Test delete command."""
        mock_storage = Mock()
        mock_storage.snapshot_exists.return_value = True
        mock_storage.delete_snapshot.return_value = True
        mock_storage_class.return_value = mock_storage
        
        result = self.runner.invoke(cli, ['delete', 'test-snap'])
        assert result.exit_code == 0
        
        mock_storage.snapshot_exists.assert_called_once_with('test-snap')
        mock_storage.delete_snapshot.assert_called_once_with('test-snap')

    @patch('envdiff.cli.SnapshotStorage')
    def test_delete_command_not_found(self, mock_storage_class):
        """Test delete command with nonexistent snapshot."""
        mock_storage = Mock()
        mock_storage.snapshot_exists.return_value = False
        mock_storage_class.return_value = mock_storage
        
        result = self.runner.invoke(cli, ['delete', 'nonexistent'])
        assert result.exit_code == 1
        assert 'not found' in result.output

    @patch('envdiff.cli.SnapshotStorage')
    def test_export_command(self, mock_storage_class):
        """Test export command."""
        mock_storage = Mock()
        mock_storage.get_snapshot.return_value = {'test': 'data'}
        mock_storage_class.return_value = mock_storage
        
        result = self.runner.invoke(cli, ['export', 'test-snap'])
        assert result.exit_code == 0
        assert '"test"' in result.output and '"data"' in result.output

    @patch('envdiff.cli.SnapshotStorage')
    def test_export_command_not_found(self, mock_storage_class):
        """Test export command with nonexistent snapshot."""
        mock_storage = Mock()
        mock_storage.get_snapshot.return_value = None
        mock_storage_class.return_value = mock_storage
        
        result = self.runner.invoke(cli, ['export', 'nonexistent'])
        assert result.exit_code == 1
        assert 'not found' in result.output

    @patch('envdiff.cli.SnapshotEngine')
    @patch('envdiff.cli.SnapshotStorage')
    @patch('envdiff.cli.SnapshotDiff')
    @patch('time.sleep')
    def test_watch_command_no_changes(self, mock_sleep, mock_diff_class, mock_storage_class, mock_engine_class):
        """Test watch command with no changes."""
        # Mock engine
        mock_engine = Mock()
        mock_engine.capture_named.return_value = ('watch-baseline', {'test': 'data'})
        mock_engine.capture.return_value = {'test': 'data'}  # Same data
        mock_engine_class.return_value = mock_engine
        
        # Mock storage
        mock_storage = Mock()
        mock_storage_class.return_value = mock_storage
        
        # Mock diff engine
        mock_diff = Mock()
        mock_diff.compare.return_value = {}
        mock_diff.has_changes.return_value = False
        mock_diff_class.return_value = mock_diff
        
        # Mock sleep to raise KeyboardInterrupt after first iteration
        mock_sleep.side_effect = KeyboardInterrupt()
        
        result = self.runner.invoke(cli, ['watch', '--interval', '1'])
        assert result.exit_code == 0
        assert 'Monitoring stopped' in result.output

    def test_custom_storage_path(self):
        """Test using custom storage path."""
        temp_db = self.get_temp_db()
        
        with patch('envdiff.cli.SnapshotEngine') as mock_engine_class, \
             patch('envdiff.cli.SnapshotStorage') as mock_storage_class:
            
            mock_engine = Mock()
            mock_engine.capture_named.return_value = ('test', {'data': 'test'})
            mock_engine_class.return_value = mock_engine
            
            mock_storage = Mock()
            mock_storage_class.return_value = mock_storage
            
            result = self.runner.invoke(cli, ['snap', 'test', '--storage', temp_db])
            assert result.exit_code == 0
            
            # Check that storage was initialized with custom path
            mock_storage_class.assert_called_once_with(temp_db)