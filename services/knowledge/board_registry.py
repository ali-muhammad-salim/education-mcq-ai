"""
Board Registry — data-driven board management.

Adding a new board requires ONLY:
  1. Create a YAML file in board_configs/
  2. Call BoardRegistry.from_yaml(path)

No application code changes are required.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import yaml

from services.knowledge.schemas import BoardProfile, ExamStyle

logger = logging.getLogger(__name__)

# Default location for bundled board configs
_BOARD_CONFIGS_DIR = Path(__file__).parent / "board_configs"


class BoardRegistryError(Exception):
    """Raised when a board lookup or registration fails."""


class BoardRegistry:
    """
    In-memory registry of all known board profiles.

    Thread-safe for concurrent reads. Writes (register) should be done
    at application startup before serving requests.

    Usage
    -----
    # Get the singleton pre-loaded with all bundled configs
    registry = BoardRegistry.default()

    # Look up a board
    profile = registry.get("FBISE")

    # Add a new board at runtime (no code change needed)
    registry.from_yaml("/path/to/new_board.yaml")
    """

    def __init__(self) -> None:
        # short_code → BoardProfile (case-insensitive lookup internally)
        self._boards: dict[str, BoardProfile] = {}

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    def register(self, profile: BoardProfile) -> None:
        """Register a board profile. Overwrites if the same short_code exists."""
        key = profile.short_code.upper()
        if key in self._boards:
            logger.warning(
                "BoardRegistry: overwriting existing profile for '%s'", profile.short_code
            )
        self._boards[key] = profile
        logger.debug("BoardRegistry: registered board '%s'", profile.short_code)

    def from_yaml(self, path: str | Path) -> BoardProfile:
        """
        Load and register a board profile from a YAML file.

        The YAML must conform to the BoardProfile schema.
        Returns the registered BoardProfile.
        """
        path = Path(path)
        if not path.exists():
            raise BoardRegistryError(f"Board config file not found: {path}")

        with open(path, encoding="utf-8") as fh:
            raw = yaml.safe_load(fh)

        # Normalize common field aliases
        if "short_code" not in raw and "id" in raw:
            raw["short_code"] = raw["id"]
        if "exam_style" not in raw and "examination_style" in raw:
            raw["exam_style"] = raw.pop("examination_style")

        # Parse nested ExamStyle separately so we can give a clean error
        exam_style_raw = raw.pop("exam_style", {})
        try:
            exam_style = ExamStyle(**exam_style_raw)
        except Exception as exc:
            raise BoardRegistryError(
                f"Invalid exam_style in {path.name}: {exc}"
            ) from exc

        try:
            profile = BoardProfile(exam_style=exam_style, **raw)
        except Exception as exc:
            raise BoardRegistryError(
                f"Invalid board profile in {path.name}: {exc}"
            ) from exc

        self.register(profile)
        return profile

    def load_directory(self, directory: str | Path) -> list[BoardProfile]:
        """
        Load all *.yaml files from a directory as board profiles.
        Returns all successfully loaded profiles.
        """
        directory = Path(directory)
        profiles: list[BoardProfile] = []
        for yaml_file in sorted(directory.glob("*.yaml")):
            try:
                p = self.from_yaml(yaml_file)
                profiles.append(p)
            except BoardRegistryError as exc:
                logger.error("BoardRegistry: failed to load %s — %s", yaml_file.name, exc)
        return profiles

    # ------------------------------------------------------------------
    # Lookup
    # ------------------------------------------------------------------

    def get(self, short_code: str) -> BoardProfile:
        """
        Retrieve a board profile by short_code (case-insensitive).
        Raises BoardRegistryError if not found.
        """
        profile = self._boards.get(short_code.upper())
        if profile is None:
            available = sorted(self._boards.keys())
            raise BoardRegistryError(
                f"Board '{short_code}' not found in registry. "
                f"Available: {available}"
            )
        return profile

    def get_or_none(self, short_code: str) -> Optional[BoardProfile]:
        """Return a board profile or None if not found."""
        return self._boards.get(short_code.upper())

    def all_boards(self) -> list[BoardProfile]:
        """All registered board profiles, sorted by short_code."""
        return sorted(self._boards.values(), key=lambda p: p.short_code)

    def all_short_codes(self) -> list[str]:
        return sorted(self._boards.keys())

    def is_registered(self, short_code: str) -> bool:
        return short_code.upper() in self._boards

    def terminology(self, short_code: str, standard_term: str) -> str:
        """
        Resolve a standard curriculum term to the board-specific term.

        E.g. for Cambridge: terminology("Cambridge", "chapter") → "topic"
        Falls back to the standard term if no override is defined.
        """
        profile = self.get_or_none(short_code)
        if profile is None:
            return standard_term
        return profile.get_term(standard_term)

    def __len__(self) -> int:
        return len(self._boards)

    def __repr__(self) -> str:
        return f"BoardRegistry({list(self._boards.keys())})"

    # ------------------------------------------------------------------
    # Singleton factory
    # ------------------------------------------------------------------

    _default_instance: Optional["BoardRegistry"] = None

    @classmethod
    def default(cls) -> "BoardRegistry":
        """
        Return the singleton registry pre-loaded with all bundled board configs.

        This is the standard entry point. The registry is loaded once on first
        call, then cached for all subsequent calls.
        """
        if cls._default_instance is None:
            instance = cls()
            if _BOARD_CONFIGS_DIR.exists():
                loaded = instance.load_directory(_BOARD_CONFIGS_DIR)
                logger.info(
                    "BoardRegistry: loaded %d board(s) from %s",
                    len(loaded),
                    _BOARD_CONFIGS_DIR,
                )
            else:
                logger.warning(
                    "BoardRegistry: board_configs directory not found at %s",
                    _BOARD_CONFIGS_DIR,
                )
            cls._default_instance = instance
        return cls._default_instance

    @classmethod
    def reset_default(cls) -> None:
        """
        Clear the singleton. Used in tests to ensure isolation.
        """
        cls._default_instance = None
