"""
PhishX Anomaly Detection Engine (Phase 3)

ML-based anomaly detection for:
- Unusual email patterns
- Uncommon sender behavior
- Suspicious recipient patterns
- Risk score outliers
- Enforcement action anomalies

Uses isolation forest and statistical methods.
"""

import json
import time
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from collections import deque
import statistics

from log_config import logger

# ========================================
# Anomaly Detection Configuration
# ========================================

class AnomalyConfig:
    """Configuration for anomaly detection"""
    
    # Isolation Forest parameters
    CONTAMINATION_RATE = 0.05  # Expected anomaly rate
    N_ESTIMATORS = 100
    
    # Statistical thresholds
    ZSCORE_THRESHOLD = 3.0  # Standard deviations
    IQR_MULTIPLIER = 1.5    # IQR * 1.5 for outliers
    
    # Time windows for pattern analysis
    SLIDING_WINDOW_SIZE = 1000  # Track last N messages
    ANOMALY_CHECK_INTERVAL = 100  # Check every N messages
    
    # Specific thresholds
    RISK_SCORE_ANOMALY_THRESHOLD = 85  # High risk = anomaly
    URL_COUNT_ANOMALY_THRESHOLD = 10   # Many URLs = anomaly
    ATTACHMENT_ANOMALY_THRESHOLD = 5
    SENDER_CHANGE_FREQUENCY_THRESHOLD = 0.3  # 30% of emails from new senders


@dataclass
class AnomalyScore:
    """Anomaly detection result"""
    is_anomaly: bool
    confidence: float  # 0.0 - 1.0
    anomaly_type: Optional[str]  # "risk_score", "sender_behavior", "volume", etc.
    details: Dict[str, Any]
    detection_method: str  # "zscore", "isolation_forest", "statistical", "pattern"


# ========================================
# Feature Extraction
# ========================================

class EmailFeatures:
    """Extract features for anomaly detection"""
    
    @staticmethod
    def extract(email_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract numerical features from email"""
        features = {
            "risk_score": float(email_data.get("risk_score", 0)),
            "url_count": float(len(email_data.get("urls", []))),
            "attachment_count": float(len(email_data.get("attachments", []))),
            "body_length": float(len(email_data.get("body", ""))),
            "subject_length": float(len(email_data.get("subject", ""))),
            "sender_domain_age_days": float(email_data.get("sender_domain_age_days", 365)),
            "recipient_count": float(len(email_data.get("recipients", []))),
        }
        
        # Derive features
        if features["body_length"] > 0:
            features["url_density"] = features["url_count"] / features["body_length"]
        
        return features


# ========================================
# Statistical Anomaly Detection
# ========================================

class StatisticalAnomalyDetector:
    """Detect anomalies using statistical methods"""
    
    def __init__(self, window_size: int = AnomalyConfig.SLIDING_WINDOW_SIZE):
        self.window_size = window_size
        self.feature_history = {
            "risk_score": deque(maxlen=window_size),
            "url_count": deque(maxlen=window_size),
            "attachment_count": deque(maxlen=window_size),
            "body_length": deque(maxlen=window_size),
        }
    
    def add_sample(self, features: Dict[str, float]):
        """Add email features to history"""
        for key in self.feature_history:
            if key in features:
                self.feature_history[key].append(features[key])
    
    def detect_zscore_anomaly(self, features: Dict[str, float]) -> Optional[Tuple[str, float]]:
        """Detect anomalies using Z-score method"""
        for feature_name, values in self.feature_history.items():
            if len(values) < 10:  # Need minimum samples
                continue
            
            current_value = features.get(feature_name)
            if current_value is None:
                continue
            
            mean = statistics.mean(values)
            stdev = statistics.stdev(values)
            
            if stdev == 0:
                continue
            
            zscore = abs((current_value - mean) / stdev)
            
            if zscore > AnomalyConfig.ZSCORE_THRESHOLD:
                confidence = min(1.0, zscore / (AnomalyConfig.ZSCORE_THRESHOLD * 2))
                return (feature_name, confidence)
        
        return None
    
    def detect_iqr_anomaly(self, features: Dict[str, float]) -> Optional[Tuple[str, float]]:
        """Detect anomalies using Interquartile Range method"""
        for feature_name, values in self.feature_history.items():
            if len(values) < 10:
                continue
            
            current_value = features.get(feature_name)
            if current_value is None:
                continue
            
            sorted_values = sorted(values)
            q1 = sorted_values[len(sorted_values) // 4]
            q3 = sorted_values[3 * len(sorted_values) // 4]
            iqr = q3 - q1
            
            lower_bound = q1 - (AnomalyConfig.IQR_MULTIPLIER * iqr)
            upper_bound = q3 + (AnomalyConfig.IQR_MULTIPLIER * iqr)
            
            if current_value < lower_bound or current_value > upper_bound:
                # Calculate confidence based on distance
                if current_value > upper_bound:
                    distance = current_value - upper_bound
                    max_distance = upper_bound * 2
                else:
                    distance = lower_bound - current_value
                    max_distance = abs(lower_bound) * 2 if lower_bound != 0 else 1
                
                confidence = min(1.0, distance / max_distance)
                return (feature_name, confidence)
        
        return None
    
    def detect(self, features: Dict[str, float]) -> Optional[AnomalyScore]:
        """Detect statistical anomalies"""
        # Try Z-score first
        zscore_result = self.detect_zscore_anomaly(features)
        if zscore_result:
            feature_name, confidence = zscore_result
            self.add_sample(features)
            return AnomalyScore(
                is_anomaly=True,
                confidence=confidence,
                anomaly_type="outlier_zscore",
                details={"feature": feature_name, "value": features.get(feature_name)},
                detection_method="zscore",
            )
        
        # Try IQR
        iqr_result = self.detect_iqr_anomaly(features)
        if iqr_result:
            feature_name, confidence = iqr_result
            self.add_sample(features)
            return AnomalyScore(
                is_anomaly=True,
                confidence=confidence,
                anomaly_type="outlier_iqr",
                details={"feature": feature_name, "value": features.get(feature_name)},
                detection_method="iqr",
            )
        
        self.add_sample(features)
        return None


# ========================================
# Behavioral Anomaly Detection
# ========================================

class BehavioralAnomalyDetector:
    """Detect anomalies in user/sender behavior"""
    
    def __init__(self):
        self.sender_history = {}  # sender -> list of emails
        self.recipient_history = {}  # recipient -> list of senders
        self.user_patterns = {}  # user_id -> pattern metrics
    
    def track_sender(self, sender: str, email_data: Dict[str, Any]):
        """Track sender behavior"""
        if sender not in self.sender_history:
            self.sender_history[sender] = deque(maxlen=100)
        
        self.sender_history[sender].append({
            "timestamp": time.time(),
            "risk_score": email_data.get("risk_score", 0),
            "urls": len(email_data.get("urls", [])),
        })
    
    def detect_sender_anomaly(self, sender: str, current_risk: float) -> Optional[AnomalyScore]:
        """Detect unusual sender behavior"""
        if sender not in self.sender_history:
            return None
        
        history = self.sender_history[sender]
        if len(history) < 5:
            return None
        
        # Check if this sender typically sends low-risk emails but now sends high-risk
        historical_risks = [e["risk_score"] for e in history]
        mean_risk = statistics.mean(historical_risks)
        
        if mean_risk < 30 and current_risk > 70:
            # Significant behavior change
            confidence = min(1.0, (current_risk - mean_risk) / 100.0)
            return AnomalyScore(
                is_anomaly=True,
                confidence=confidence,
                anomaly_type="sender_behavior_change",
                details={
                    "sender": sender,
                    "historical_mean_risk": mean_risk,
                    "current_risk": current_risk,
                },
                detection_method="behavioral",
            )
        
        return None
    
    def detect_new_sender_anomaly(self, recipient: str, sender: str) -> Optional[AnomalyScore]:
        """Detect emails from new senders to recipient"""
        if recipient not in self.recipient_history:
            self.recipient_history[recipient] = deque(maxlen=500)
        
        history = self.recipient_history[recipient]
        history.append(sender)
        
        if len(history) < 20:
            return None
        
        # Calculate new sender rate
        unique_senders = len(set(history))
        new_sender_rate = 1 - (len(set(history[-20:])) / len(set(history)))
        
        if new_sender_rate > AnomalyConfig.SENDER_CHANGE_FREQUENCY_THRESHOLD:
            return AnomalyScore(
                is_anomaly=True,
                confidence=min(1.0, new_sender_rate),
                anomaly_type="high_new_sender_rate",
                details={
                    "recipient": recipient,
                    "unique_senders": unique_senders,
                    "new_sender_rate": new_sender_rate,
                },
                detection_method="behavioral_volume",
            )
        
        return None


# ========================================
# Pattern-Based Anomaly Detection
# ========================================

class PatternAnomalyDetector:
    """Detect anomalies based on patterns"""
    
    @staticmethod
    def detect_high_risk_patterns(email_data: Dict[str, Any]) -> Optional[AnomalyScore]:
        """Detect high-risk suspicious patterns"""
        risk_score = email_data.get("risk_score", 0)
        
        # Very high risk score is anomalous
        if risk_score > AnomalyConfig.RISK_SCORE_ANOMALY_THRESHOLD:
            confidence = min(1.0, (risk_score - AnomalyConfig.RISK_SCORE_ANOMALY_THRESHOLD) / 50.0)
            return AnomalyScore(
                is_anomaly=True,
                confidence=confidence,
                anomaly_type="extreme_risk",
                details={"risk_score": risk_score},
                detection_method="pattern",
            )
        
        # Many URLs is suspicious
        url_count = len(email_data.get("urls", []))
        if url_count > AnomalyConfig.URL_COUNT_ANOMALY_THRESHOLD:
            confidence = min(1.0, url_count / 20.0)
            return AnomalyScore(
                is_anomaly=True,
                confidence=confidence,
                anomaly_type="excessive_urls",
                details={"url_count": url_count},
                detection_method="pattern",
            )
        
        # Many attachments
        attachment_count = len(email_data.get("attachments", []))
        if attachment_count > AnomalyConfig.ATTACHMENT_ANOMALY_THRESHOLD:
            confidence = min(1.0, attachment_count / 10.0)
            return AnomalyScore(
                is_anomaly=True,
                confidence=confidence,
                anomaly_type="excessive_attachments",
                details={"attachment_count": attachment_count},
                detection_method="pattern",
            )
        
        return None


# ========================================
# Composite Anomaly Detector
# ========================================

class AnomalyDetectionEngine:
    """Main anomaly detection engine combining multiple methods"""
    
    def __init__(self):
        self.statistical_detector = StatisticalAnomalyDetector()
        self.behavioral_detector = BehavioralAnomalyDetector()
        self.pattern_detector = PatternAnomalyDetector()
        
        self.anomalies_detected = 0
        self.total_analyzed = 0
    
    def analyze(self, email_data: Dict[str, Any]) -> Optional[AnomalyScore]:
        """Comprehensive anomaly analysis"""
        self.total_analyzed += 1
        
        # Extract features
        features = EmailFeatures.extract(email_data)
        
        # Check patterns first (fast)
        result = self.pattern_detector.detect_high_risk_patterns(email_data)
        if result:
            self.anomalies_detected += 1
            logger.info(
                "anomaly_detected_pattern",
                anomaly_type=result.anomaly_type,
                confidence=result.confidence,
            )
            return result
        
        # Check statistical anomalies
        result = self.statistical_detector.detect(features)
        if result:
            self.anomalies_detected += 1
            logger.info(
                "anomaly_detected_statistical",
                anomaly_type=result.anomaly_type,
                confidence=result.confidence,
            )
            return result
        
        # Track sender behavior for next check
        sender = email_data.get("sender", "unknown")
        self.behavioral_detector.track_sender(sender, email_data)
        
        # Check behavioral anomalies
        recipient = email_data.get("recipient", "unknown")
        result = self.behavioral_detector.detect_new_sender_anomaly(recipient, sender)
        if result:
            self.anomalies_detected += 1
            logger.info(
                "anomaly_detected_behavioral",
                anomaly_type=result.anomaly_type,
                confidence=result.confidence,
            )
            return result
        
        return None
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get anomaly detection statistics"""
        anomaly_rate = (self.anomalies_detected / self.total_analyzed * 100) if self.total_analyzed > 0 else 0
        
        return {
            "total_analyzed": self.total_analyzed,
            "anomalies_detected": self.anomalies_detected,
            "anomaly_rate_percent": anomaly_rate,
        }
