"""
Packages collector - captures installed package versions for pip, npm, brew.
"""

import subprocess
import json
from typing import Dict, Any


class PackagesCollector:
    """Collector for installed packages across different package managers."""

    def collect(self) -> Dict[str, Dict[str, str]]:
        """
        Collect installed packages from pip, npm, and brew.
        
        Returns:
            Dictionary with package managers as keys and package:version dicts as values.
        """
        packages = {
            'pip': {},
            'npm': {},  
            'brew': {}
        }
        
        # Collect pip packages
        try:
            result = subprocess.run(
                ['pip3', 'list', '--format=json'], 
                capture_output=True, 
                text=True, 
                timeout=30
            )
            if result.returncode == 0:
                pip_packages = json.loads(result.stdout)
                if isinstance(pip_packages, list):
                    packages['pip'] = {
                        pkg['name']: pkg['version'] 
                        for pkg in pip_packages 
                        if isinstance(pkg, dict) and 'name' in pkg and 'version' in pkg
                    }
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, json.JSONDecodeError, FileNotFoundError, TypeError, KeyError):
            packages['pip'] = {'error': 'pip collection failed'}

        # Collect npm global packages
        try:
            result = subprocess.run(
                ['npm', 'list', '-g', '--depth=0', '--json'], 
                capture_output=True, 
                text=True, 
                timeout=30
            )
            if result.returncode == 0:
                npm_data = json.loads(result.stdout)
                if 'dependencies' in npm_data:
                    packages['npm'] = {
                        name: info['version'] 
                        for name, info in npm_data['dependencies'].items()
                        if isinstance(info, dict) and 'version' in info
                    }
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, json.JSONDecodeError, FileNotFoundError):
            packages['npm'] = {'error': 'npm collection failed'}

        # Collect brew packages (macOS only)
        try:
            result = subprocess.run(
                ['brew', 'list', '--versions'], 
                capture_output=True, 
                text=True, 
                timeout=30
            )
            if result.returncode == 0:
                brew_packages = {}
                for line in result.stdout.strip().split('\n'):
                    if line.strip():
                        parts = line.split()
                        if len(parts) >= 2:
                            name = parts[0]
                            # Take the last version if multiple exist
                            version = parts[-1]
                            brew_packages[name] = version
                packages['brew'] = brew_packages
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError):
            packages['brew'] = {'error': 'brew collection failed (not installed or not macOS)'}

        return packages