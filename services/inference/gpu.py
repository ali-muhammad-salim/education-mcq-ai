"""
GPU monitoring utilities.

Uses nvidia-smi via subprocess — no PyTorch or CUDA dependency required.
Works on systems where CUDA drivers are installed but PyTorch is not.
"""

from __future__ import annotations

import logging
import subprocess
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class GPUInfo:
    """VRAM and identity information for a single GPU device."""

    index: int
    name: str
    total_mib: int
    used_mib: int
    free_mib: int
    driver_version: str = ""
    compute_cap: str = ""
    utilization_pct: int = 0

    @property
    def used_pct(self) -> float:
        if self.total_mib == 0:
            return 0.0
        return self.used_mib / self.total_mib * 100

    def to_dict(self) -> dict:
        return {
            "index": self.index,
            "name": self.name,
            "total_mib": self.total_mib,
            "used_mib": self.used_mib,
            "free_mib": self.free_mib,
            "used_pct": round(self.used_pct, 1),
            "driver_version": self.driver_version,
            "compute_cap": self.compute_cap,
            "utilization_pct": self.utilization_pct,
        }


def get_gpu_info() -> list[GPUInfo]:
    """
    Query nvidia-smi for GPU information.

    Returns an empty list if nvidia-smi is not available or no GPU is found.
    """
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=index,name,memory.total,memory.used,memory.free,"
                "driver_version,compute_cap,utilization.gpu",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0:
            logger.debug("nvidia-smi failed: %s", result.stderr)
            return []

        gpus: list[GPUInfo] = []
        for line in result.stdout.strip().splitlines():
            parts = [p.strip() for p in line.split(",")]
            if len(parts) < 7:
                continue
            try:
                gpus.append(
                    GPUInfo(
                        index=int(parts[0]),
                        name=parts[1],
                        total_mib=int(parts[2]),
                        used_mib=int(parts[3]),
                        free_mib=int(parts[4]),
                        driver_version=parts[5],
                        compute_cap=parts[6],
                        utilization_pct=int(parts[7]) if len(parts) > 7 else 0,
                    )
                )
            except (ValueError, IndexError) as exc:
                logger.warning("Failed to parse GPU line %r: %s", line, exc)

        return gpus

    except FileNotFoundError:
        logger.debug("nvidia-smi not found — no NVIDIA GPU or drivers not installed")
        return []
    except subprocess.TimeoutExpired:
        logger.warning("nvidia-smi timed out")
        return []


def get_primary_gpu() -> Optional[GPUInfo]:
    """Return the first (primary) GPU, or None if no GPU is available."""
    gpus = get_gpu_info()
    return gpus[0] if gpus else None


def get_free_vram_mib() -> int:
    """Return free VRAM in MiB for the primary GPU (0 if no GPU)."""
    gpu = get_primary_gpu()
    return gpu.free_mib if gpu else 0


def get_total_vram_mib() -> int:
    """Return total VRAM in MiB for the primary GPU (0 if no GPU)."""
    gpu = get_primary_gpu()
    return gpu.total_mib if gpu else 0


def is_vram_safe(required_mib: int, safety_margin_mib: int = 1024) -> bool:
    """
    Check whether there is enough free VRAM to load a model of `required_mib` size.

    Parameters
    ----------
    required_mib:
        Estimated VRAM requirement of the model to be loaded.
    safety_margin_mib:
        Buffer to keep free above the model requirement.
    """
    free = get_free_vram_mib()
    needed = required_mib + safety_margin_mib
    safe = free >= needed
    if not safe:
        logger.warning(
            "Insufficient VRAM: free=%d MiB  needed=%d MiB (model=%d + margin=%d)",
            free,
            needed,
            required_mib,
            safety_margin_mib,
        )
    return safe
