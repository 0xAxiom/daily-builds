"""
Network collector - captures network connections and listening ports.
"""

import psutil
from typing import List, Dict, Any


class NetworkCollector:
    """Collector for network connections and listening ports."""

    def collect(self) -> List[Dict[str, Any]]:
        """
        Collect information about network connections.
        
        Returns:
            List of connection dictionaries with local, remote, status, pid.
        """
        connections = []
        
        try:
            # Get all network connections
            for conn in psutil.net_connections(kind='inet'):
                try:
                    # Format local address
                    local = f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else ""
                    
                    # Format remote address  
                    remote = f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else ""
                    
                    # Get connection status
                    status = conn.status if conn.status else "UNKNOWN"
                    
                    connections.append({
                        'local': local,
                        'remote': remote,
                        'status': status,
                        'pid': conn.pid if conn.pid else None
                    })
                    
                except (AttributeError, psutil.AccessDenied):
                    # Some connections may not have full info - skip them
                    continue
                    
        except Exception as e:
            # If network collection fails entirely, return error marker
            return [{'error': f'NetworkCollector failed: {str(e)}'}]
        
        # Sort by local port for consistent ordering
        connections.sort(key=lambda x: (x.get('local', ''), x.get('status', '')))
        
        # Limit to reasonable number to avoid huge snapshots
        return connections[:200]