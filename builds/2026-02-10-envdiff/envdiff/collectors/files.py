"""
Files collector - captures file checksums and metadata for watched directories.
"""

import hashlib
import os
from pathlib import Path
from typing import List, Dict, Any


class FilesCollector:
    """Collector for file checksums and metadata."""

    def __init__(self, watch_dirs: List[str] = None, max_files: int = 1000):
        """
        Initialize file collector.
        
        Args:
            watch_dirs: List of directories to watch. Defaults to current working directory.
            max_files: Maximum number of files to track.
        """
        self.watch_dirs = watch_dirs or [os.getcwd()]
        self.max_files = max_files
        
        # File extensions to ignore
        self.ignore_extensions = {
            '.pyc', '.pyo', '.pyd', '__pycache__',
            '.git', '.svn', '.hg',
            '.DS_Store', '.localized',
            '.tmp', '.temp', '.swp', '.swo',
            'node_modules', '.venv', 'venv', '.env'
        }

    def collect(self) -> List[Dict[str, Any]]:
        """
        Collect file information from watched directories.
        
        Returns:
            List of file dictionaries with path, hash, size, mtime.
        """
        files = []
        file_count = 0
        
        try:
            for watch_dir in self.watch_dirs:
                if not os.path.exists(watch_dir):
                    continue
                    
                for root, dirs, filenames in os.walk(watch_dir):
                    # Skip hidden and ignored directories
                    dirs[:] = [d for d in dirs if not d.startswith('.') and d not in self.ignore_extensions]
                    
                    for filename in filenames:
                        if file_count >= self.max_files:
                            break
                            
                        # Skip hidden files and ignored extensions
                        if filename.startswith('.'):
                            continue
                            
                        file_path = os.path.join(root, filename)
                        
                        # Skip if extension is ignored
                        if any(ignored in file_path for ignored in self.ignore_extensions):
                            continue
                            
                        try:
                            # Get file stats
                            stat = os.stat(file_path)
                            
                            # Skip very large files (>10MB) to avoid memory issues
                            if stat.st_size > 10 * 1024 * 1024:
                                continue
                                
                            # Calculate file hash for small files only
                            file_hash = None
                            if stat.st_size < 1024 * 1024:  # 1MB limit
                                try:
                                    with open(file_path, 'rb') as f:
                                        content = f.read()
                                        file_hash = hashlib.md5(content).hexdigest()
                                except (IOError, OSError):
                                    file_hash = 'unreadable'
                            else:
                                file_hash = 'large_file'
                                
                            # Make path relative to watch directory
                            rel_path = os.path.relpath(file_path, watch_dir)
                            
                            files.append({
                                'path': rel_path,
                                'hash': file_hash,
                                'size': stat.st_size,
                                'mtime': stat.st_mtime
                            })
                            
                            file_count += 1
                            
                        except (OSError, IOError):
                            # Skip files we can't read
                            continue
                            
                    if file_count >= self.max_files:
                        break
                        
        except Exception as e:
            return [{'error': f'FilesCollector failed: {str(e)}'}]
        
        # Sort by path for consistent ordering
        files.sort(key=lambda x: x.get('path', ''))
        return files