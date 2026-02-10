"""
Process collector - captures running processes and their details.
"""

import psutil
from typing import List, Dict, Any


class ProcessCollector:
    """Collector for running processes and their metadata."""

    def collect(self) -> List[Dict[str, Any]]:
        """
        Collect information about all running processes.
        
        Returns:
            List of process dictionaries with pid, name, cmdline, cpu, memory.
        """
        processes = []
        
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'cpu_percent', 'memory_info']):
                try:
                    # Get process info
                    info = proc.info
                    
                    # Skip kernel processes and those without cmdline
                    if not info['cmdline']:
                        continue
                    
                    # Get memory in MB
                    mem_mb = 0
                    if info['memory_info']:
                        mem_mb = round(info['memory_info'].rss / 1024 / 1024, 1)
                    
                    # Join cmdline arguments
                    cmdline = ' '.join(info['cmdline']) if info['cmdline'] else ''
                    
                    processes.append({
                        'pid': info['pid'],
                        'name': info['name'],
                        'cmdline': cmdline,
                        'cpu': info.get('cpu_percent', 0.0),
                        'mem_mb': mem_mb
                    })
                    
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    # Process disappeared or access denied - skip it
                    continue
                    
        except Exception as e:
            # If psutil fails entirely, return empty list with error marker
            return [{'error': f'ProcessCollector failed: {str(e)}'}]
        
        # Sort by memory usage (descending) and limit to top 100 processes
        processes.sort(key=lambda x: x.get('mem_mb', 0), reverse=True)
        return processes[:100]