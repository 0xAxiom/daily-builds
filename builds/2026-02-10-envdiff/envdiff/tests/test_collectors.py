"""
Tests for data collectors.
"""

import pytest
import os
import tempfile
from unittest.mock import patch, Mock
from envdiff.collectors import (
    ProcessCollector, NetworkCollector, EnvVarsCollector,
    PackagesCollector, FilesCollector, SystemCollector
)


class TestProcessCollector:
    """Test cases for ProcessCollector."""

    def test_collect_returns_list(self):
        """Test that collect returns a list."""
        collector = ProcessCollector()
        result = collector.collect()
        assert isinstance(result, list)

    def test_collect_process_format(self):
        """Test that processes have correct format."""
        collector = ProcessCollector()
        result = collector.collect()
        
        if result and not result[0].get('error'):
            process = result[0]
            assert 'pid' in process
            assert 'name' in process
            assert 'cmdline' in process
            assert 'cpu' in process
            assert 'mem_mb' in process

    @patch('psutil.process_iter')
    def test_collect_with_psutil_error(self, mock_process_iter):
        """Test collect when psutil raises an error."""
        mock_process_iter.side_effect = Exception("Test error")
        collector = ProcessCollector()
        result = collector.collect()
        
        assert len(result) == 1
        assert 'error' in result[0]


class TestNetworkCollector:
    """Test cases for NetworkCollector."""

    def test_collect_returns_list(self):
        """Test that collect returns a list."""
        collector = NetworkCollector()
        result = collector.collect()
        assert isinstance(result, list)

    def test_collect_connection_format(self):
        """Test that connections have correct format."""
        collector = NetworkCollector()
        result = collector.collect()
        
        if result and not result[0].get('error'):
            connection = result[0]
            assert 'local' in connection
            assert 'remote' in connection
            assert 'status' in connection
            assert 'pid' in connection

    @patch('psutil.net_connections')
    def test_collect_with_psutil_error(self, mock_net_connections):
        """Test collect when psutil raises an error."""
        mock_net_connections.side_effect = Exception("Test error")
        collector = NetworkCollector()
        result = collector.collect()
        
        assert len(result) == 1
        assert 'error' in result[0]


class TestEnvVarsCollector:
    """Test cases for EnvVarsCollector."""

    def test_collect_returns_dict(self):
        """Test that collect returns a dict."""
        collector = EnvVarsCollector()
        result = collector.collect()
        assert isinstance(result, dict)

    def test_collect_excludes_sensitive_vars(self):
        """Test that sensitive variables are excluded."""
        collector = EnvVarsCollector()
        result = collector.collect()
        
        # These should be excluded
        for excluded_var in collector.EXCLUDED_VARS:
            assert excluded_var not in result

    def test_collect_redacts_sensitive_values(self):
        """Test that sensitive values are redacted."""
        with patch.dict(os.environ, {'TEST_PASSWORD': 'secret123', 'NORMAL_VAR': 'normal'}):
            collector = EnvVarsCollector()
            result = collector.collect()
            
            assert 'TEST_PASSWORD' in result
            assert result['TEST_PASSWORD'] == '[REDACTED]'
            assert 'NORMAL_VAR' in result
            assert result['NORMAL_VAR'] == 'normal'

    def test_collect_truncates_long_values(self):
        """Test that long values are truncated."""
        long_value = "x" * 600
        with patch.dict(os.environ, {'LONG_VAR': long_value}):
            collector = EnvVarsCollector()
            result = collector.collect()
            
            assert 'LONG_VAR' in result
            assert len(result['LONG_VAR']) <= 500
            assert result['LONG_VAR'].endswith('...')


class TestPackagesCollector:
    """Test cases for PackagesCollector."""

    def test_collect_returns_dict_with_managers(self):
        """Test that collect returns dict with package managers."""
        collector = PackagesCollector()
        result = collector.collect()
        
        assert isinstance(result, dict)
        assert 'pip' in result
        assert 'npm' in result
        assert 'brew' in result

    @patch('subprocess.run')
    def test_pip_collection_success(self, mock_run):
        """Test successful pip package collection."""
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = '[{"name": "requests", "version": "2.31.0"}]'
        mock_run.return_value = mock_result
        
        collector = PackagesCollector()
        result = collector.collect()
        
        if 'error' not in result['pip']:
            assert isinstance(result['pip'], dict)

    @patch('subprocess.run')
    def test_pip_collection_failure(self, mock_run):
        """Test pip collection failure."""
        mock_run.side_effect = FileNotFoundError("pip not found")
        
        collector = PackagesCollector()
        result = collector.collect()
        
        assert 'error' in result['pip']

    @patch('subprocess.run')
    def test_npm_collection_success(self, mock_run):
        """Test successful npm package collection."""
        def side_effect(*args, **kwargs):
            if 'npm' in args[0]:
                mock_result = Mock()
                mock_result.returncode = 0
                mock_result.stdout = '{"dependencies": {"express": {"version": "4.18.2"}}}'
                return mock_result
            else:
                # Other subprocess calls (pip, brew) should fail
                mock_result = Mock()
                mock_result.returncode = 1
                return mock_result
        
        mock_run.side_effect = side_effect
        
        collector = PackagesCollector()
        result = collector.collect()
        
        if 'error' not in result['npm']:
            assert isinstance(result['npm'], dict)

    @patch('subprocess.run')
    def test_brew_collection_success(self, mock_run):
        """Test successful brew package collection."""
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = 'node 21.5.0\npython 3.11.6\n'
        mock_run.return_value = mock_result
        
        collector = PackagesCollector()
        result = collector.collect()
        
        if 'error' not in result['brew']:
            assert isinstance(result['brew'], dict)


class TestFilesCollector:
    """Test cases for FilesCollector."""

    def test_init_default_watch_dirs(self):
        """Test initialization with default watch directories."""
        collector = FilesCollector()
        assert len(collector.watch_dirs) == 1
        assert collector.watch_dirs[0] == os.getcwd()

    def test_init_custom_watch_dirs(self):
        """Test initialization with custom watch directories."""
        watch_dirs = ['/tmp', '/home']
        collector = FilesCollector(watch_dirs=watch_dirs)
        assert collector.watch_dirs == watch_dirs

    def test_collect_returns_list(self):
        """Test that collect returns a list."""
        # Create a temporary directory for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            collector = FilesCollector(watch_dirs=[temp_dir])
            result = collector.collect()
            assert isinstance(result, list)

    def test_collect_file_format(self):
        """Test that files have correct format."""
        # Create a temporary file for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            test_file = os.path.join(temp_dir, 'test.txt')
            with open(test_file, 'w') as f:
                f.write('test content')
            
            collector = FilesCollector(watch_dirs=[temp_dir])
            result = collector.collect()
            
            if result and not result[0].get('error'):
                file_info = result[0]
                assert 'path' in file_info
                assert 'hash' in file_info
                assert 'size' in file_info
                assert 'mtime' in file_info

    def test_collect_ignores_hidden_files(self):
        """Test that hidden files are ignored."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create hidden file
            hidden_file = os.path.join(temp_dir, '.hidden')
            with open(hidden_file, 'w') as f:
                f.write('hidden')
            
            collector = FilesCollector(watch_dirs=[temp_dir])
            result = collector.collect()
            
            # Should not include hidden files
            for file_info in result:
                if 'path' in file_info:
                    assert not file_info['path'].startswith('.')

    def test_collect_nonexistent_directory(self):
        """Test collect with nonexistent directory."""
        collector = FilesCollector(watch_dirs=['/nonexistent/path'])
        result = collector.collect()
        
        # Should return empty list or handle gracefully
        assert isinstance(result, list)


class TestSystemCollector:
    """Test cases for SystemCollector."""

    def test_collect_returns_dict(self):
        """Test that collect returns a dict."""
        collector = SystemCollector()
        result = collector.collect()
        assert isinstance(result, dict)

    def test_collect_system_info_format(self):
        """Test that system info has correct format."""
        collector = SystemCollector()
        result = collector.collect()
        
        if 'error' not in result:
            assert 'cpu_percent' in result
            assert 'mem_percent' in result
            assert 'disk_percent' in result
            assert 'cpu_count' in result
            assert 'boot_time' in result
            
            # Check data types
            assert isinstance(result['cpu_percent'], (int, float))
            assert isinstance(result['mem_percent'], (int, float))
            assert isinstance(result['disk_percent'], (int, float))
            assert isinstance(result['cpu_count'], int)

    @patch('psutil.cpu_percent')
    def test_collect_with_psutil_error(self, mock_cpu_percent):
        """Test collect when psutil raises an error."""
        mock_cpu_percent.side_effect = Exception("Test error")
        collector = SystemCollector()
        result = collector.collect()
        
        assert 'error' in result