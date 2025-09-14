# Product Creator Workflow

## Overview
AI-powered product creation tool for artisans with voice guidance and automated content generation.

## Workflow Diagram

```mermaid
graph TD
    START([User Starts Creator]) --> AUTH_CHECK{Authenticated?}
    AUTH_CHECK -->|No| LOGIN[Login Agent]
    AUTH_CHECK -->|Yes| CREATOR[Creator Agent]
    
    CREATOR --> IMAGE[Image Agent]
    CREATOR --> VOICE[Voice Agent]
    CREATOR --> STORY[Story Agent]
    
    IMAGE --> AI[AI Processing Agent]
    VOICE --> AI
    STORY --> AI
    
    AI --> DETAILS[Product Details Agent]
    DETAILS --> PRICING[Pricing Agent]
    PRICING --> PUBLISH[Publish Agent]
    
    PUBLISH --> CREATOR
    
    LOGIN --> CREATOR
    
    classDef startClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef decisionClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef processClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef aiClass fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    
    class START startClass
    class AUTH_CHECK decisionClass
    class LOGIN,CREATOR,IMAGE,VOICE,STORY,DETAILS,PRICING,PUBLISH processClass
    class AI aiClass
```

## Key Agent Interconnections

- **Creator Agent** → **Image Agent**, **Voice Agent**, **Story Agent**
- **Image Agent** → **AI Processing Agent**
- **Voice Agent** → **AI Processing Agent**
- **Story Agent** → **AI Processing Agent**
- **AI Processing Agent** → **Product Details Agent**
- **Product Details Agent** → **Pricing Agent**
- **Pricing Agent** → **Publish Agent**
- **Publish Agent** → **Creator Agent**