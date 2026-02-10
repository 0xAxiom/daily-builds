"""
System collector - captures CPU, memory, and disk usage statistics.
"""

import psutil
from typing import Dict, Any


class SystemCollector:
    """Collector for system resource usage statistics."""

    def collect(self) -> Dict[str, Any]:
        """
        Collect system resource usage information.
        
        Returns:
            Dictionary with CPU, memory, and disk usage percentages.
        """
        try:
            # Get CPU usage percentage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Get memory usage
            memory = psutil.virtual_memory()
            mem_percent = round(memory.percent, 1)
            
            # Get disk usage for root partition
            disk = psutil.disk_usage('/')
            disk_percent = round((disk.used / disk.total) * 100, 1)
            
            # Get additional system info
            boot_time = psutil.boot_time()
            cpu_count = psutil.cpu_count()
            
            return {
                'cpu_percent': round(cpu_percent, 1),
                'mem_percent': mem_percent,
                'disk_percent': disk_percent,
                'cpu_count': cpu_count,
                'boot_time': boot_time,
                'total_memory_gb': round(memory.total / (1024**3), 2),
                'available_memory_gb': round(memory.available / (1024**3), 2),
                'total_disk_gb': round(disk.total / (1024**3), 2),
                'available_disk_gb': round(disk.free / (1024**3), 2),
            }
            
        except Exception as e:
            return {'error': f'SystemCollector failed: {str(e)}'}