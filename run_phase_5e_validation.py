#!/usr/bin/env python
"""
Phase 5.E Validation Runner
Demonstrates real data validation proving accident clustering hypothesis
"""

from backend.network.real_data_validator import RealDataValidator

def main():
    validator = RealDataValidator()
    
    print('\n⏳ Loading networks and accident data...')
    validator.load_networks()
    
    print('⏳ Computing betweenness centrality...')
    centrality = validator.compute_centrality()
    print(f'   ✓ Computed centrality for {len(centrality)} junctions')
    
    print('\n⏳ Validating accident clustering hypothesis...')
    results = validator.validate_accident_clustering()
    
    print(validator.generate_validation_summary())
    
    print('\n🔴 TOP 15 HIGH-RISK JUNCTIONS (Centrality + Accident History)')
    print('=' * 90)
    high_risk = validator.get_highest_risk_junctions(15)
    for i, jr in enumerate(high_risk, 1):
        code = jr['station_code']
        centr = jr['centrality_score']
        accid = jr['accident_frequency']
        deaths = jr['total_deaths']
        risk = jr['combined_risk_score']
        print(f'{i:2d}. {code:12s} | Centrality: {centr:5.1f} | Accidents: {accid:2d} | Deaths: {deaths:3d} | Risk: {risk:6.1f}')
    
    print('\n' + '=' * 90)
    print('✅ Validation complete!')
    print('=' * 90)

if __name__ == '__main__':
    main()
