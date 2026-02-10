"""
Formatters module - provides rich terminal output for snapshots and diffs.
"""

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich import box
from typing import Dict, Any, List
from datetime import datetime


class SnapshotFormatter:
    """Formatter for snapshot and diff output using Rich."""

    def __init__(self):
        """Initialize formatter with Rich console."""
        self.console = Console()

    def format_snapshot_list(self, snapshots: List[Dict[str, Any]]) -> None:
        """Format and display a list of snapshots."""
        if not snapshots:
            self.console.print("[yellow]No snapshots found.[/yellow]")
            return

        table = Table(title="Environment Snapshots", box=box.ROUNDED)
        table.add_column("ID", style="cyan", no_wrap=True)
        table.add_column("Name", style="magenta")
        table.add_column("Created", style="green")
        
        for snapshot in snapshots:
            timestamp = datetime.fromtimestamp(snapshot['timestamp'])
            formatted_time = timestamp.strftime("%Y-%m-%d %H:%M:%S")
            
            table.add_row(
                snapshot['id'][:12] + "..." if len(snapshot['id']) > 15 else snapshot['id'],
                snapshot['name'],
                formatted_time
            )
        
        self.console.print(table)

    def format_snapshot_summary(self, snapshot_id: str, data: Dict[str, Any]) -> None:
        """Format and display a snapshot summary."""
        self.console.print(f"\n[bold cyan]Snapshot: {snapshot_id}[/bold cyan]")
        
        # Create summary table
        table = Table(box=box.SIMPLE)
        table.add_column("Category", style="yellow", no_wrap=True)
        table.add_column("Count/Status", style="green")
        table.add_column("Details", style="dim")
        
        for category, category_data in data.items():
            if isinstance(category_data, dict) and 'error' in category_data:
                table.add_row(category.title(), "[red]Error[/red]", category_data['error'])
            elif isinstance(category_data, list):
                table.add_row(category.title(), str(len(category_data)), f"{len(category_data)} items")
            elif isinstance(category_data, dict):
                if category == 'system':
                    details = f"CPU: {category_data.get('cpu_percent', 'N/A')}%, "
                    details += f"Memory: {category_data.get('mem_percent', 'N/A')}%, "
                    details += f"Disk: {category_data.get('disk_percent', 'N/A')}%"
                    table.add_row(category.title(), "OK", details)
                else:
                    table.add_row(category.title(), str(len(category_data)), f"{len(category_data)} items")
        
        self.console.print(table)

    def format_diff(self, diff: Dict[str, Any], snapshot1_id: str, snapshot2_id: str) -> None:
        """Format and display differences between snapshots."""
        self.console.print(f"\n[bold yellow]Comparing {snapshot1_id} → {snapshot2_id}[/bold yellow]\n")
        
        if not diff:
            self.console.print("[green]No differences found![/green]")
            return
            
        for category, changes in diff.items():
            if not changes:
                continue
                
            # Create panel for each category
            content = []
            
            # Show added items
            if 'added' in changes and changes['added']:
                content.append("[bold green]Added:[/bold green]")
                for key, value in changes['added'].items():
                    content.append(f"  [green]+[/green] {key}: {self._format_value(value)}")
            
            # Show removed items
            if 'removed' in changes and changes['removed']:
                content.append("[bold red]Removed:[/bold red]")
                for key, value in changes['removed'].items():
                    content.append(f"  [red]-[/red] {key}: {self._format_value(value)}")
            
            # Show changed items
            if 'changed' in changes and changes['changed']:
                content.append("[bold blue]Changed:[/bold blue]")
                for key, change in changes['changed'].items():
                    content.append(f"  [blue]~[/blue] {key}: {self._format_value(change['old'])} → {self._format_value(change['new'])}")
            
            # Show added list items (for processes, files, etc.)
            if 'items_added' in changes and changes['items_added']:
                content.append("[bold green]Items Added:[/bold green]")
                for item in changes['items_added']:
                    content.append(f"  [green]+[/green] {self._format_list_item(item)}")
            
            # Show removed list items
            if 'items_removed' in changes and changes['items_removed']:
                content.append("[bold red]Items Removed:[/bold red]")
                for item in changes['items_removed']:
                    content.append(f"  [red]-[/red] {self._format_list_item(item)}")
            
            if content:
                panel_content = "\n".join(content)
                panel = Panel(
                    panel_content,
                    title=f"[bold]{category.title()}[/bold]",
                    border_style="blue",
                    expand=False
                )
                self.console.print(panel)

    def _format_value(self, value: Any) -> str:
        """Format a value for display."""
        if isinstance(value, str):
            # Truncate long strings
            if len(value) > 50:
                return f'"{value[:47]}..."'
            return f'"{value}"'
        elif isinstance(value, (int, float)):
            return str(value)
        elif isinstance(value, list):
            return f"[list with {len(value)} items]"
        elif isinstance(value, dict):
            return f"[dict with {len(value)} keys]"
        else:
            return str(value)

    def _format_list_item(self, item: Any) -> str:
        """Format a list item for display."""
        if isinstance(item, dict):
            # Format process-like items
            if 'name' in item and 'pid' in item:
                return f"{item['name']} (PID: {item['pid']})"
            # Format file-like items
            elif 'path' in item:
                return f"{item['path']} ({item.get('size', 'unknown')} bytes)"
            # Format network-like items
            elif 'local' in item:
                return f"{item['local']} → {item.get('remote', 'N/A')} ({item.get('status', 'unknown')})"
            # Generic dict formatting
            else:
                key_items = list(item.items())[:2]  # Show first 2 key-value pairs
                formatted = ", ".join(f"{k}: {v}" for k, v in key_items)
                return f"[{formatted}...]" if len(item) > 2 else f"[{formatted}]"
        else:
            return str(item)

    def print_error(self, message: str) -> None:
        """Print an error message."""
        self.console.print(f"[bold red]Error:[/bold red] {message}")

    def print_success(self, message: str) -> None:
        """Print a success message."""
        self.console.print(f"[bold green]✓[/bold green] {message}")

    def print_info(self, message: str) -> None:
        """Print an info message."""
        self.console.print(f"[bold blue]ℹ[/bold blue] {message}")