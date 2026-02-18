"""
PhishX Shadow Models Framework (Phase 3)

A/B testing framework for safely testing new ML models without affecting production.

Features:
- Run shadow model alongside production model
- Compare predictions and performance metrics
- A/B test traffic routing (shadow vs production)
- Hypothesis testing and statistical significance
- Gradual rollout (shadow → canary → production)
"""

import time
import json
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum

from log_config import logger

# ========================================
# Model & Experiment Configuration
# ========================================

class ModelVersion(str, Enum):
    """Model version identifiers"""
    PRODUCTION = "production"
    CANARY = "canary"
    SHADOW = "shadow"
    CANDIDATE = "candidate"


class CanaryDeploymentStrategy(str, Enum):
    """Canary deployment strategies"""
    LINEAR = "linear"  # 10% -> 20% -> ... -> 100%
    EXPONENTIAL = "exponential"  # 10% -> 20% -> 40% -> ... -> 100%
    MANUAL = "manual"  # Manual control


# ========================================
# Experiment Model
# ========================================

@dataclass
class ShadowModelExperiment:
    """Shadow model A/B test experiment"""
    experiment_id: str
    experiment_name: str
    production_model_version: str
    shadow_model_version: str
    
    start_time: str
    end_time: Optional[str] = None
    
    status: str = "running"  # running, completed, failed
    
    sample_size: int = 0
    shadow_requests: int = 0
    
    # Metrics
    production_accuracy: Optional[float] = None
    shadow_accuracy: Optional[float] = None
    accuracy_improvement: Optional[float] = None
    
    production_latency_ms: Optional[float] = None
    shadow_latency_ms: Optional[float] = None
    
    agreement_rate: Optional[float] = None  # % predictions that match
    disagreement_cases: List[Dict[str, Any]] = None
    
    notes: Optional[str] = None


# ========================================
# Shadow Model Manager
# ========================================

class ShadowModelManager:
    """Manage shadow model experiments"""
    
    active_experiments: Dict[str, ShadowModelExperiment] = {}
    completed_experiments: List[ShadowModelExperiment] = []
    
    @classmethod
    def create_experiment(
        cls,
        experiment_name: str,
        production_model: str,
        shadow_model: str,
    ) -> ShadowModelExperiment:
        """Create new shadow model experiment"""
        experiment = ShadowModelExperiment(
            experiment_id=f"exp_{int(time.time())}",
            experiment_name=experiment_name,
            production_model_version=production_model,
            shadow_model_version=shadow_model,
            start_time=datetime.utcnow().isoformat(),
            disagreement_cases=[],
        )
        
        cls.active_experiments[experiment.experiment_id] = experiment
        
        logger.info(
            "shadow_experiment_created",
            experiment_id=experiment.experiment_id,
            experiment_name=experiment_name,
            production_model=production_model,
            shadow_model=shadow_model,
        )
        
        return experiment
    
    @classmethod
    def get_experiment(cls, experiment_id: str) -> Optional[ShadowModelExperiment]:
        """Get experiment by ID"""
        return cls.active_experiments.get(experiment_id)
    
    @classmethod
    def record_predictions(
        cls,
        experiment_id: str,
        email_id: str,
        production_prediction: Dict[str, Any],
        shadow_prediction: Dict[str, Any],
    ):
        """Record shadow model predictions for comparison"""
        experiment = cls.get_experiment(experiment_id)
        if not experiment:
            return
        
        experiment.sample_size += 1
        experiment.shadow_requests += 1
        
        # Compare predictions
        prod_decision = production_prediction.get("decision")
        shadow_decision = shadow_prediction.get("decision")
        
        # Track disagreements
        if prod_decision != shadow_decision:
            experiment.disagreement_cases.append({
                "email_id": email_id,
                "production_decision": prod_decision,
                "shadow_decision": shadow_decision,
                "production_score": production_prediction.get("risk_score"),
                "shadow_score": shadow_prediction.get("risk_score"),
                "timestamp": datetime.utcnow().isoformat(),
            })
            
            if len(experiment.disagreement_cases) % 10 == 0:
                logger.warning(
                    "shadow_model_disagreement",
                    experiment_id=experiment_id,
                    disagreement_count=len(experiment.disagreement_cases),
                )
        
        # Calculate running agreement rate
        if experiment.sample_size > 0:
            agreement = (experiment.sample_size - len(experiment.disagreement_cases)) / experiment.sample_size
            experiment.agreement_rate = agreement
    
    @classmethod
    def complete_experiment(
        cls,
        experiment_id: str,
        production_accuracy: float,
        shadow_accuracy: float,
    ):
        """Complete shadow model experiment"""
        experiment = cls.get_experiment(experiment_id)
        if not experiment:
            return
        
        experiment.end_time = datetime.utcnow().isoformat()
        experiment.status = "completed"
        experiment.production_accuracy = production_accuracy
        experiment.shadow_accuracy = shadow_accuracy
        experiment.accuracy_improvement = shadow_accuracy - production_accuracy
        
        # Move to completed
        del cls.active_experiments[experiment_id]
        cls.completed_experiments.append(experiment)
        
        logger.info(
            "shadow_experiment_completed",
            experiment_id=experiment_id,
            accuracy_improvement=experiment.accuracy_improvement,
            agreement_rate=experiment.agreement_rate,
        )
    
    @classmethod
    def get_all_experiments(cls) -> Dict[str, Any]:
        """Get all experiments (active and completed)"""
        return {
            "active": {exp_id: asdict(exp) for exp_id, exp in cls.active_experiments.items()},
            "completed": [asdict(exp) for exp in cls.completed_experiments],
        }


# ========================================
# Canary Deployment Manager
# ========================================

class CanaryDeploymentManager:
    """Manage gradual rollout of new models"""
    
    deployments: Dict[str, "CanaryDeployment"] = {}
    
    @dataclass
    class CanaryDeployment:
        """Canary deployment config"""
        deployment_id: str
        model_version: str
        strategy: CanaryDeploymentStrategy
        
        start_time: str
        deployment_stage: int = 0  # 0=0%, 1=10%, 2=20%, ..., 10=100%
        
        traffic_percentage: float = 0.0
        requests_served: int = 0
        errors: int = 0
        
        hypothesis: Optional[str] = None
        success_criteria: Optional[Dict[str, float]] = None
        
        status: str = "in_progress"  # in_progress, completed, rolled_back
    
    @classmethod
    def start_canary_deployment(
        cls,
        model_version: str,
        strategy: CanaryDeploymentStrategy = CanaryDeploymentStrategy.LINEAR,
        hypothesis: Optional[str] = None,
    ) -> "CanaryDeployment":
        """Start canary deployment"""
        deployment = cls.CanaryDeployment(
            deployment_id=f"canary_{int(time.time())}",
            model_version=model_version,
            strategy=strategy,
            start_time=datetime.utcnow().isoformat(),
            hypothesis=hypothesis,
        )
        
        cls.deployments[deployment.deployment_id] = deployment
        
        logger.info(
            "canary_deployment_started",
            deployment_id=deployment.deployment_id,
            model_version=model_version,
            strategy=strategy.value,
        )
        
        return deployment
    
    @classmethod
    def advance_canary_stage(
        cls,
        deployment_id: str,
    ) -> bool:
        """Advance canary to next stage"""
        deployment = cls.deployments.get(deployment_id)
        if not deployment:
            return False
        
        # Calculate next traffic percentage based on strategy
        if deployment.strategy == CanaryDeploymentStrategy.LINEAR:
            deployment.deployment_stage += 1
            deployment.traffic_percentage = min(100.0, deployment.deployment_stage * 10.0)
        
        elif deployment.strategy == CanaryDeploymentStrategy.EXPONENTIAL:
            deployment.deployment_stage += 1
            deployment.traffic_percentage = min(100.0, 10.0 * (2 ** deployment.deployment_stage))
        
        logger.info(
            "canary_stage_advanced",
            deployment_id=deployment_id,
            stage=deployment.deployment_stage,
            traffic_percentage=deployment.traffic_percentage,
        )
        
        # If reached 100%, mark as completed
        if deployment.traffic_percentage >= 100.0:
            deployment.status = "completed"
            logger.info(
                "canary_deployment_completed",
                deployment_id=deployment_id,
                model_version=deployment.model_version,
            )
        
        return True
    
    @classmethod
    def rollback_canary(cls, deployment_id: str) -> bool:
        """Rollback canary deployment"""
        deployment = cls.deployments.get(deployment_id)
        if not deployment:
            return False
        
        deployment.status = "rolled_back"
        deployment.traffic_percentage = 0.0
        
        logger.warning(
            "canary_deployment_rolled_back",
            deployment_id=deployment_id,
            model_version=deployment.model_version,
            reason="Hypothesis not met or errors detected",
        )
        
        return True
    
    @classmethod
    def get_active_deployments(cls) -> List["CanaryDeployment"]:
        """Get active deployments"""
        return [d for d in cls.deployments.values() if d.status == "in_progress"]


# ========================================
# Model Prediction Routing
# ========================================

class ModelRouter:
    """Route predictions to appropriate model version"""
    
    @staticmethod
    def decide_model_version(
        shadow_experiment: Optional[ShadowModelExperiment] = None,
        canary_deployment: Optional[CanaryDeploymentManager.CanaryDeployment] = None,
    ) -> str:
        """Decide which model version to use"""
        import random
        
        # Check if shadow experiment is active
        if shadow_experiment and shadow_experiment.status == "running":
            # Always run shadow model alongside production
            return ModelVersion.SHADOW.value
        
        # Check if canary deployment is active
        if canary_deployment and canary_deployment.status == "in_progress":
            # Roll a dice to see if we should use canary
            if random.random() * 100 < canary_deployment.traffic_percentage:
                return ModelVersion.CANARY.value
        
        # Default to production
        return ModelVersion.PRODUCTION.value
    
    @staticmethod
    def get_predictions(
        email_data: Dict[str, Any],
        production_model_fn,
        shadow_model_fn=None,
        canary_model_fn=None,
    ) -> Tuple[Dict[str, Any], str]:
        """
        Get predictions from appropriate model(s).
        
        Returns:
            (predictions_dict, model_version_used)
        """
        # Always run production model
        production_result = production_model_fn(email_data)
        
        # Check if we should also run shadow/canary
        # This would be determined by active experiments/deployments
        
        return production_result, ModelVersion.PRODUCTION.value


# ========================================
# Statistical Significance Testing
# ========================================

class StatisticalTesting:
    """Test statistical significance of model improvements"""
    
    @staticmethod
    def chi_square_test(
        model_a_predictions: List[Dict[str, Any]],
        model_b_predictions: List[Dict[str, Any]],
        alpha: float = 0.05,
    ) -> Tuple[bool, float]:
        """
        Chi-square test for statistical significance.
        
        Returns:
            (is_significant, p_value)
        """
        # Count predictions by decision type
        a_counts = {"allow": 0, "quarantine": 0, "reject": 0}
        b_counts = {"allow": 0, "quarantine": 0, "reject": 0}
        
        for pred in model_a_predictions:
            decision = pred.get("decision", "allow")
            a_counts[decision] = a_counts.get(decision, 0) + 1
        
        for pred in model_b_predictions:
            decision = pred.get("decision", "allow")
            b_counts[decision] = b_counts.get(decision, 0) + 1
        
        # Calculate chi-square statistic
        chi_square = 0.0
        for decision in a_counts:
            expected = (a_counts[decision] + b_counts[decision]) / 2
            if expected > 0:
                chi_square += ((a_counts[decision] - expected) ** 2) / expected
                chi_square += ((b_counts[decision] - expected) ** 2) / expected
        
        # Approximate p-value (for df=2)
        # For simplicity, use rule: chi_square > 5.99 means p < 0.05
        is_significant = chi_square > 5.99
        p_value = 0.05 if is_significant else 0.5
        
        return is_significant, p_value
    
    @staticmethod
    def calculate_confidence_interval(
        accuracy: float,
        sample_size: int,
        confidence_level: float = 0.95,
    ) -> Tuple[float, float]:
        """Calculate confidence interval for accuracy"""
        import math
        
        z_score = 1.96 if confidence_level == 0.95 else 2.576  # for 99%
        
        margin_of_error = z_score * math.sqrt((accuracy * (1 - accuracy)) / sample_size)
        
        lower = max(0.0, accuracy - margin_of_error)
        upper = min(1.0, accuracy + margin_of_error)
        
        return lower, upper
