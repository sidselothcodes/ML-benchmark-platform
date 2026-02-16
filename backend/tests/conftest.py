"""Shared pytest configuration."""

import sys
from pathlib import Path

# Ensure the project root is on sys.path so `backend` imports work
project_root = Path(__file__).resolve().parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))
