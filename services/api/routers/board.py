from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import yaml
from pathlib import Path

from services.knowledge.board_registry import BoardRegistry
from services.knowledge.schemas import BoardProfile

router = APIRouter(prefix="/api/boards", tags=["Boards"])
_BOARD_CONFIGS_DIR = Path(__file__).parent.parent.parent / "knowledge" / "board_configs"

@router.get("/")
def get_boards():
    """Get all available boards."""
    BoardRegistry.reset_default() # Force a reload of the directory
    registry = BoardRegistry.default()
    boards = registry.all_boards()
    return [board.model_dump() for board in boards]

@router.get("/{short_code}")
def get_board(short_code: str):
    """Get a specific board."""
    BoardRegistry.reset_default()
    registry = BoardRegistry.default()
    board = registry.get_or_none(short_code)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board.model_dump()

@router.post("/")
def create_or_update_board(board_data: dict):
    """Create or update a board's syllabus configuration."""
    BoardRegistry.reset_default()
    registry = BoardRegistry.default()
    
    # We expect raw dictionary that matches BoardProfile
    try:
        short_code = board_data.get("short_code", "").lower()
        if not short_code:
            raise HTTPException(status_code=400, detail="short_code is required")
        
        # Ensure _BOARD_CONFIGS_DIR exists
        _BOARD_CONFIGS_DIR.mkdir(parents=True, exist_ok=True)
        
        # Save to yaml
        yaml_path = _BOARD_CONFIGS_DIR / f"{short_code}.yaml"
        with open(yaml_path, "w", encoding="utf-8") as f:
            yaml.dump(board_data, f, sort_keys=False)
        
        # Reload in registry
        profile = registry.from_yaml(yaml_path)
        return {"status": "success", "message": f"Board {short_code} saved successfully", "data": profile.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
