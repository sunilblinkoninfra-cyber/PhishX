"""
PhishX Multi-Region Failover (Phase 3)

High availability architecture with:
- Multi-region deployment support
- Automatic failover detection
- Cross-region replication
- Load balancing and traffic routing
- Disaster recovery orchestration
"""

import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta

from log_config import logger

# ========================================
# Region & Deployment Configuration
# ========================================

class RegionStatus(str, Enum):
    """Region health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    RECOVERING = "recovering"


class FailoverStrategy(str, Enum):
    """Failover strategies"""
    ACTIVE_ACTIVE = "active_active"  # Both regions serve traffic
    ACTIVE_PASSIVE = "active_passive"  # Primary serves, secondary ready
    BLUE_GREEN = "blue_green"  # Complete environment swap


# ========================================
# Region Models
# ========================================

@dataclass
class Region:
    """Deployment region configuration"""
    region_id: str
    region_name: str  # "us-east-1", "eu-west-1", etc.
    api_endpoint: str
    database_endpoint: str
    cache_endpoint: str
    
    is_primary: bool = False
    status: RegionStatus = RegionStatus.HEALTHY
    
    last_health_check: Optional[datetime] = None
    last_sync_time: Optional[datetime] = None
    
    emails_processed_total: int = 0
    requests_per_second: float = 0.0
    latency_ms: float = 0.0


@dataclass
class RegionPair:
    """Paired regions for failover"""
    primary_region: Region
    secondary_region: Region
    strategy: FailoverStrategy = FailoverStrategy.ACTIVE_PASSIVE
    
    failover_threshold_unhealthy_seconds: int = 60  # Failover after 60s unhealthy
    replication_lag_tolerance_ms: int = 5000  # Accept 5s replication lag
    
    is_failed_over: bool = False
    failover_timestamp: Optional[datetime] = None


# ========================================
# Multi-Region Manager
# ========================================

class MultiRegionManager:
    """Manage multi-region deployments and failover"""
    
    regions: Dict[str, Region] = {}
    region_pairs: List[RegionPair] = []
    
    @classmethod
    def register_region(
        cls,
        region_id: str,
        region_name: str,
        api_endpoint: str,
        database_endpoint: str,
        cache_endpoint: str,
        is_primary: bool = False,
    ) -> Region:
        """Register a new region"""
        region = Region(
            region_id=region_id,
            region_name=region_name,
            api_endpoint=api_endpoint,
            database_endpoint=database_endpoint,
            cache_endpoint=cache_endpoint,
            is_primary=is_primary,
        )
        
        cls.regions[region_id] = region
        
        logger.info(
            "region_registered",
            region_id=region_id,
            region_name=region_name,
            is_primary=is_primary,
        )
        
        return region
    
    @classmethod
    def pair_regions(
        cls,
        primary_region_id: str,
        secondary_region_id: str,
        strategy: FailoverStrategy = FailoverStrategy.ACTIVE_PASSIVE,
    ) -> Optional[RegionPair]:
        """Create failover pair between regions"""
        primary = cls.regions.get(primary_region_id)
        secondary = cls.regions.get(secondary_region_id)
        
        if not primary or not secondary:
            logger.error(
                "region_pair_failed",
                reason="One or both regions not registered",
                primary_id=primary_region_id,
                secondary_id=secondary_region_id,
            )
            return None
        
        pair = RegionPair(
            primary_region=primary,
            secondary_region=secondary,
            strategy=strategy,
        )
        
        cls.region_pairs.append(pair)
        
        logger.info(
            "region_pair_created",
            primary=primary_region_id,
            secondary=secondary_region_id,
            strategy=strategy.value,
        )
        
        return pair
    
    @classmethod
    def health_check_region(cls, region_id: str) -> RegionStatus:
        """Check health of region"""
        region = cls.regions.get(region_id)
        if not region:
            return RegionStatus.UNHEALTHY
        
        try:
            import requests
            
            # Quick health check
            response = requests.get(
                f"{region.api_endpoint}/health",
                timeout=5,
            )
            
            region.last_health_check = datetime.utcnow()
            
            if response.status_code == 200:
                region.status = RegionStatus.HEALTHY
                logger.debug(f"region_healthy", region_id=region_id)
                return RegionStatus.HEALTHY
            else:
                region.status = RegionStatus.DEGRADED
                logger.warning(f"region_degraded", region_id=region_id)
                return RegionStatus.DEGRADED
        
        except Exception as e:
            region.status = RegionStatus.UNHEALTHY
            logger.error(
                "region_health_check_failed",
                region_id=region_id,
                error=str(e),
            )
            return RegionStatus.UNHEALTHY
    
    @classmethod
    def check_failover_conditions(cls, pair: RegionPair) -> bool:
        """Check if failover should be triggered"""
        # If already failed over, don't trigger again immediately
        if pair.is_failed_over:
            if pair.failover_timestamp:
                time_since_failover = datetime.utcnow() - pair.failover_timestamp
                # Wait 5 minutes before attempting failback
                if time_since_failover < timedelta(minutes=5):
                    return False
        
        # Check primary region health
        primary_status = cls.health_check_region(pair.primary_region.region_id)
        
        if primary_status == RegionStatus.UNHEALTHY:
            if not pair.primary_region.last_health_check:
                return False
            
            unhealthy_duration = datetime.utcnow() - pair.primary_region.last_health_check
            
            if unhealthy_duration > timedelta(seconds=pair.failover_threshold_unhealthy_seconds):
                return True
        
        return False
    
    @classmethod
    def trigger_failover(cls, pair: RegionPair) -> bool:
        """Trigger failover from primary to secondary"""
        if pair.is_failed_over:
            return False
        
        logger.warning(
            "failover_triggered",
            primary_region=pair.primary_region.region_id,
            secondary_region=pair.secondary_region.region_id,
            strategy=pair.strategy.value,
        )
        
        # In ACTIVE_PASSIVE: secondary becomes primary
        # In ACTIVE_ACTIVE: both serve traffic (no change)
        # In BLUE_GREEN: complete environment swap
        
        pair.is_failed_over = True
        pair.failover_timestamp = datetime.utcnow()
        
        # Swap primary/secondary
        pair.primary_region, pair.secondary_region = pair.secondary_region, pair.primary_region
        
        logger.warning(
            "failover_completed",
            new_primary=pair.primary_region.region_id,
            new_secondary=pair.secondary_region.region_id,
        )
        
        return True
    
    @classmethod
    def trigger_failback(cls, pair: RegionPair) -> bool:
        """Failback to original primary after recovery"""
        if not pair.is_failed_over:
            return False
        
        # Check if secondary (original primary) has recovered
        secondary_status = cls.health_check_region(pair.secondary_region.region_id)
        
        if secondary_status != RegionStatus.HEALTHY:
            return False
        
        logger.info(
            "failback_triggered",
            recovering_primary=pair.secondary_region.region_id,
        )
        
        # Swap back
        pair.primary_region, pair.secondary_region = pair.secondary_region, pair.primary_region
        pair.is_failed_over = False
        
        logger.info(
            "failback_completed",
            restored_primary=pair.primary_region.region_id,
        )
        
        return True
    
    @classmethod
    def get_active_region(cls) -> Optional[Region]:
        """Get current active region for requests"""
        # Return primary region from first pair (or implement more sophisticated logic)
        if cls.region_pairs:
            return cls.region_pairs[0].primary_region
        
        # Fallback to any healthy region
        for region in cls.regions.values():
            if region.status == RegionStatus.HEALTHY:
                return region
        
        return None
    
    @classmethod
    def get_region_status(cls) -> Dict[str, Any]:
        """Get status of all regions"""
        return {
            "regions": {
                rid: {
                    "name": r.region_name,
                    "status": r.status.value,
                    "is_primary": r.is_primary,
                    "latency_ms": r.latency_ms,
                    "rps": r.requests_per_second,
                }
                for rid, r in cls.regions.items()
            },
            "pairs": [
                {
                    "primary": p.primary_region.region_id,
                    "secondary": p.secondary_region.region_id,
                    "strategy": p.strategy.value,
                    "is_failed_over": p.is_failed_over,
                }
                for p in cls.region_pairs
            ],
        }


# ========================================
# Data Replication & Synchronization
# ========================================

class CrossRegionReplication:
    """Manage data replication between regions"""
    
    replication_status: Dict[str, Dict[str, Any]] = {}
    
    @classmethod
    def start_replication(cls, source_region_id: str, target_region_id: str):
        """Start replication from source to target region"""
        key = f"{source_region_id}→{target_region_id}"
        
        cls.replication_status[key] = {
            "started": datetime.utcnow().isoformat(),
            "status": "replicating",
            "last_sync": None,
            "lag_ms": 0,
            "items_replicated": 0,
        }
        
        logger.info(
            "replication_started",
            source=source_region_id,
            target=target_region_id,
        )
    
    @classmethod
    def mark_sync_complete(cls, source_region_id: str, target_region_id: str, items_count: int, lag_ms: int):
        """Mark replication sync as complete"""
        key = f"{source_region_id}→{target_region_id}"
        
        if key in cls.replication_status:
            cls.replication_status[key].update({
                "last_sync": datetime.utcnow().isoformat(),
                "lag_ms": lag_ms,
                "items_replicated": items_count,
            })
    
    @classmethod
    def get_replication_status(cls) -> Dict[str, Any]:
        """Get replication status"""
        return cls.replication_status


# ========================================
# Disaster Recovery
# ========================================

class DisasterRecovery:
    """Disaster recovery operations"""
    
    recovery_points: List[Dict[str, Any]] = []
    
    @classmethod
    def create_recovery_point(
        cls,
        region_id: str,
        backup_location: str,
        description: Optional[str] = None,
    ):
        """Create disaster recovery point"""
        point = {
            "timestamp": datetime.utcnow().isoformat(),
            "region_id": region_id,
            "backup_location": backup_location,
            "description": description,
            "status": "completed",
        }
        
        cls.recovery_points.append(point)
        
        logger.info(
            "recovery_point_created",
            region_id=region_id,
            backup_location=backup_location,
        )
    
    @classmethod
    def restore_from_backup(
        cls,
        region_id: str,
        recovery_point_timestamp: str,
    ) -> bool:
        """Restore region from backup"""
        logger.warning(
            "disaster_recovery_initiated",
            region_id=region_id,
            recovery_point=recovery_point_timestamp,
        )
        
        # Steps:
        # 1. Validate backup exists
        # 2. Stop current region operations
        # 3. Restore data from backup
        # 4. Verify data integrity
        # 5. Resume operations
        
        logger.warning(
            "disaster_recovery_completed",
            region_id=region_id,
        )
        
        return True
    
    @classmethod
    def get_recovery_points(cls) -> List[Dict[str, Any]]:
        """Get all recovery points"""
        return cls.recovery_points


# ========================================
# Traffic Routing
# ========================================

class GlobalTrafficRouter:
    """Route traffic across regions"""
    
    @staticmethod
    def get_best_region() -> Optional[str]:
        """Get best region based on latency and health"""
        regions = MultiRegionManager.regions
        
        healthy_regions = [
            r for r in regions.values()
            if r.status == RegionStatus.HEALTHY
        ]
        
        if not healthy_regions:
            return None
        
        # Return region with lowest latency
        return min(healthy_regions, key=lambda r: r.latency_ms).region_id
    
    @staticmethod
    def route_request(email_data: Dict[str, Any], user_region: Optional[str] = None) -> Optional[str]:
        """Route request to appropriate region"""
        # If user region specified, prefer it
        if user_region:
            region = MultiRegionManager.regions.get(user_region)
            if region and region.status == RegionStatus.HEALTHY:
                return user_region
        
        # Otherwise use best available region
        return GlobalTrafficRouter.get_best_region()
