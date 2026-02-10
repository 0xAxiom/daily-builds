# envdiff - Environment Change Detector

> Like `git diff` for your entire machine state

![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

Ever had something break and wondered "what changed?" Git tracks code, but your environment is more than just files. **envdiff** captures snapshots of your entire development environment and shows you exactly what changed between any two points in time.

## What It Captures

- 🔄 **Processes**: Running programs, PIDs, CPU/memory usage
- 🌐 **Network**: Open ports, active connections
- 🔧 **Environment Variables**: Current shell environment
- 📦 **Packages**: pip, npm, brew package versions
- 📁 **Files**: Checksums of watched directories
- 💻 **System**: CPU, memory, disk usage

## Installation

```bash
pip install envdiff
```

Or install from source:
```bash
git clone https://github.com/yourusername/envdiff.git
cd envdiff
pip install -e .
```

## Quick Start

```bash
# Take a snapshot before making changes
envdiff snap before-changes

# Make some changes to your environment...
npm install express
export NEW_VAR="hello"

# Take another snapshot
envdiff snap after-changes

# See what changed
envdiff compare before-changes after-changes
```

## Usage Examples

### Basic Workflow

```bash
# Create a named snapshot
envdiff snap production-baseline

# List all snapshots
envdiff list

# Compare with current state
envdiff compare production-baseline

# Compare two snapshots
envdiff compare snap1 snap2
```

### Continuous Monitoring

```bash
# Monitor for changes every 60 seconds
envdiff watch --interval 60

# Monitor with custom interval
envdiff watch --interval 30
```

### Export and Analysis

```bash
# Export snapshot as JSON
envdiff export my-snapshot --format json > snapshot.json

# Delete old snapshots
envdiff delete old-snapshot
```

## Command Reference

### `envdiff snap [NAME]`
Create a snapshot of the current environment state.

```bash
envdiff snap                    # Auto-named with timestamp
envdiff snap my-snapshot        # Named snapshot
envdiff snap --storage /path/to/db.sqlite  # Custom database location
```

### `envdiff list`
List all stored snapshots with creation timestamps.

### `envdiff compare SNAP1 [SNAP2]`
Compare two snapshots or compare a snapshot with current state.

```bash
envdiff compare baseline                    # Compare with current
envdiff compare baseline production         # Compare two snapshots
```

Exit codes:
- `0`: No differences found
- `1`: Differences detected (like `git diff`)

### `envdiff watch`
Continuously monitor environment for changes.

```bash
envdiff watch                              # Default 60s interval
envdiff watch --interval 30                # Custom interval
```

Press `Ctrl+C` to stop monitoring.

### `envdiff delete NAME`
Remove a stored snapshot.

### `envdiff export NAME`
Export snapshot data in JSON format.

## Output Examples

### Snapshot List
```
Environment Snapshots
┌─────────────────┬──────────────────┬─────────────────────┐
│ ID              │ Name             │ Created             │
├─────────────────┼──────────────────┼─────────────────────┤
│ baseline        │ baseline         │ 2024-01-10 14:30:15 │
│ snapshot-202... │ snapshot-202...  │ 2024-01-10 15:45:22 │
└─────────────────┴──────────────────┴─────────────────────┘
```

### Diff Output
```
Comparing baseline → current

╭─ Processes ────────────────────────────────────╮
│ Items Added:                                   │
│   + node server.js (PID: 1234)                │
│   + python app.py (PID: 5678)                 │
│                                                │
│ Items Removed:                                 │
│   - old_process (PID: 999)                    │
╰────────────────────────────────────────────────╯

╭─ Environment Variables ───────────────────────╮
│ Added:                                         │
│   + NODE_ENV: "development"                   │
│                                                │
│ Changed:                                       │
│   ~ DEBUG: "false" → "true"                   │
╰────────────────────────────────────────────────╯
```

## Configuration

### File Watching
By default, envdiff watches the current working directory. You can customize this:

```python
from envdiff.collectors import FilesCollector

# Watch specific directories
collector = FilesCollector(watch_dirs=['/path/to/project', '/another/path'])
```

### Custom Storage Location
```bash
# Use custom database location
envdiff snap --storage ~/.my-envdiffs.db
```

## Architecture

```
envdiff/
├── cli.py              # Click CLI interface
├── snapshot.py         # Snapshot capture engine
├── diff.py             # Diff computation
├── formatters.py       # Rich terminal output
├── storage.py          # SQLite persistence
└── collectors/         # Data collection modules
    ├── processes.py    # Process information
    ├── network.py      # Network connections
    ├── env_vars.py     # Environment variables
    ├── packages.py     # Package versions
    ├── files.py        # File checksums
    └── system.py       # System resource usage
```

## Platform Support

- ✅ **macOS**: Full support for all collectors
- ✅ **Linux**: Full support for all collectors  
- ⚠️ **Windows**: Limited support (psutil-dependent features may vary)

## Security & Privacy

- Sensitive environment variables (passwords, tokens, keys) are automatically redacted
- File collection respects `.gitignore`-style patterns
- Network information excludes sensitive connection details
- All data stays local - nothing is sent to external services

## Development

```bash
# Clone and install in development mode
git clone https://github.com/yourusername/envdiff.git
cd envdiff
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black .

# Lint
flake8 envdiff/
```

## Use Cases

### Debugging "It Worked Yesterday" Issues
```bash
envdiff snap working-state
# ... time passes, things break ...
envdiff compare working-state
# See exactly what changed!
```

### Before/After System Updates
```bash
envdiff snap before-update
brew upgrade  # or apt update, etc.
envdiff compare before-update
```

### CI/CD Environment Validation
```bash
# In CI pipeline
envdiff snap ci-baseline
./run-tests.sh
envdiff compare ci-baseline  # Ensure tests don't pollute environment
```

### Development Environment Drift Detection
```bash
# Monitor for unexpected changes
envdiff watch --interval 300  # Check every 5 minutes
```

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License. See [LICENSE](LICENSE) for details.

## Troubleshooting

### Permission Errors
Some system information requires elevated permissions. Run with `sudo` if needed:
```bash
sudo envdiff snap system-baseline
```

### Large File Collections
If file collection is slow, limit the scope:
```python
# Exclude large directories
collector = FilesCollector(watch_dirs=['.'], max_files=500)
```

### psutil Errors on macOS
Grant terminal permissions in System Preferences → Security & Privacy → Privacy → Full Disk Access.

---

**envdiff** helps you answer the age-old question: "What changed?" 🔍