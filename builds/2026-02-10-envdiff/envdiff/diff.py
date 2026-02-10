"""
Diff module - compares snapshots and computes differences.
"""

from deepdiff import DeepDiff
from typing import Dict, Any, List


class SnapshotDiff:
    """Engine for comparing snapshots and computing differences."""

    def __init__(self):
        """Initialize diff engine."""
        pass

    def compare(self, snapshot1: Dict[str, Any], snapshot2: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compare two snapshots and return the differences.
        
        Args:
            snapshot1: First snapshot data
            snapshot2: Second snapshot data
            
        Returns:
            Dictionary containing organized differences by category.
        """
        # Use deepdiff to get raw differences
        raw_diff = DeepDiff(
            snapshot1, 
            snapshot2,
            ignore_order=True,
            verbose_level=2
        )
        
        # Organize differences by collector type
        organized_diff = {}
        
        for collector_name in set(list(snapshot1.keys()) + list(snapshot2.keys())):
            collector_diff = self._compare_collector_data(
                snapshot1.get(collector_name, {}),
                snapshot2.get(collector_name, {})
            )
            
            if collector_diff:
                organized_diff[collector_name] = collector_diff
        
        return organized_diff

    def _compare_collector_data(self, data1: Any, data2: Any) -> Dict[str, Any]:
        """Compare data from a specific collector."""
        diff = DeepDiff(data1, data2, ignore_order=True, verbose_level=2)
        
        if not diff:
            return {}
            
        result = {}
        
        # Handle added items
        if 'dictionary_item_added' in diff:
            result['added'] = {}
            for key in diff['dictionary_item_added']:
                # Extract the key from the deepdiff path
                clean_key = key.replace("root['", "").replace("']", "")
                result['added'][clean_key] = diff['dictionary_item_added'][key]
        
        # Handle removed items  
        if 'dictionary_item_removed' in diff:
            result['removed'] = {}
            for key in diff['dictionary_item_removed']:
                clean_key = key.replace("root['", "").replace("']", "")
                result['removed'][clean_key] = diff['dictionary_item_removed'][key]
                
        # Handle changed values
        if 'values_changed' in diff:
            result['changed'] = {}
            for path, change in diff['values_changed'].items():
                clean_path = path.replace("root['", "").replace("']", "").replace("'", "")
                result['changed'][clean_path] = {
                    'old': change['old_value'],
                    'new': change['new_value']
                }
        
        # Handle type changes
        if 'type_changes' in diff:
            result['type_changed'] = {}
            for path, change in diff['type_changes'].items():
                clean_path = path.replace("root['", "").replace("']", "").replace("'", "")
                result['type_changed'][clean_path] = {
                    'old_type': str(change['old_type']),
                    'new_type': str(change['new_type']),
                    'old_value': change['old_value'],
                    'new_value': change['new_value']
                }
        
        # Handle iterable changes (for lists like processes, files)
        if 'iterable_item_added' in diff:
            result['items_added'] = []
            for item in diff['iterable_item_added'].values():
                result['items_added'].append(item)
                
        if 'iterable_item_removed' in diff:
            result['items_removed'] = []
            for item in diff['iterable_item_removed'].values():
                result['items_removed'].append(item)
        
        return result

    def has_changes(self, diff: Dict[str, Any]) -> bool:
        """Check if diff contains any actual changes."""
        if not diff:
            return False
            
        for collector_diff in diff.values():
            if any(collector_diff.get(key, {}) for key in ['added', 'removed', 'changed', 'type_changed', 'items_added', 'items_removed']):
                return True
                
        return False