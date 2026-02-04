#!/usr/bin/env python3
"""
scripts/cleanup_old_models.py
Cleanup old model files, keeping only the latest versions.

This script scans the models/ directory and removes outdated model files
while preserving the most recent versions of each model type.

Usage:
    python scripts/cleanup_old_models.py [--dry-run] [--keep N]

Options:
    --dry-run   Show what would be deleted without actually deleting
    --keep N    Number of versions to keep per model type (default: 2)
"""

import argparse
import os
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

# Model file patterns
MODEL_PATTERNS = {
    "classifier": r"model_a_classifier_(\d{8}_\d{6})\.pkl",
    "regressor": r"model_a_regressor_(\d{8}_\d{6})\.pkl",
    "training_summary": r"model_a_training_summary_(\d{8}_\d{6})\.txt",
}

# Versioned model patterns (keep latest only)
VERSIONED_PATTERNS = {
    "v_classifier": r"model_a_v(\d+_\d+)_classifier\.pkl",
    "v_regressor": r"model_a_v(\d+_\d+)_regressor\.pkl",
    "v_features": r"model_a_v(\d+_\d+)_features\.json",
    "v_metrics": r"model_a_v(\d+_\d+)_metrics\.json",
}


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Cleanup old model files from the models/ directory"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without actually deleting",
    )
    parser.add_argument(
        "--keep",
        type=int,
        default=2,
        help="Number of versions to keep per model type (default: 2)",
    )
    parser.add_argument(
        "--models-dir",
        type=str,
        default="models",
        help="Path to models directory (default: models)",
    )
    return parser.parse_args()


def parse_timestamp(timestamp_str: str) -> datetime:
    """Parse timestamp from model filename."""
    return datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")


def parse_version(version_str: str) -> Tuple[int, int]:
    """Parse version number from model filename."""
    parts = version_str.split("_")
    return (int(parts[0]), int(parts[1]))


def find_model_files(models_dir: Path) -> Dict[str, List[Tuple[str, datetime]]]:
    """
    Find all model files and group by type with timestamps.

    Returns:
        Dict mapping model type to list of (filename, timestamp) tuples
    """
    timestamped_models: Dict[str, List[Tuple[str, datetime]]] = defaultdict(list)

    for filename in os.listdir(models_dir):
        for model_type, pattern in MODEL_PATTERNS.items():
            match = re.match(pattern, filename)
            if match:
                timestamp = parse_timestamp(match.group(1))
                timestamped_models[model_type].append((filename, timestamp))
                break

    # Sort each type by timestamp (newest first)
    for model_type in timestamped_models:
        timestamped_models[model_type].sort(key=lambda x: x[1], reverse=True)

    return timestamped_models


def find_versioned_files(models_dir: Path) -> Dict[str, List[Tuple[str, Tuple[int, int]]]]:
    """
    Find all versioned model files and group by type.

    Returns:
        Dict mapping model type to list of (filename, version) tuples
    """
    versioned_models: Dict[str, List[Tuple[str, Tuple[int, int]]]] = defaultdict(list)

    for filename in os.listdir(models_dir):
        for model_type, pattern in VERSIONED_PATTERNS.items():
            match = re.match(pattern, filename)
            if match:
                version = parse_version(match.group(1))
                versioned_models[model_type].append((filename, version))
                break

    # Sort each type by version (newest first)
    for model_type in versioned_models:
        versioned_models[model_type].sort(key=lambda x: x[1], reverse=True)

    return versioned_models


def cleanup_models(
    models_dir: Path,
    keep: int = 2,
    dry_run: bool = False,
) -> Tuple[List[str], int]:
    """
    Cleanup old model files.

    Args:
        models_dir: Path to models directory
        keep: Number of versions to keep per model type
        dry_run: If True, only show what would be deleted

    Returns:
        Tuple of (list of deleted files, total bytes freed)
    """
    deleted_files: List[str] = []
    bytes_freed = 0

    # Handle timestamped models
    timestamped = find_model_files(models_dir)
    for model_type, files in timestamped.items():
        if len(files) > keep:
            to_delete = files[keep:]
            for filename, timestamp in to_delete:
                filepath = models_dir / filename
                file_size = filepath.stat().st_size

                if dry_run:
                    print(f"[DRY RUN] Would delete: {filename} ({file_size / 1024:.1f} KB)")
                else:
                    os.remove(filepath)
                    print(f"Deleted: {filename} ({file_size / 1024:.1f} KB)")

                deleted_files.append(filename)
                bytes_freed += file_size

    # Handle versioned models (keep only latest version)
    versioned = find_versioned_files(models_dir)
    for model_type, files in versioned.items():
        if len(files) > keep:
            to_delete = files[keep:]
            for filename, version in to_delete:
                filepath = models_dir / filename
                file_size = filepath.stat().st_size

                if dry_run:
                    print(f"[DRY RUN] Would delete: {filename} ({file_size / 1024:.1f} KB)")
                else:
                    os.remove(filepath)
                    print(f"Deleted: {filename} ({file_size / 1024:.1f} KB)")

                deleted_files.append(filename)
                bytes_freed += file_size

    return deleted_files, bytes_freed


def main():
    """Main entry point."""
    args = parse_args()
    models_dir = Path(args.models_dir)

    if not models_dir.exists():
        print(f"Error: Models directory not found: {models_dir}")
        return 1

    print(f"Scanning {models_dir} for old model files...")
    print(f"Keeping {args.keep} version(s) per model type")
    if args.dry_run:
        print("(DRY RUN - no files will be deleted)\n")

    deleted, bytes_freed = cleanup_models(
        models_dir,
        keep=args.keep,
        dry_run=args.dry_run,
    )

    print(f"\n{'Would delete' if args.dry_run else 'Deleted'} {len(deleted)} files")
    print(f"Space {'would be' if args.dry_run else ''} freed: {bytes_freed / 1024 / 1024:.2f} MB")

    return 0


if __name__ == "__main__":
    exit(main())
