"""
Dataset Manager for the AI Evaluation Framework.
Ensures correct splitting of evaluation datasets while preventing leakage
of near-identical questions or the same concepts across splits.
"""

import logging
import hashlib
from typing import List, Dict, Set
from collections import defaultdict

from services.evaluation.schemas import EvaluationExample, DatasetSplit

logger = logging.getLogger(__name__)


class DatasetManager:
    """
    Manages evaluation datasets, enforcing strict boundaries between 
    development, validation, and test splits.
    """
    
    def __init__(self):
        # Maps split to a list of examples
        self._splits: Dict[DatasetSplit, List[EvaluationExample]] = {
            DatasetSplit.DEVELOPMENT: [],
            DatasetSplit.VALIDATION: [],
            DatasetSplit.TEST: []
        }
        
        # Track concepts and signatures per split to prevent leakage
        self._split_concepts: Dict[DatasetSplit, Set[str]] = {
            DatasetSplit.DEVELOPMENT: set(),
            DatasetSplit.VALIDATION: set(),
            DatasetSplit.TEST: set()
        }
        
        self._split_signatures: Dict[DatasetSplit, Set[str]] = {
            DatasetSplit.DEVELOPMENT: set(),
            DatasetSplit.VALIDATION: set(),
            DatasetSplit.TEST: set()
        }

    def _compute_signature(self, text: str) -> str:
        """
        Computes a simplified signature of the text to detect near-identical questions.
        For a production system, this could involve embedding similarity, but for now 
        we use normalized string hashing.
        """
        # Lowercase, remove common punctuation and spaces
        normalized = "".join(c for c in text.lower() if c.isalnum())
        return hashlib.md5(normalized.encode('utf-8')).hexdigest()

    def add_example(self, example: EvaluationExample, target_split: DatasetSplit) -> bool:
        """
        Attempts to add an example to a specific split. 
        Returns False and rejects the addition if it would cause leakage.
        """
        # Ensure signature is computed
        if not example.question_text_signature:
            example.question_text_signature = self._compute_signature(example.expected_output)

        # Check for leakage across OTHER splits
        for split in DatasetSplit:
            if split == target_split:
                continue
            
            # Leakage Check 1: Same Concept
            if example.concept in self._split_concepts[split]:
                logger.warning(
                    f"Leakage prevented: Concept '{example.concept}' already exists in {split.value}. "
                    f"Cannot add to {target_split.value}."
                )
                return False
                
            # Leakage Check 2: Near-Identical Text Signature
            if example.question_text_signature in self._split_signatures[split]:
                logger.warning(
                    f"Leakage prevented: Near-identical question signature exists in {split.value}. "
                    f"Cannot add to {target_split.value}."
                )
                return False

        # Safe to add
        self._splits[target_split].append(example)
        self._split_concepts[target_split].add(example.concept)
        self._split_signatures[target_split].add(example.question_text_signature)
        return True

    def get_split(self, split: DatasetSplit) -> List[EvaluationExample]:
        return self._splits[split]

    def build_splits_from_bulk(self, examples: List[EvaluationExample], dev_ratio=0.6, val_ratio=0.2):
        """
        Helper method to distribute a bulk list of examples into splits.
        Groups by concept to ensure all examples for a concept go into the same split.
        """
        examples_by_concept = defaultdict(list)
        for ex in examples:
            examples_by_concept[ex.concept].append(ex)
            
        total_concepts = len(examples_by_concept)
        dev_target = int(total_concepts * dev_ratio)
        val_target = int(total_concepts * val_ratio)
        
        current_concept_idx = 0
        for concept, concept_examples in examples_by_concept.items():
            if current_concept_idx < dev_target:
                target = DatasetSplit.DEVELOPMENT
            elif current_concept_idx < dev_target + val_target:
                target = DatasetSplit.VALIDATION
            else:
                target = DatasetSplit.TEST
                
            for ex in concept_examples:
                self.add_example(ex, target)
                
            current_concept_idx += 1

