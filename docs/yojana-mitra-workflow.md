# Yojana Mitra Workflow

## Overview
Government scheme discovery and application assistance for artisans and small businesses.

## Workflow Diagram

```mermaid
graph TD
    START([User Accesses Yojana Mitra]) --> AUTH_CHECK{Authenticated?}
    AUTH_CHECK -->|No| LOGIN[Login Agent]
    AUTH_CHECK -->|Yes| PROFILE[Profile Agent]
    
    PROFILE --> DISCOVERY[Scheme Discovery Agent]
    DISCOVERY --> MATCHING[Eligibility Matching Agent]
    MATCHING --> RECOMMENDATIONS[Recommendations Agent]
    
    RECOMMENDATIONS --> APPLICATION[Application Agent]
    APPLICATION --> SUBMISSION[Submission Agent]
    SUBMISSION --> TRACKING[Tracking Agent]
    
    TRACKING --> PROFILE
    
    LOGIN --> PROFILE
    
    classDef startClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef decisionClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef processClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    
    class START startClass
    class AUTH_CHECK decisionClass
    class LOGIN,PROFILE,DISCOVERY,MATCHING,RECOMMENDATIONS,APPLICATION,SUBMISSION,TRACKING processClass
```

## Key Agent Interconnections

- **Profile Agent** → **Scheme Discovery Agent**
- **Scheme Discovery Agent** → **Eligibility Matching Agent**
- **Eligibility Matching Agent** → **Recommendations Agent**
- **Recommendations Agent** → **Application Agent**
- **Application Agent** → **Submission Agent**
- **Submission Agent** → **Tracking Agent**
- **Tracking Agent** → **Profile Agent**