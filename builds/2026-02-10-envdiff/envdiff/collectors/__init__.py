"""
Data collectors for environment snapshots.
"""

from .processes import ProcessCollector
from .network import NetworkCollector
from .env_vars import EnvVarsCollector
from .packages import PackagesCollector
from .files import FilesCollector
from .system import SystemCollector

# All available collectors
ALL_COLLECTORS = [
    ProcessCollector(),
    NetworkCollector(),
    EnvVarsCollector(),
    PackagesCollector(),
    FilesCollector(),
    SystemCollector(),
]

__all__ = [
    "ProcessCollector",
    "NetworkCollector", 
    "EnvVarsCollector",
    "PackagesCollector",
    "FilesCollector",
    "SystemCollector",
    "ALL_COLLECTORS",
]