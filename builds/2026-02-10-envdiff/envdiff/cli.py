"""
CLI module - main command-line interface for envdiff.
"""

import click
import json
import sys
from typing import Optional

from .snapshot import SnapshotEngine
from .storage import SnapshotStorage
from .diff import SnapshotDiff
from .formatters import SnapshotFormatter


@click.group()
@click.version_option()
def cli():
    """envdiff - Environment change detector.
    
    Like git diff for your entire machine state.
    """
    pass


@cli.command()
@click.argument('name', required=False)
@click.option('--storage', help='Path to snapshot database')
def snap(name: Optional[str], storage: Optional[str]):
    """Create a snapshot of the current environment."""
    formatter = SnapshotFormatter()
    
    try:
        # Initialize components
        engine = SnapshotEngine()
        storage_engine = SnapshotStorage(storage)
        
        # Capture snapshot
        snapshot_id, snapshot_data = engine.capture_named(name)
        
        # Save to storage
        storage_engine.save_snapshot(snapshot_id, snapshot_id, snapshot_data)
        
        formatter.print_success(f"Snapshot '{snapshot_id}' created successfully")
        formatter.format_snapshot_summary(snapshot_id, snapshot_data)
        
    except Exception as e:
        formatter.print_error(f"Failed to create snapshot: {str(e)}")
        sys.exit(1)


@cli.command()
@click.option('--storage', help='Path to snapshot database')
def list(storage: Optional[str]):
    """List all snapshots."""
    formatter = SnapshotFormatter()
    
    try:
        storage_engine = SnapshotStorage(storage)
        snapshots = storage_engine.list_snapshots()
        formatter.format_snapshot_list(snapshots)
        
    except Exception as e:
        formatter.print_error(f"Failed to list snapshots: {str(e)}")
        sys.exit(1)


@cli.command()
@click.argument('snap1')
@click.argument('snap2', required=False)
@click.option('--storage', help='Path to snapshot database')
def compare(snap1: str, snap2: Optional[str], storage: Optional[str]):
    """Compare two snapshots or compare a snapshot with current state."""
    formatter = SnapshotFormatter()
    
    try:
        storage_engine = SnapshotStorage(storage)
        diff_engine = SnapshotDiff()
        
        # Get first snapshot
        snapshot1_data = storage_engine.get_snapshot(snap1)
        if not snapshot1_data:
            formatter.print_error(f"Snapshot '{snap1}' not found")
            sys.exit(1)
        
        # Get second snapshot or capture current state
        if snap2:
            snapshot2_data = storage_engine.get_snapshot(snap2)
            if not snapshot2_data:
                formatter.print_error(f"Snapshot '{snap2}' not found")
                sys.exit(1)
            snap2_id = snap2
        else:
            # Compare with current state
            engine = SnapshotEngine()
            snapshot2_data = engine.capture()
            snap2_id = "current"
        
        # Compute and display diff
        diff = diff_engine.compare(snapshot1_data, snapshot2_data)
        formatter.format_diff(diff, snap1, snap2_id)
        
        # Exit with code 1 if there are changes (like git diff)
        if diff_engine.has_changes(diff):
            sys.exit(1)
        
    except Exception as e:
        formatter.print_error(f"Failed to compare snapshots: {str(e)}")
        sys.exit(1)


@cli.command()
@click.argument('name')
@click.option('--storage', help='Path to snapshot database')
def delete(name: str, storage: Optional[str]):
    """Delete a snapshot."""
    formatter = SnapshotFormatter()
    
    try:
        storage_engine = SnapshotStorage(storage)
        
        if not storage_engine.snapshot_exists(name):
            formatter.print_error(f"Snapshot '{name}' not found")
            sys.exit(1)
        
        if storage_engine.delete_snapshot(name):
            formatter.print_success(f"Snapshot '{name}' deleted")
        else:
            formatter.print_error(f"Failed to delete snapshot '{name}'")
            sys.exit(1)
            
    except Exception as e:
        formatter.print_error(f"Failed to delete snapshot: {str(e)}")
        sys.exit(1)


@cli.command()
@click.argument('name')
@click.option('--format', 'output_format', default='json', type=click.Choice(['json']), 
              help='Export format')
@click.option('--storage', help='Path to snapshot database')
def export(name: str, output_format: str, storage: Optional[str]):
    """Export a snapshot."""
    formatter = SnapshotFormatter()
    
    try:
        storage_engine = SnapshotStorage(storage)
        snapshot_data = storage_engine.get_snapshot(name)
        
        if not snapshot_data:
            formatter.print_error(f"Snapshot '{name}' not found")
            sys.exit(1)
        
        if output_format == 'json':
            # Pretty print JSON to stdout
            print(json.dumps(snapshot_data, indent=2))
        
    except Exception as e:
        formatter.print_error(f"Failed to export snapshot: {str(e)}")
        sys.exit(1)


@cli.command()
@click.option('--interval', default=60, help='Monitoring interval in seconds')
@click.option('--storage', help='Path to snapshot database')
def watch(interval: int, storage: Optional[str]):
    """Continuously monitor environment changes."""
    formatter = SnapshotFormatter()
    formatter.print_info(f"Starting continuous monitoring (interval: {interval}s)")
    formatter.print_info("Press Ctrl+C to stop")
    
    try:
        import time
        
        engine = SnapshotEngine()
        storage_engine = SnapshotStorage(storage)
        diff_engine = SnapshotDiff()
        
        # Take initial snapshot
        initial_id, initial_data = engine.capture_named(f"watch-baseline")
        storage_engine.save_snapshot(initial_id, initial_id, initial_data)
        last_snapshot_data = initial_data
        
        formatter.print_success(f"Baseline snapshot '{initial_id}' created")
        
        while True:
            time.sleep(interval)
            
            # Capture current state
            current_data = engine.capture()
            
            # Compare with last snapshot
            diff = diff_engine.compare(last_snapshot_data, current_data)
            
            if diff_engine.has_changes(diff):
                formatter.print_info(f"Changes detected at {time.strftime('%Y-%m-%d %H:%M:%S')}")
                formatter.format_diff(diff, "previous", "current")
                
                # Save new snapshot
                new_id, _ = engine.capture_named(f"watch-{int(time.time())}")
                storage_engine.save_snapshot(new_id, new_id, current_data)
                last_snapshot_data = current_data
            
    except KeyboardInterrupt:
        formatter.print_info("Monitoring stopped")
    except Exception as e:
        formatter.print_error(f"Watch failed: {str(e)}")
        sys.exit(1)


def main():
    """Entry point for the CLI."""
    cli()


if __name__ == "__main__":
    main()