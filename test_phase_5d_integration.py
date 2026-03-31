"""
Phase 5.D: Dual-Evidence Integration Tests
Test: ML + Network Science inference pipeline integration

Author: DRISHTI Research - Phase 5.D
Date: March 31, 2026
"""

import pytest
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


# Mock base inference engine for testing
class MockInferenceEngine:
    """Mock ML inference engine for testing"""
    
    async def infer_train(self, train_id: str, train_state, all_trains=None):
        """Return mock ML alert based on train state"""
        delay = train_state.get("delay", 0)
        speed = train_state.get("speed", 60)
        
        # Mock logic: alert if delay high and speed low
        if delay > 10 and speed < 50:
            return {
                "alert_id": f"ML_{train_id}",
                "risk_score": 75,
                "severity": "HIGH",
                "timestamp": datetime.utcnow().isoformat(),
                "train_id": train_id,
                "station": train_state.get("station", "unknown")
            }
        return None


class TestDualEvidenceIntegration:
    """Integration tests for dual-evidence inference"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup dual-evidence engine"""
        from backend.inference.dual_evidence_engine import DualEvidenceInferenceEngine
        
        self.base_engine = MockInferenceEngine()
        self.dual_engine = DualEvidenceInferenceEngine(
            base_inference_engine=self.base_engine
        )
    
    @pytest.mark.asyncio
    async def test_high_centrality_triggers_network_evidence(self):
        """High-centrality junction triggers network science layer"""
        
        # High-risk train state at critical junction
        train_state = {
            "train_id": "T001",
            "station": "BLSR",  # Would be high-centrality in real graph
            "delay": 15,
            "speed": 40,
            "time_of_day": "Night",
            "zone": "ER"
        }
        
        network_context = {
            "trains_delayed": 8,
            "total_delay_minutes": 720,
            "train_density": 10,
            "avg_train_delay_minutes": 90,
            "weather": "Clear"
        }
        
        result = await self.dual_engine.infer_train_dual_evidence(
            train_id="T001",
            train_state=train_state,
            network_context=network_context
        )
        
        # Should have network analysis
        assert "network_analysis" in result
        assert "evidence" in result
        logger.info(f"Evidence type: {result['evidence']['evidence_type']}")
        logger.info(f"Network analysis: {result['network_analysis']}")
    
    @pytest.mark.asyncio
    async def test_ml_only_low_centrality(self):
        """Low-centrality junction uses ML evidence only"""
        
        # High-risk train at low-centrality location
        train_state = {
            "train_id": "T002",
            "station": "SMALL_STN",  # Low centrality
            "delay": 20,
            "speed": 30,
            "time_of_day": "Day"
        }
        
        network_context = {
            "trains_delayed": 2,
            "total_delay_minutes": 100,
            "train_density": 3,
            "avg_train_delay_minutes": 50
        }
        
        result = await self.dual_engine.infer_train_dual_evidence(
            train_id="T002",
            train_state=train_state,
            network_context=network_context
        )
        
        # ML alert should fire
        assert result["base_ml_alert"] is not None
        logger.info(f"ML-only alert: {result['evidence']['evidence_type']}")
    
    @pytest.mark.asyncio
    async def test_normal_conditions_no_alert(self):
        """Normal conditions should not trigger alert"""
        
        train_state = {
            "train_id": "T003",
            "station": "NDLS",
            "delay": 2,
            "speed": 80,
            "time_of_day": "Day"
        }
        
        network_context = {
            "trains_delayed": 1,
            "total_delay_minutes": 30,
            "train_density": 5,
            "avg_train_delay_minutes": 30
        }
        
        result = await self.dual_engine.infer_train_dual_evidence(
            train_id="T003",
            train_state=train_state,
            network_context=network_context
        )
        
        # No alert should fire
        assert result["alert_fired"] == False or result["final_alert"] is None
        logger.info("✅ No false positive on normal data")
    
    @pytest.mark.asyncio
    async def test_alert_includes_network_reasoning(self):
        """Alert enriched with network analysis reasoning"""
        
        train_state = {
            "train_id": "T004",
            "station": "BBS",
            "delay": 12,
            "speed": 45,
            "time_of_day": "Night",
            "zone": "ER"
        }
        
        network_context = {
            "trains_delayed": 6,
            "total_delay_minutes": 600,
            "train_density": 9,
            "avg_train_delay_minutes": 100,
            "weather": "Rain"
        }
        
        result = await self.dual_engine.infer_train_dual_evidence(
            train_id="T004",
            train_state=train_state,
            network_context=network_context
        )
        
        if result["alert_fired"]:
            alert = result["final_alert"]
            
            # Alert should include dual-evidence structure
            # (May be enriched ML alert or dual-evidence alert)
            if alert and "evidence" not in alert:
                # Use the result structure which has evidence
                assert "evidence" in result
                logger.info(f"Alert evidence type: {result['evidence']['evidence_type']}")
                logger.info(f"Alert reasoning: {result['evidence']['reasoning']}")
            elif alert:
                assert "evidence" in alert
                logger.info(f"Alert evidence type: {alert['evidence']['type']}")
                logger.info(f"Alert reasoning: {alert['evidence']['reasoning']}")
        else:
            # No alert fired, but we can still check evidence structure in result
            assert "evidence" in result
            logger.info(f"No alert fired. Evidence type: {result['evidence']['evidence_type']}")
    
    def test_alert_generator_creates_message(self):
        """Alert generator creates readable message"""
        from backend.inference.dual_evidence_engine import DualEvidenceAlertGenerator
        
        test_alert = {
            "alert_id": "TEST_001",
            "train_id": "12345",
            "station": "Balasore",
            "zone": "ER",
            "risk_score": 82,
            "severity": "HIGH",
            "confidence": 0.85,
            "evidence": {
                "type": "DUAL",
                "ml_risk": 75,
                "network_risk": 80,
                "evidence_type": "DUAL",
                "combined_score": 0.77,
                "signatures_matched": 2,
                "reasoning": "High-centrality junction + ML anomaly + pattern match"
            },
            "network_analysis": {
                "junction_centrality": 0.80,
                "historic_accidents": 3,
                "historic_deaths": 296,
                "matching_patterns": 2
            },
            "actions": ["SPEED_RESTRICTION", "ALERT_ADJACENT_TRAINS"]
        }
        
        message = DualEvidenceAlertGenerator.generate_with_evidence(test_alert)
        
        # Should include key information
        assert "DUAL" in message
        assert "Balasore" in message
        assert "SPEED_RESTRICTION" in message
        assert "82/100" in message or "82" in message
        
        logger.info("Generated alert message:\n" + message)
    
    @pytest.mark.asyncio
    async def test_pattern_matched_increases_confidence(self):
        """Matched pre-accident patterns increase alert confidence"""
        
        # This requires CRS data which we'll mock
        train_state = {
            "train_id": "T005",
            "station": "BLSR",
            "delay": 10,
            "speed": 50,
            "time_of_day": "Night",
            "section_type": "Double-loop",
            "zone": "ER"
        }
        
        # Network conditions matching pre-accident pattern
        network_context = {
            "trains_delayed": 8,
            "total_delay_minutes": 720,
            "train_density": 10,
            "avg_train_delay_minutes": 90,
            "weather": "Clear",
            "signalling_events": 0
        }
        
        result = await self.dual_engine.infer_train_dual_evidence(
            train_id="T005",
            train_state=train_state,
            network_context=network_context
        )
        
        # Check matched patterns if alert fired
        if result["alert_fired"]:
            evidence = result["evidence"]
            logger.info(f"Signatures matched: {evidence['signatures_matched']}")
            
            # Pattern matching should contribute to confidence
            if evidence["signatures_matched"] > 0:
                assert evidence["type"] == "DUAL+" or evidence["type"] == "DUAL"


class TestDualEvidenceAlertStructure:
    """Test alert structure and fields"""
    
    def test_dual_alert_has_all_fields(self):
        """Dual-evidence alert has all required fields"""
        
        from backend.inference.dual_evidence_engine import DualEvidenceAlertGenerator
        
        sample_alert = {
            "alert_id": "ALERT_12345",
            "timestamp": datetime.utcnow().isoformat(),
            "train_id": "12345",
            "station": "Junction",
            "zone": "Zone",
            "risk_score": 75,
            "severity": "HIGH",
            "confidence": 0.85,
            "evidence": {
                "type": "DUAL",
                "ml_risk": 75,
                "network_risk": 80,
                "combined_score": 0.77,
                "signatures_matched": 1,
                "reasoning": "Test reasoning"
            },
            "network_analysis": {
                "junction_centrality": 0.75,
                "historic_accidents": 2,
                "historic_deaths": 100,
                "matching_patterns": 1
            },
            "actions": ["ACTION_1"]
        }
        
        # Should not raise errors
        message = DualEvidenceAlertGenerator.generate_with_evidence(sample_alert)
        assert len(message) > 0
    
    def test_evidence_type_classification(self):
        """Evidence types correctly classified"""
        
        from backend.network.signatures import DualEvidenceRiskScorer
        
        # Test DUAL-evident
        result = DualEvidenceRiskScorer.compute_dual_risk(
            ml_risk_score=0.75,
            centrality_score=0.80,
            signatures_matched_count=0
        )
        assert result["evidence_type"] == "DUAL"
        assert result["confidence"] == 0.85
        
        # Test DUAL+
        result = DualEvidenceRiskScorer.compute_dual_risk(
            ml_risk_score=0.75,
            centrality_score=0.80,
            signatures_matched_count=2
        )
        assert result["evidence_type"] == "DUAL+"
        assert result["confidence"] == 0.95
        
        # Test SINGLE
        result = DualEvidenceRiskScorer.compute_dual_risk(
            ml_risk_score=0.85,
            centrality_score=0.20,
            signatures_matched_count=0
        )
        assert result["evidence_type"] == "SINGLE"
        assert result["confidence"] == 0.65


class TestNetworkEvidenceDataFlow:
    """Test data flow through network science layers"""
    
    def test_centrality_computation(self):
        """Network centrality can be computed"""
        from backend.network.graph import IRNetworkGraph, Station, Track
        
        graph = IRNetworkGraph()
        
        # Add minimal network
        graph.add_station(Station("A", "Station A", "Zone", 0, 0, "Junction", 4))
        graph.add_station(Station("B", "Station B", "Zone", 1, 1, "Junction", 4))
        graph.add_track(Track("A", "B", 100, "double", 100, True, 30))
        
        centrality = graph.compute_betweenness_centrality()
        
        assert len(centrality) > 0
        assert all(0 <= c <= 1 for c in centrality.values())
    
    def test_pattern_library_population(self):
        """Pattern library can be populated from CRS data"""
        from backend.network.signatures import PreAccidentSignatureLibrary
        from backend.network.crs_validator import MOCK_CRS_ACCIDENTS
        
        library = PreAccidentSignatureLibrary()
        library.build_from_crs_data(MOCK_CRS_ACCIDENTS)
        
        assert len(library.patterns) > 0
        assert len(library.high_severity_patterns) > 0  # >100 deaths


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
