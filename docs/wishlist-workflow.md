# Wishlist Workflow

## Overview
Product wishlist management with recommendations and price tracking.

## Workflow Diagram

```mermaid
graph TD
    START([User Browses Products]) --> INTERACTION[Product Interaction Agent]
    INTERACTION --> WISHLIST[Wishlist Agent]
    WISHLIST --> RECOMMENDATIONS[Recommendations Agent]
    
    RECOMMENDATIONS --> SIMILAR[Similar Products Agent]
    RECOMMENDATIONS --> TRENDS[Trends Agent]
    
    SIMILAR --> WISHLIST
    TRENDS --> WISHLIST
    
    WISHLIST --> TRACKING[Price Tracking Agent]
    TRACKING --> ALERTS[Alerts Agent]
    ALERTS --> WISHLIST
    
    classDef startClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef processClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    
    class START startClass
    class INTERACTION,WISHLIST,RECOMMENDATIONS,SIMILAR,TRENDS,TRACKING,ALERTS processClass
```

## Key Agent Interconnections

- **Product Interaction Agent** → **Wishlist Agent**
- **Wishlist Agent** → **Recommendations Agent**
- **Recommendations Agent** → **Similar Products Agent**, **Trends Agent**
- **Similar Products Agent** → **Wishlist Agent**
- **Trends Agent** → **Wishlist Agent**
- **Wishlist Agent** → **Price Tracking Agent**
- **Price Tracking Agent** → **Alerts Agent**
- **Alerts Agent** → **Wishlist Agent**