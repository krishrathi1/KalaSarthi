# Notifications Workflow

## Overview
Multi-channel notification system for user engagement and updates.

## Workflow Diagram

```mermaid
graph TD
    START([Event Triggered]) --> CLASSIFICATION[Event Classification Agent]
    CLASSIFICATION --> CHANNEL[Channel Selection Agent]
    CHANNEL --> CONTENT[Content Agent]
    
    CONTENT --> EMAIL[Email Agent]
    CONTENT --> PUSH[Push Agent]
    CONTENT --> SMS[SMS Agent]
    CONTENT --> IN_APP[In-App Agent]
    
    EMAIL --> DELIVERY[Delivery Agent]
    PUSH --> DELIVERY
    SMS --> DELIVERY
    IN_APP --> DELIVERY
    
    DELIVERY --> ANALYTICS[Analytics Agent]
    ANALYTICS --> CLASSIFICATION
    
    classDef startClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef processClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    
    class START startClass
    class CLASSIFICATION,CHANNEL,CONTENT,EMAIL,PUSH,SMS,IN_APP,DELIVERY,ANALYTICS processClass
```

## Key Agent Interconnections

- **Event Classification Agent** → **Channel Selection Agent**
- **Channel Selection Agent** → **Content Agent**
- **Content Agent** → **Email Agent**, **Push Agent**, **SMS Agent**, **In-App Agent**
- **Email Agent** → **Delivery Agent**
- **Push Agent** → **Delivery Agent**
- **SMS Agent** → **Delivery Agent**
- **In-App Agent** → **Delivery Agent**
- **Delivery Agent** → **Analytics Agent**
- **Analytics Agent** → **Event Classification Agent**