"""
Phase 5.E Tests: Real Data Validation
Purpose: Validate that real 40-year accident data proves clustering hypothesis

Test Strategy:
1. CRS Database Tests: Load, index, query accident data
2. Network Builder Tests: Load 108 stations, export to NetworkX
3. Centrality Tests: Compute betweenness, validate scores
4. Validation Tests: Prove accident clustering on high-centrality nodes
5. E2E Tests: Full pipeline from data to proof

Author: DRISHTI Research - Phase 5.E
Date: March 31, 2026
"""

import pytest
import json
from backend.network.crs_accident_database import CRSAccidentDatabase, CRS_ACCIDENT_CORPUS, CRSAccident
from backend.network.ir_network_builder import IRNetworkBuilder, IR_NETWORK_DATA
from backend.network.real_data_validator import RealDataValidator


class TestCRSAccidentDatabase:
    """Test CRS accident corpus loading and querying"""
    
    def test_corpus_loads_correctly(self):
        """Test: CRS corpus loads without errors"""
        assert len(CRS_ACCIDENT_CORPUS) > 0, "Accident corpus should not be empty"
        
        # Validate corpus structure
        for accident in CRS_ACCIDENT_CORPUS:
            assert isinstance(accident, CRSAccident)
            assert accident.station_code, "Each accident must have station code"
            assert accident.year >= 1984, "Accidents should be from 1984 onwards"
            assert accident.deaths > 0, "Accidents should have casualties"
    
    def test_database_indexes_correctly(self):
        """Test: Database indexes accidents by station, zone, cause"""
        db = CRSAccidentDatabase()
        db.load_corpus(CRS_ACCIDENT_CORPUS)
        
        assert len(db.by_station) > 0, "Should index by station"
        assert len(db.by_zone) > 0, "Should index by zone"
        assert len(db.by_cause) > 0, "Should index by cause"
    
    def test_query_accidents_by_junction(self):
        """Test: Can query accidents for specific junctions"""
        db = CRSAccidentDatabase()
        db.load_corpus(CRS_ACCIDENT_CORPUS)
        
        # BLSR (Balasore) should have the 2023 Coromandel accident
        blsr_accidents = db.get_accidents_at_junction("BLSR")
        assert len(blsr_accidents) > 0, "Balasore should have accidents in corpus"
        
        coromandel_2023 = [a for a in blsr_accidents if a.year == 2023]
        assert len(coromandel_2023) > 0, "Should find 2023 Coromandel accident"
        assert coromandel_2023[0].deaths == 296, "Coromandel disaster had 296 deaths"
    
    def test_junction_severity_metrics(self):
        """Test: Junction severity computation"""
        db = CRSAccidentDatabase()
        db.load_corpus(CRS_ACCIDENT_CORPUS)
        
        # Get severity for Balasore (known hotspot)
        severity = db.get_junction_severity("BLSR")
        assert severity["frequency"] > 0, "Balasore should show accident frequency"
        assert severity["total_deaths"] > 0, "Balasore should show total deaths"
        assert severity["highest_fatality"] == 296, "Highest fatality at Balasore is 296"
    
    def test_database_statistics(self):
        """Test: Overall database statistics"""
        db = CRSAccidentDatabase()
        db.load_corpus(CRS_ACCIDENT_CORPUS)
        
        stats = db.get_statistics()
        assert stats["total_accidents"] == len(CRS_ACCIDENT_CORPUS)
        assert stats["total_deaths"] > 0
        assert stats["unique_junctions"] > 0
        assert stats["years_covered"] == "1984-2026"
    
    def test_high_risk_junctions_ranking(self):
        """Test: High-risk junctions ranked by severity"""
        db = CRSAccidentDatabase()
        db.load_corpus(CRS_ACCIDENT_CORPUS)
        
        high_risk = db.get_high_risk_junctions(10)
        assert len(high_risk) > 0, "Should return high-risk junctions"
        assert high_risk[0]["risk_score"] >= high_risk[-1]["risk_score"], "Should be sorted by risk"
        
        # Top junction should be high risk
        top = high_risk[0]
        assert top["accidents"] > 0
        assert top["total_deaths"] > 0


class TestNetworkBuilder:
    """Test IR network loading and export"""
    
    def test_network_builder_loads_stations(self):
        """Test: Network builder loads stations"""
        builder = IRNetworkBuilder()
        builder.load_network_data(IR_NETWORK_DATA)
        
        assert builder.stations is not None
        assert len(builder.stations) > 0, "Should load stations"
        assert len(builder.stations) >= 60, "Should load at least 60 stations"
    
    def test_network_builder_loads_tracks(self):
        """Test: Network builder loads all track segments"""
        builder = IRNetworkBuilder()
        builder.load_network_data(IR_NETWORK_DATA)
        
        assert builder.tracks is not None
        assert len(builder.tracks) > 0, "Should load tracks"
    
    def test_network_statistics(self):
        """Test: Network statistics computation"""
        builder = IRNetworkBuilder()
        builder.load_network_data(IR_NETWORK_DATA)
        
        stats = builder.get_network_statistics()
        assert stats["total_stations"] > 0
        assert len(builder.stations) == stats["total_stations"]
        assert stats["total_tracks"] > 0
        assert stats["total_distance_km"] > 0
    
    def test_high_traffic_junctions(self):
        """Test: Identifies high-traffic junctions"""
        builder = IRNetworkBuilder()
        builder.load_network_data(IR_NETWORK_DATA)
        
        high_traffic = builder.get_high_traffic_junctions()
        assert len(high_traffic) > 0, "Should identify high-traffic junctions"
        
        # Check that results are dictionaries with expected keys
        assert "code" in high_traffic[0]
        assert "name" in high_traffic[0]
        assert "passengers" in high_traffic[0]
    
    def test_networkx_export(self):
        """Test: Export to NetworkX format"""
        try:
            import networkx as nx
        except ImportError:
            pytest.skip("NetworkX not available")
        
        builder = IRNetworkBuilder()
        builder.load_network_data(IR_NETWORK_DATA)
        
        G = builder.export_to_networkx()
        assert isinstance(G, nx.Graph)
        assert len(G.nodes()) == len(builder.stations), "Graph should have same nodes as stations"
        assert len(G.edges()) > 0, "Graph should have edges"
    
    def test_save_and_load_from_file(self, tmp_path):
        """Test: Save network to file and load back"""
        builder = IRNetworkBuilder()
        builder.load_network_data(IR_NETWORK_DATA)
        
        filepath = tmp_path / "network.json"
        builder.save_to_file(str(filepath))
        
        # Load back
        with open(filepath) as f:
            data = json.load(f)
        
        assert len(data["stations"]) == len(builder.stations)
        assert len(data["tracks"]) > 0


class TestCentralityComputation:
    """Test centrality computation for network analysis"""
    
    def test_centrality_computes_without_error(self):
        """Test: Centrality computation works"""
        try:
            import networkx as nx
        except ImportError:
            pytest.skip("NetworkX not available")
        
        validator = RealDataValidator()
        validator.load_networks()
        centrality = validator.compute_centrality()
        
        assert len(centrality) > 0, "Should compute centrality for stations"
        assert all(0 <= v <= 100 for v in centrality.values()), "Centrality should be 0-100"
    
    def test_centrality_tiers(self):
        """Test: Classifies junctions into centrality tiers"""
        try:
            import networkx as nx
        except ImportError:
            pytest.skip("NetworkX not available")
        
        validator = RealDataValidator()
        validator.load_networks()
        validator.compute_centrality()
        
        tiers = validator.get_centrality_tiers()
        assert "ultra_high" in tiers
        assert "high" in tiers
        assert "medium" in tiers
        assert "low" in tiers
        
        # All junctions should be in some tier
        total_in_tiers = sum(len(tiers[t]) for t in tiers)
        assert total_in_tiers == len(validator.centrality_scores), "All junctions should be classified"


class TestAccidentClusteringValidation:
    """Test hypothesis validation"""
    
    def test_validation_hypothesis_statement(self):
        """Test: Validation has clear hypothesis"""
        try:
            import networkx as nx
        except ImportError:
            pytest.skip("NetworkX not available")
        
        validator = RealDataValidator()
        validator.load_networks()
        validator.compute_centrality()
        results = validator.validate_accident_clustering()
        
        assert "hypothesis" in results
        assert "clustering_strength" in results
        assert "conclusion" in results
    
    def test_validation_compares_centrality_tiers(self):
        """Test: Validation compares accident rates across centrality tiers"""
        try:
            import networkx as nx
        except ImportError:
            pytest.skip("NetworkX not available")
        
        validator = RealDataValidator()
        validator.load_networks()
        validator.compute_centrality()
        results = validator.validate_accident_clustering()
        
        by_tier = results["by_centrality_tier"]
        assert "ultra_high" in by_tier
        assert "low" in by_tier
        
        # Ultra high should have more accidents than low
        ultra_high_rate = by_tier["ultra_high"]["accident_rate"]
        low_rate = by_tier["low"]["accident_rate"]
        
        # This is the key hypothesis test
        assert ultra_high_rate >= low_rate, "High-centrality junctions should have more accidents"
    
    def test_validation_computes_risk_ratio(self):
        """Test: Risk ratio computed correctly"""
        try:
            import networkx as nx
        except ImportError:
            pytest.skip("NetworkX not available")
        
        validator = RealDataValidator()
        validator.load_networks()
        validator.compute_centrality()
        results = validator.validate_accident_clustering()
        
        risk_ratio = results["statistical_evidence"]["risk_ratio"]
        assert risk_ratio > 0, "Risk ratio should be positive"
        # With real data, high-centrality should have higher risk
        assert risk_ratio > 1, "High-centrality junctions should have higher risk"
    
    def test_validation_proof_of_determinism(self):
        """Test: Determinism proof generated"""
        try:
            import networkx as nx
        except ImportError:
            pytest.skip("NetworkX not available")
        
        validator = RealDataValidator()
        validator.load_networks()
        validator.compute_centrality()
        results = validator.validate_accident_clustering()
        
        proof = results["proof_of_determinism"]
        assert "claim" in proof
        assert "evidence" in proof
        assert "null_hypothesis_rejected" in proof
        assert proof["null_hypothesis_rejected"] is True
    
    def test_clustering_strength_levels(self):
        """Test: Clustering strength is classified correctly"""
        try:
            import networkx as nx
        except ImportError:
            pytest.skip("NetworkX not available")
        
        validator = RealDataValidator()
        validator.load_networks()
        validator.compute_centrality()
        results = validator.validate_accident_clustering()
        
        strength = results["clustering_strength"]
        valid_strengths = ["VERY_STRONG", "STRONG", "MODERATE", "WEAK"]
        assert strength in valid_strengths, f"Strength should be one of {valid_strengths}"


class TestHighRiskJunctionRanking:
    """Test high-risk junction identification"""
    
    def test_highest_risk_junctions(self):
        """Test: Identifies highest-risk junctions"""
        try:
            import networkx as nx
        except ImportError:
            pytest.skip("NetworkX not available")
        
        validator = RealDataValidator()
        validator.load_networks()
        validator.compute_centrality()
        
        high_risk = validator.get_highest_risk_junctions(10)
        assert len(high_risk) > 0, "Should identify high-risk junctions"
        
        # Should be sorted by risk
        scores = [jr["combined_risk_score"] for jr in high_risk]
        assert scores == sorted(scores, reverse=True), "Should be sorted by risk"
    
    def test_combined_risk_score(self):
        """Test: Combined risk score includes centrality and accidents"""
        try:
            import networkx as nx
        except ImportError:
            pytest.skip("NetworkX not available")
        
        validator = RealDataValidator()
        validator.load_networks()
        validator.compute_centrality()
        
        high_risk = validator.get_highest_risk_junctions(5)
        
        for jr in high_risk:
            assert "station_code" in jr
            assert "centrality_score" in jr
            assert "accident_frequency" in jr
            assert "total_deaths" in jr
            assert "combined_risk_score" in jr


class TestEndToEndValidation:
    """End-to-end validation pipeline"""
    
    def test_full_pipeline_runs(self):
        """Test: Full pipeline from data to proof"""
        try:
            import networkx as nx
        except ImportError:
            pytest.skip("NetworkX not available")
        
        validator = RealDataValidator()
        validator.load_networks()
        validator.compute_centrality()
        results = validator.validate_accident_clustering()
        
        # Get summary
        summary = validator.generate_validation_summary()
        assert "PHASE 5.E REAL DATA VALIDATION RESULTS" in summary
        assert "HYPOTHESIS" in summary
        assert "FINDINGS" in summary
    
    def test_validates_balasore_hotspot(self):
        """Test: Identifies Balasore (2023 disaster) as hotspot"""
        db = CRSAccidentDatabase()
        db.load_corpus(CRS_ACCIDENT_CORPUS)
        
        blsr_severity = db.get_junction_severity("BLSR")
        assert blsr_severity["total_deaths"] >= 296, "Should capture Balasore 2023 disaster"
    
    def test_proves_clustering_with_real_data(self):
        """Test: Real data proves accident clustering hypothesis"""
        try:
            import networkx as nx
        except ImportError:
            pytest.skip("NetworkX not available")
        
        validator = RealDataValidator()
        validator.load_networks()
        validator.compute_centrality()
        results = validator.validate_accident_clustering()
        
        # Core evidence
        risk_ratio = results["statistical_evidence"]["risk_ratio"]
        confidence = int(results["confidence_level"].replace("%", ""))
        
        # With real accident data, should show significant clustering
        assert risk_ratio > 1, "High-centrality should have more accidents"
        assert confidence >= 65, "Should have at least 65% confidence"
        
        # Conclusion should state that accidents are not random
        conclusion = results["conclusion"]
        assert "not random" in conclusion.lower() or "deterministic" in conclusion.lower() or "predictable" in conclusion.lower()


class TestValidationSummary:
    """Test summary generation"""
    
    def test_summary_generation(self):
        """Test: Summary generates without errors"""
        try:
            import networkx as nx
        except ImportError:
            pytest.skip("NetworkX not available")
        
        validator = RealDataValidator()
        validator.load_networks()
        validator.compute_centrality()
        validator.validate_accident_clustering()
        
        summary = validator.generate_validation_summary()
        assert len(summary) > 0
        assert "PHASE 5.E" in summary
        assert "CONCLUSION" in summary


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
