# Design Generator Workflow

## Overview
AI-powered image generation for product photos and marketing materials.

## Workflow Diagram

```mermaid
graph TD
    START([User Requests Image]) --> AUTH_CHECK{Authenticated?}
    AUTH_CHECK -->|No| LOGIN[Login Agent]
    AUTH_CHECK -->|Yes| INPUT[Input Agent]
    
    INPUT --> PROMPT[Prompt Agent]
    INPUT --> VOICE[Voice Agent]
    INPUT --> UPLOAD[Upload Agent]
    
    PROMPT --> AI[AI Generation Agent]
    VOICE --> AI
    UPLOAD --> AI
    
    AI --> PROCESSING[Processing Agent]
    PROCESSING --> OUTPUT[Output Agent]
    OUTPUT --> GALLERY[Gallery Agent]
    
    GALLERY --> INPUT
    
    LOGIN --> INPUT
    
    classDef startClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef decisionClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef processClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef aiClass fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    
    class START startClass
    class AUTH_CHECK decisionClass
    class LOGIN,INPUT,PROMPT,VOICE,UPLOAD,PROCESSING,OUTPUT,GALLERY processClass
    class AI aiClass
```

## Key Agent Interconnections

- **Input Agent** → **Prompt Agent**, **Voice Agent**, **Upload Agent**
- **Prompt Agent** → **AI Generation Agent**
- **Voice Agent** → **AI Generation Agent**
- **Upload Agent** → **AI Generation Agent**
- **AI Generation Agent** → **Processing Agent**
- **Processing Agent** → **Output Agent**
- **Output Agent** → **Gallery Agent**
- **Gallery Agent** → **Input Agent**