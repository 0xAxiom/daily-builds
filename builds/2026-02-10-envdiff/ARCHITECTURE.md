# envdiff - Environment Change Detector

## Problem
"It was working 10 minutes ago." When something breaks, you need to know what changed: files, processes, env vars, network connections, package versions. Git only tracks code, not the full environment state.

## Solution
CLI tool that takes snapshots of your development environment and diffs them. Like `git diff` but for your entire machine state.

## Architecture

### Core Modules

```
envdiff/
├── cli.py              # Click CLI entry point
├── snapshot.py         # Snapshot capture engine
├── diff.py             # Diff computation engine
├── formatters.py       # Rich terminal output
├── storage.py          # SQLite snapshot persistence
├── collectors/
│   ├── __init__.py
│   ├── processes.py    # Running processes + args
│   ├── network.py      # Open ports, connections
│   ├── env_vars.py     # Environment variables
│   ├── packages.py     # pip/npm/brew versions
│   ├── files.py        # File checksums in watched dirs
│   └── system.py       # CPU, memory, disk usage
└── tests/
    ├── test_snapshot.py
    ├── test_diff.py
    ├── test_collectors.py
    └── test_cli.py
```

### Data Model

**Snapshot** (SQLite):
```sql
CREATE TABLE snapshots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    timestamp REAL NOT NULL,
    data JSON NOT NULL
);
```

**Snapshot JSON shape:**
```json
{
  "processes": [{"pid": 123, "name": "node", "cmdline": "node server.js", "cpu": 2.1, "mem_mb": 150}],
  "network": [{"local": "0.0.0.0:3000", "remote": "", "status": "LISTEN", "pid": 123}],
  "env_vars": {"PATH": "/usr/local/bin:...", "NODE_ENV": "development"},
  "packages": {"pip": {"requests": "2.31.0"}, "npm": {"express": "4.18.2"}, "brew": {"node": "21.5.0"}},
  "files": [{"path": "src/app.js", "hash": "abc123", "size": 1024, "mtime": 1707600000}],
  "system": {"cpu_percent": 23.5, "mem_percent": 67.2, "disk_percent": 45.1}
}
```

### CLI Interface

```bash
envdiff snap <name>                    # Create named snapshot
envdiff snap                           # Auto-named (timestamp)
envdiff list                           # List all snapshots
envdiff compare <snap1> <snap2>        # Diff two snapshots
envdiff compare <snap1>                # Diff snap1 vs current state
envdiff watch --interval 60            # Continuous monitoring, alert on changes
envdiff delete <name>                  # Remove snapshot
envdiff export <name> --format json    # Export snapshot
```

### Key Design Decisions

1. **SQLite storage** - Zero config, portable, single file (~/.envdiff/snapshots.db)
2. **JSON snapshot data** - Flexible schema, easy to extend collectors
3. **Rich diff output** - Color-coded terminal tables with added/removed/changed
4. **Modular collectors** - Each collector is independent, can be enabled/disabled
5. **Fast by default** - File collector only watches CWD unless configured otherwise

### Dependencies
- `click` - CLI framework
- `psutil` - Process/system info
- `rich` - Terminal formatting
- `deepdiff` - Smart object diffing

### Quality Bar
- Full test coverage for snapshot, diff, and each collector
- Clean README with GIF demo
- PyPI-installable (`pip install envdiff`)
- < 500 lines of core code
- Works on macOS and Linux
