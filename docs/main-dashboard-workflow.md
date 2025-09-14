# Main Dashboard Workflow

## Overview
The primary interface and entry point for the KalaSarthi web application, providing an overview of all features and quick access to key functions.

## Workflow Diagram

```mermaid
graph TD
    START([User Opens KalaSarthi]) --> AUTH_CHECK{Authenticated?}
    AUTH_CHECK -->|No| LOGIN[Login Agent]
    AUTH_CHECK -->|Yes| MAIN_DASHBOARD[Main Dashboard Agent]
    
    MAIN_DASHBOARD --> OVERVIEW[Overview Agent]
    MAIN_DASHBOARD --> QUICK_ACCESS[Quick Access Agent]
    MAIN_DASHBOARD --> NOTIFICATIONS[Notifications Agent]
    MAIN_DASHBOARD --> ANALYTICS[Analytics Agent]
    
    OVERVIEW --> REVENUE_SUMMARY[Revenue Summary Agent]
    OVERVIEW --> RECENT_ACTIVITY[Recent Activity Agent]
    OVERVIEW --> STATS[Stats Agent]
    
    QUICK_ACCESS --> INVENTORY[Inventory Dashboard Agent]
    QUICK_ACCESS --> FINANCE[Finance Services Agent]
    QUICK_ACCESS --> TRENDS[Trend Spotter Agent]
    QUICK_ACCESS --> CREATOR[Smart Product Creator Agent]
    QUICK_ACCESS --> VOICE[Voice Assistant Agent]
    QUICK_ACCESS --> YOJANA[Yojana Mitra Agent]
    
    NOTIFICATIONS --> ALERTS[Alerts Agent]
    NOTIFICATIONS --> UPDATES[Updates Agent]
    
    ANALYTICS --> PERFORMANCE[Performance Agent]
    ANALYTICS --> INSIGHTS[Insights Agent]
    
    LOGIN --> MAIN_DASHBOARD
    
    classDef startClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef decisionClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef processClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef featureClass fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    
    class START startClass
    class AUTH_CHECK decisionClass
    class LOGIN,MAIN_DASHBOARD,OVERVIEW,QUICK_ACCESS,NOTIFICATIONS,ANALYTICS,REVENUE_SUMMARY,RECENT_ACTIVITY,STATS,ALERTS,UPDATES,PERFORMANCE,INSIGHTS processClass
    class INVENTORY,FINANCE,TRENDS,CREATOR,VOICE,YOJANA featureClass
```

## Key Agent Interconnections

### Main Dashboard Components
- **Main Dashboard Agent** → **Overview Agent**, **Quick Access Agent**, **Notifications Agent**, **Analytics Agent**

### Overview Section
- **Overview Agent** → **Revenue Summary Agent**, **Recent Activity Agent**, **Stats Agent**

### Quick Access to Features
- **Quick Access Agent** → **Inventory Dashboard Agent**, **Finance Services Agent**, **Trend Spotter Agent**, **Smart Product Creator Agent**, **Voice Assistant Agent**, **Yojana Mitra Agent**

### Notifications
- **Notifications Agent** → **Alerts Agent**, **Updates Agent**

### Analytics
- **Analytics Agent** → **Performance Agent**, **Insights Agent**

## Main Dashboard Features

### Overview Cards
- **Revenue Summary**: Today's sales, monthly revenue, growth trends
- **Recent Activity**: Latest orders, new products, customer interactions
- **Key Stats**: Total products, active orders, customer count

### Quick Access Tiles
- **Inventory Management**: Direct access to inventory dashboard
- **Finance Services**: Revenue, expenses, tax management
- **Trend Spotter**: Market trends and opportunities
- **Product Creator**: AI-powered product creation
- **Voice Assistant**: Hands-free navigation
- **Yojana Mitra**: Government schemes and benefits

### Notifications Panel
- **Alerts**: Important updates, low stock, payment reminders
- **Updates**: System updates, new features, announcements

### Analytics Widgets
- **Performance Metrics**: Sales performance, conversion rates
- **Insights**: AI-generated business insights and recommendations
