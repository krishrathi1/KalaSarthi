# Translation Services Workflow

## Overview
Multi-language translation services for content localization.

## Workflow Diagram

```mermaid
graph TD
    START([Content Needs Translation]) --> DETECTION[Language Detection Agent]
    DETECTION --> SELECTION[Target Selection Agent]
    SELECTION --> TRANSLATION[Translation Agent]
    
    TRANSLATION --> HINDI[Hindi Agent]
    TRANSLATION --> ENGLISH[English Agent]
    TRANSLATION --> REGIONAL[Regional Agent]
    
    HINDI --> QUALITY[Quality Agent]
    ENGLISH --> QUALITY
    REGIONAL --> QUALITY
    
    QUALITY --> DELIVERY[Delivery Agent]
    DELIVERY --> START
    
    classDef startClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef processClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    
    class START startClass
    class DETECTION,SELECTION,TRANSLATION,HINDI,ENGLISH,REGIONAL,QUALITY,DELIVERY processClass
```

## Key Agent Interconnections

- **Language Detection Agent** → **Target Selection Agent**
- **Target Selection Agent** → **Translation Agent**
- **Translation Agent** → **Hindi Agent**, **English Agent**, **Regional Agent**
- **Hindi Agent** → **Quality Agent**
- **English Agent** → **Quality Agent**
- **Regional Agent** → **Quality Agent**
- **Quality Agent** → **Delivery Agent**
- **Delivery Agent** → **Language Detection Agent**