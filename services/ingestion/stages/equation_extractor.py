"""
Stage 7 – Equation Extraction.

Converts FORMULA-type PageRegion objects into rich FormulaRegion objects,
and CHEMICAL_EQUATION regions into ChemicalEquation objects.

For mathematical formulas:
- Stores display_form (OCR text)
- Stores latex (from vision model if available, else escaped OCR text)
- Attempts SymPy normalisation for algebraic expressions

For chemical equations:
- Detects and preserves subscripts, coefficients, reaction arrows,
  state symbols
- Never normalised by SymPy
"""

from __future__ import annotations

import logging
import re
from typing import Optional

from services.ingestion.schemas import (
    BoundingBox,
    ChemicalEquation,
    FormulaRegion,
    PageRegion,
    RegionType,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Chemical equation patterns
# ---------------------------------------------------------------------------

_COEFF_PATTERN = re.compile(r"(\d+)\s*([A-Z][a-zA-Z0-9₀-₉]*)")
_ARROW_PATTERN = re.compile(r"(→|->|⟶|←|⇌|↔|=)")
_STATE_PATTERN = re.compile(r"\((g|l|aq|s)\)", re.IGNORECASE)
_SUBSCRIPT_MAP = str.maketrans("₀₁₂₃₄₅₆₇₈₉", "0123456789")


def extract_formula(region: PageRegion, vision_data: Optional[dict] = None) -> FormulaRegion:
    """
    Upgrade a FORMULA PageRegion to a FormulaRegion.

    If the vision model was called and returned latex, it takes precedence.
    Otherwise, the OCR text is used as the display form and a simple
    LaTeX escape is applied.
    """
    text = region.text.strip()
    vision = vision_data or {}

    latex = vision.get("latex", "") or _text_to_latex(text)
    display_form = vision.get("display_form", "") or text
    normalized_form = _try_sympy_normalise(latex) or normalized_from_text(text)

    return FormulaRegion(
        region_id=region.region_id,
        type=RegionType.FORMULA,
        bbox=region.bbox,
        text=text,
        confidence=region.confidence,
        confidence_level=region.confidence_level,
        vision_used=region.vision_used,
        latex=latex,
        display_form=display_form,
        normalized_form=normalized_form,
    )


def extract_chemical_equation(
    region: PageRegion,
    vision_data: Optional[dict] = None,
) -> ChemicalEquation:
    """
    Upgrade a CHEMICAL_EQUATION PageRegion to a ChemicalEquation.

    Chemical equations are never altered by SymPy.
    """
    text = region.text.strip()
    vision = vision_data or {}

    display = vision.get("display", "") or text
    normalized = vision.get("normalized", "") or _normalize_chem(text)
    arrow = vision.get("arrow", "") or _detect_arrow(text) or "→"
    state_symbols = vision.get("state_symbols", []) or _detect_states(text)
    coefficients = _detect_coefficients(text)

    return ChemicalEquation(
        region_id=region.region_id,
        type=RegionType.CHEMICAL_EQUATION,
        bbox=region.bbox,
        text=text,
        confidence=region.confidence,
        confidence_level=region.confidence_level,
        vision_used=region.vision_used,
        display=display,
        normalized=normalized,
        coefficients=coefficients,
        arrow=arrow,
        state_symbols=state_symbols,
    )


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _text_to_latex(text: str) -> str:
    """Apply minimal LaTeX escaping to OCR text."""
    # Preserve common mathematical symbols
    latex = text
    latex = latex.replace("×", r"\times ")
    latex = latex.replace("÷", r"\div ")
    latex = latex.replace("±", r"\pm ")
    latex = latex.replace("≤", r"\leq ")
    latex = latex.replace("≥", r"\geq ")
    latex = latex.replace("α", r"\alpha ")
    latex = latex.replace("β", r"\beta ")
    latex = latex.replace("γ", r"\gamma ")
    latex = latex.replace("Δ", r"\Delta ")
    latex = latex.replace("δ", r"\delta ")
    latex = latex.replace("λ", r"\lambda ")
    latex = latex.replace("μ", r"\mu ")
    latex = latex.replace("π", r"\pi ")
    latex = latex.replace("σ", r"\sigma ")
    latex = latex.replace("θ", r"\theta ")
    latex = latex.replace("ω", r"\omega ")
    latex = latex.replace("∞", r"\infty ")
    latex = latex.replace("√", r"\sqrt")
    latex = latex.replace("²", "^{2}")
    latex = latex.replace("³", "^{3}")
    return latex


def _try_sympy_normalise(latex: str) -> str:
    """
    Attempt to parse the LaTeX string with SymPy and return the
    canonical form.  Returns empty string on any failure.
    """
    if not latex:
        return ""
    try:
        from sympy.parsing.latex import parse_latex
        from sympy import latex as to_latex

        expr = parse_latex(latex)
        return to_latex(expr)
    except Exception:
        return ""


def normalized_from_text(text: str) -> str:
    """
    Fallback normalisation: strip whitespace, translate subscripts.
    """
    return text.translate(_SUBSCRIPT_MAP).strip()


def _normalize_chem(text: str) -> str:
    """Normalise chemical equation text to ASCII."""
    norm = text.translate(_SUBSCRIPT_MAP)
    norm = norm.replace("→", "->").replace("⟶", "->").replace("⇌", "<->")
    return norm.strip()


def _detect_arrow(text: str) -> str:
    match = _ARROW_PATTERN.search(text)
    return match.group(1) if match else "→"


def _detect_states(text: str) -> list[str]:
    return [m.group(0) for m in _STATE_PATTERN.finditer(text)]


def _detect_coefficients(text: str) -> list[str]:
    return [m.group(1) for m in _COEFF_PATTERN.finditer(text)]
