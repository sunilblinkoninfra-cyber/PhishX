"""
Phase 3 Shadow Models & A/B Testing Integration

Integrates shadow model framework into ML model endpoints.
Enables safe testing of new models without production risk.
"""

import os
import uuid
from typing import Dict, Any, Optional, Callable
from datetime import datetime

from shadow_models import (
    ShadowModelManager,
    CanaryDeploymentManager,
    ModelRouter,
    CanaryDeploymentStrategy,
)
from log_config import logger


# ========================================
# Configuration
# ========================================

class ShadowModelConfig:
    """Shadow model configuration from environment"""
    
    SHADOW_MODELS_ENABLED = os.getenv("SHADOW_MODELS_ENABLED", "false").lower() == "true"
    ACTIVE_EXPERIMENT_ID = os.getenv("ACTIVE_EXPERIMENT_ID")
    ACTIVE_CANARY_ID = os.getenv("ACTIVE_CANARY_ID")
    CANARY_TRAFFIC_PERCENTAGE = float(os.getenv("CANARY_TRAFFIC_PERCENTAGE", 0))
    CANARY_STRATEGY = os.getenv("CANARY_STRATEGY", "linear")  # linear or exponential


# ========================================
# Shadow Model Manager Singleton
# ========================================

_shadow_manager: Optional[ShadowModelManager] = None
_canary_manager: Optional[CanaryDeploymentManager] = None


def get_shadow_manager() -> Optional[ShadowModelManager]:
    """Get singleton shadow model manager"""
    global _shadow_manager
    
    if not ShadowModelConfig.SHADOW_MODELS_ENABLED:
        return None
    
    if _shadow_manager is None:
        try:
            _shadow_manager = ShadowModelManager()
            logger.info("shadow_model_manager_initialized")
        except Exception as e:
            logger.error("shadow_model_manager_initialization_failed", error=str(e))
    
    return _shadow_manager


def get_canary_manager() -> Optional[CanaryDeploymentManager]:
    """Get singleton canary deployment manager"""
    global _canary_manager
    
    if not ShadowModelConfig.SHADOW_MODELS_ENABLED:
        return None
    
    if _canary_manager is None:
        try:
            _canary_manager = CanaryDeploymentManager()
            logger.info("canary_deployment_manager_initialized")
        except Exception as e:
            logger.error("canary_deployment_manager_initialization_failed", error=str(e))
    
    return _canary_manager


# ========================================
# Experiment Management
# ========================================

def create_shadow_experiment(
    experiment_name: str,
    production_model_name: str,
    shadow_model_name: str,
    description: str = None,
) -> Optional[Dict[str, Any]]:
    """
    Create new shadow model experiment.
    
    Args:
        experiment_name: Name of experiment (e.g., "URL Analyzer v2 Validation")
        production_model_name: Current production model (e.g., "url_analyzer_v1")
        shadow_model_name: Candidate model (e.g., "url_analyzer_v2")
        description: Optional experiment description
    
    Returns:
        Experiment details dict with experiment_id
    """
    manager = get_shadow_manager()
    if not manager:
        logger.warning("shadow_models_disabled")
        return None
    
    try:
        experiment = manager.create_experiment(
            experiment_name=experiment_name,
            production_model=production_model_name,
            shadow_model=shadow_model_name,
        )
        
        logger.info(
            "shadow_experiment_created",
            experiment_id=experiment.experiment_id,
            production_model=production_model_name,
            shadow_model=shadow_model_name,
        )
        
        return {
            "experiment_id": experiment.experiment_id,
            "experiment_name": experiment.experiment_name,
            "production_model": experiment.production_model,
            "shadow_model": experiment.shadow_model,
            "start_time": datetime.utcnow().isoformat(),
            "status": "active",
        }
    
    except Exception as e:
        logger.error("shadow_experiment_creation_failed", error=str(e))
        return None


def record_model_predictions(
    experiment_id: str,
    email_id: str,
    production_prediction: Dict[str, Any],
    shadow_prediction: Dict[str, Any],
) -> bool:
    """
    Record predictions from both production and shadow models.
    
    Args:
        experiment_id: Experiment identifier
        email_id: Email being analyzed
        production_prediction: Production model output
        shadow_prediction: Shadow model output
    
    Returns:
        True if recorded successfully
    """
    manager = get_shadow_manager()
    if not manager:
        return False
    
    try:
        manager.record_predictions(
            experiment_id=experiment_id,
            email_id=email_id,
            production_prediction=production_prediction,
            shadow_prediction=shadow_prediction,
        )
        
        # Check for disagreement
        if prediction_disagree(production_prediction, shadow_prediction):
            logger.debug(
                "model_prediction_disagreement",
                experiment_id=experiment_id,
                email_id=email_id,
                production=production_prediction.get("decision"),
                shadow=shadow_prediction.get("decision"),
            )
        
        return True
    
    except Exception as e:
        logger.error(
            "record_model_predictions_failed",
            experiment_id=experiment_id,
            error=str(e),
        )
        return False


def prediction_disagree(pred1: Dict[str, Any], pred2: Dict[str, Any]) -> bool:
    """Check if two model predictions disagree"""
    return pred1.get("decision") != pred2.get("decision")


def get_experiment_results(experiment_id: str) -> Optional[Dict[str, Any]]:
    """
    Get results and metrics for completed experiment.
    
    Args:
        experiment_id: Experiment identifier
    
    Returns:
        Experiment results with accuracy, agreement, etc.
    """
    manager = get_shadow_manager()
    if not manager:
        return None
    
    try:
        experiment = manager.get_experiment(experiment_id)
        if not experiment:
            return None
        
        return {
            "experiment_id": experiment.experiment_id,
            "experiment_name": experiment.experiment_name,
            "production_model": experiment.production_model,
            "shadow_model": experiment.shadow_model,
            "predictions_recorded": experiment.predictions_count,
            "disagreements": experiment.disagreement_count,
            "agreement_rate": (
                100 * (1 - experiment.disagreement_count / experiment.predictions_count)
                if experiment.predictions_count > 0
                else 0
            ),
            "production_accuracy": experiment.production_accuracy,
            "shadow_accuracy": experiment.shadow_accuracy,
            "accuracy_improvement": (
                experiment.shadow_accuracy - experiment.production_accuracy
                if experiment.shadow_accuracy else None
            ),
            "latency_production_ms": experiment.production_latency_ms,
            "latency_shadow_ms": experiment.shadow_latency_ms,
            "status": "completed" if experiment.end_time else "active",
            "start_time": experiment.start_time,
            "end_time": experiment.end_time,
        }
    
    except Exception as e:
        logger.error("get_experiment_results_failed", experiment_id=experiment_id, error=str(e))
        return None


# ========================================
# Canary Deployment
# ========================================

def start_canary_deployment(
    model_version: str,
    strategy: str = "linear",
    hypothesis: str = None,
) -> Optional[Dict[str, Any]]:
    """
    Start canary deployment for model (gradual rollout).
    
    Args:
        model_version: Model version to deploy (e.g., "url_analyzer_v2")
        strategy: "linear" (10% steps) or "exponential" (2x steps)
        hypothesis: What we expect to prove with this model
    
    Returns:
        Deployment details
    """
    manager = get_canary_manager()
    if not manager:
        logger.warning("canary_deployments_disabled")
        return None
    
    try:
        strategy_enum = (
            CanaryDeploymentStrategy.LINEAR
            if strategy.lower() == "linear"
            else CanaryDeploymentStrategy.EXPONENTIAL
        )
        
        deployment = manager.start_canary_deployment(
            model_version=model_version,
            strategy=strategy_enum,
        )
        
        logger.info(
            "canary_deployment_started",
            deployment_id=deployment.deployment_id,
            model_version=model_version,
            strategy=strategy,
        )
        
        return {
            "deployment_id": deployment.deployment_id,
            "model_version": model_version,
            "strategy": strategy,
            "traffic_percentage": 0,
            "hypothesis": hypothesis,
            "start_time": datetime.utcnow().isoformat(),
            "status": "in_progress",
        }
    
    except Exception as e:
        logger.error("start_canary_deployment_failed", error=str(e))
        return None


def advance_canary_stage(deployment_id: str) -> Optional[Dict[str, Any]]:
    """
    Advance canary deployment to next stage.
    
    Args:
        deployment_id: Deployment identifier
    
    Returns:
        Updated deployment info
    """
    manager = get_canary_manager()
    if not manager:
        return None
    
    try:
        deployment = manager.advance_canary_stage(deployment_id)
        
        logger.info(
            "canary_stage_advanced",
            deployment_id=deployment_id,
            traffic_percentage=deployment.traffic_percentage,
        )
        
        return {
            "deployment_id": deployment_id,
            "traffic_percentage": deployment.traffic_percentage,
            "status": "completed" if deployment.traffic_percentage >= 100 else "in_progress",
        }
    
    except Exception as e:
        logger.error("advance_canary_stage_failed", deployment_id=deployment_id, error=str(e))
        return None


def rollback_canary(deployment_id: str) -> bool:
    """
    Rollback canary deployment (stop and revert to production).
    
    Args:
        deployment_id: Deployment identifier
    
    Returns:
        True if rollback successful
    """
    manager = get_canary_manager()
    if not manager:
        return False
    
    try:
        manager.rollback_canary(deployment_id)
        
        logger.warning(
            "canary_deployment_rolled_back",
            deployment_id=deployment_id,
        )
        
        return True
    
    except Exception as e:
        logger.error("canary_rollback_failed", deployment_id=deployment_id, error=str(e))
        return False


# ========================================
# Model Routing
# ========================================

def route_to_model(
    production_model_fn: Callable,
    shadow_model_fn: Callable = None,
    email_data: Dict[str, Any] = None,
) -> tuple:
    """
    Route request to appropriate model (production or shadow/canary).
    
    Args:
        production_model_fn: Function to call for production model
        shadow_model_fn: Optional shadow model function
        email_data: Email data for routing decision
    
    Returns:
        Tuple of (use_production, production_result, shadow_result)
    """
    if not ShadowModelConfig.SHADOW_MODELS_ENABLED or not shadow_model_fn:
        # No shadow models, use production only
        try:
            result = production_model_fn(email_data)
            return True, result, None
        except Exception as e:
            logger.error("production_model_error", error=str(e))
            raise
    
    try:
        # Call both models if shadow active
        production_result = production_model_fn(email_data)
        
        try:
            shadow_result = shadow_model_fn(email_data)
        except Exception as e:
            logger.error("shadow_model_error_continuing_with_production", error=str(e))
            shadow_result = None
        
        # Decide which to use (could implement more sophisticated routing)
        use_production = True  # Can be updated based on canary traffic
        
        return use_production, production_result, shadow_result
    
    except Exception as e:
        logger.error("model_routing_error", error=str(e))
        raise


# ========================================
# Monitoring
# ========================================

def get_active_experiments() -> list:
    """Get list of active shadow model experiments"""
    manager = get_shadow_manager()
    if not manager:
        return []
    
    try:
        return manager.get_active_experiments()
    except Exception as e:
        logger.error("get_active_experiments_failed", error=str(e))
        return []


def get_active_canaries() -> list:
    """Get list of active canary deployments"""
    manager = get_canary_manager()
    if not manager:
        return []
    
    try:
        return manager.get_active_deployments()
    except Exception as e:
        logger.error("get_active_canaries_failed", error=str(e))
        return []
