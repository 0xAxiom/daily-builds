"""
Environment variables collector - captures current environment variables.
"""

import os
from typing import Dict, Any


class EnvVarsCollector:
    """Collector for environment variables."""

    # Sensitive env vars to exclude for security
    EXCLUDED_VARS = {
        'PATH',  # Too long and changes frequently
        'PWD',   # Current directory changes frequently  
        'OLDPWD',  # Previous directory
        'SHLVL',   # Shell level changes
        '_',       # Last command
        'PS1',     # Prompt string
        'PS2',     # Secondary prompt
        'HISTFILE',  # History file path
        'SSH_CLIENT',  # SSH connection info
        'SSH_CONNECTION',  # SSH connection details
        'SSH_TTY',  # SSH TTY
    }

    def collect(self) -> Dict[str, Any]:
        """
        Collect current environment variables.
        
        Returns:
            Dictionary of environment variable names to values.
        """
        env_vars = {}
        
        try:
            for key, value in os.environ.items():
                # Skip excluded variables
                if key in self.EXCLUDED_VARS:
                    continue
                    
                # Skip variables with sensitive keywords
                if any(sensitive in key.lower() for sensitive in ['password', 'secret', 'token', 'key', 'auth']):
                    env_vars[key] = '[REDACTED]'
                else:
                    # Truncate very long values
                    if len(value) > 500:
                        env_vars[key] = value[:497] + '...'
                    else:
                        env_vars[key] = value
                        
        except Exception as e:
            # If env var collection fails, return error
            return {'error': f'EnvVarsCollector failed: {str(e)}'}
        
        return env_vars