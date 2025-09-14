# Voice Assistant Workflow

## Overview
The Voice Assistant feature provides hands-free navigation and interaction with the KalaSarthi platform using natural language processing and speech recognition.

## Workflow Diagram

```mermaid
graph TD
    START([User Activates Voice Assistant]) --> PERMISSION_CHECK{Permission Granted?}
    PERMISSION_CHECK -->|No| PERMISSION_REQUEST[Permission Request Agent]
    PERMISSION_CHECK -->|Yes| VOICE_CAPTURE[Voice Capture Agent]
    
    PERMISSION_REQUEST --> PERMISSION_GRANTED{Permission Granted?}
    PERMISSION_GRANTED -->|No| END_DENIED([Permission Denied])
    PERMISSION_GRANTED -->|Yes| VOICE_CAPTURE
    
    VOICE_CAPTURE --> AUDIO_PROCESSING[Audio Processing Agent]
    AUDIO_PROCESSING --> NOISE_REDUCTION[Noise Reduction Agent]
    NOISE_REDUCTION --> SPEECH_RECOGNITION[Speech Recognition Agent]
    
    SPEECH_RECOGNITION --> TEXT_CONVERSION[Text Conversion Agent]
    TEXT_CONVERSION --> CONFIDENCE_CHECK{Confidence Level}
    
    CONFIDENCE_CHECK -->|High| INTENT_ANALYSIS[Intent Analysis Agent]
    CONFIDENCE_CHECK -->|Low| CLARIFICATION_REQUEST[Clarification Request Agent]
    
    CLARIFICATION_REQUEST --> VOICE_CAPTURE
    
    INTENT_ANALYSIS --> INTENT_CLASSIFICATION[Intent Classification Agent]
    INTENT_CLASSIFICATION --> NAVIGATION_INTENT[Navigation Intent Agent]
    INTENT_CLASSIFICATION --> ACTION_INTENT[Action Intent Agent]
    INTENT_CLASSIFICATION --> QUERY_INTENT[Query Intent Agent]
    INTENT_CLASSIFICATION --> UNKNOWN_INTENT[Unknown Intent Agent]
    
    NAVIGATION_INTENT --> NAVIGATION_PROCESSING[Navigation Processing Agent]
    NAVIGATION_PROCESSING --> PAGE_NAVIGATION[Page Navigation Agent]
    PAGE_NAVIGATION --> VOICE_FEEDBACK[Voice Feedback Agent]
    
    ACTION_INTENT --> ACTION_PROCESSING[Action Processing Agent]
    ACTION_PROCESSING --> ACTION_EXECUTION[Action Execution Agent]
    ACTION_EXECUTION --> VOICE_FEEDBACK
    
    QUERY_INTENT --> QUERY_PROCESSING[Query Processing Agent]
    QUERY_PROCESSING --> SEARCH_EXECUTION[Search Execution Agent]
    SEARCH_EXECUTION --> VOICE_FEEDBACK
    
    UNKNOWN_INTENT --> CLARIFICATION_REQUEST
    
    VOICE_FEEDBACK --> TEXT_TO_SPEECH[Text-to-Speech Agent]
    TEXT_TO_SPEECH --> AUDIO_OUTPUT[Audio Output Agent]
    
    AUDIO_OUTPUT --> CONTINUOUS_MODE{Continuous Mode?}
    CONTINUOUS_MODE -->|Yes| VOICE_CAPTURE
    CONTINUOUS_MODE -->|No| END_SESSION([Session Complete])
    
    VOICE_CAPTURE --> COMMAND_DETECTION[Command Detection Agent]
    COMMAND_DETECTION --> COMMAND_TYPES[Command Types Agent]
    
    COMMAND_TYPES --> NAVIGATION_COMMANDS[Navigation Commands Agent]
    COMMAND_TYPES --> PRODUCT_COMMANDS[Product Commands Agent]
    COMMAND_TYPES --> SEARCH_COMMANDS[Search Commands Agent]
    COMMAND_TYPES --> HELP_COMMANDS[Help Commands Agent]
    
    VOICE_CAPTURE --> LANGUAGE_DETECTION[Language Detection Agent]
    LANGUAGE_DETECTION --> HINDI_PROCESSING[Hindi Processing Agent]
    LANGUAGE_DETECTION --> ENGLISH_PROCESSING[English Processing Agent]
    LANGUAGE_DETECTION --> REGIONAL_PROCESSING[Regional Processing Agent]
    
    HINDI_PROCESSING --> SPEECH_RECOGNITION
    ENGLISH_PROCESSING --> SPEECH_RECOGNITION
    REGIONAL_PROCESSING --> SPEECH_RECOGNITION
    
    VOICE_CAPTURE --> VOICE_SETTINGS[Voice Settings Agent]
    VOICE_SETTINGS --> SPEED_ADJUSTMENT[Speed Adjustment Agent]
    VOICE_SETTINGS --> VOLUME_CONTROL[Volume Control Agent]
    VOICE_SETTINGS --> ACCENT_SELECTION[Accent Selection Agent]
    
    VOICE_FEEDBACK --> USAGE_ANALYTICS[Usage Analytics Agent]
    USAGE_ANALYTICS --> COMMAND_FREQUENCY[Command Frequency Agent]
    COMMAND_FREQUENCY --> MODEL_IMPROVEMENT[Model Improvement Agent]
    
    SPEECH_RECOGNITION --> ERROR_HANDLING[Error Handling Agent]
    ERROR_HANDLING --> RETRY[Retry Agent]
    RETRY --> VOICE_CAPTURE
    
    classDef startClass fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef decisionClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef processClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef aiClass fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    classDef errorClass fill:#ffebee,stroke:#b71c1c,stroke-width:2px
    classDef voiceClass fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    
    class START,END_DENIED,END_SESSION startClass
    class PERMISSION_CHECK,PERMISSION_GRANTED,CONFIDENCE_CHECK,CONTINUOUS_MODE decisionClass
    class PERMISSION_REQUEST,VOICE_CAPTURE,AUDIO_PROCESSING,NOISE_REDUCTION,SPEECH_RECOGNITION,TEXT_CONVERSION,CLARIFICATION_REQUEST,INTENT_ANALYSIS,INTENT_CLASSIFICATION,NAVIGATION_INTENT,ACTION_INTENT,QUERY_INTENT,UNKNOWN_INTENT,NAVIGATION_PROCESSING,PAGE_NAVIGATION,ACTION_PROCESSING,ACTION_EXECUTION,QUERY_PROCESSING,SEARCH_EXECUTION,VOICE_FEEDBACK,TEXT_TO_SPEECH,AUDIO_OUTPUT,COMMAND_DETECTION,COMMAND_TYPES,NAVIGATION_COMMANDS,PRODUCT_COMMANDS,SEARCH_COMMANDS,HELP_COMMANDS,LANGUAGE_DETECTION,HINDI_PROCESSING,ENGLISH_PROCESSING,REGIONAL_PROCESSING,VOICE_SETTINGS,SPEED_ADJUSTMENT,VOLUME_CONTROL,ACCENT_SELECTION,USAGE_ANALYTICS,COMMAND_FREQUENCY,MODEL_IMPROVEMENT processClass
    class INTENT_ANALYSIS,INTENT_CLASSIFICATION,SPEECH_RECOGNITION,TEXT_TO_SPEECH aiClass
    class ERROR_HANDLING,RETRY errorClass
    class VOICE_CAPTURE,SPEECH_RECOGNITION,TEXT_TO_SPEECH,AUDIO_OUTPUT voiceClass
```

## Key Agent Interconnections

- **Voice Capture Agent** → **Audio Processing Agent**
- **Audio Processing Agent** → **Noise Reduction Agent**
- **Noise Reduction Agent** → **Speech Recognition Agent**
- **Speech Recognition Agent** → **Text Conversion Agent**
- **Text Conversion Agent** → **Intent Analysis Agent**
- **Intent Analysis Agent** → **Intent Classification Agent**
- **Intent Classification Agent** → **Navigation Intent Agent**, **Action Intent Agent**, **Query Intent Agent**, **Unknown Intent Agent**
- **Navigation Intent Agent** → **Navigation Processing Agent**
- **Action Intent Agent** → **Action Processing Agent**
- **Query Intent Agent** → **Query Processing Agent**
- **Navigation Processing Agent** → **Page Navigation Agent**
- **Action Processing Agent** → **Action Execution Agent**
- **Query Processing Agent** → **Search Execution Agent**
- **Page Navigation Agent** → **Voice Feedback Agent**
- **Action Execution Agent** → **Voice Feedback Agent**
- **Search Execution Agent** → **Voice Feedback Agent**
- **Voice Feedback Agent** → **Text-to-Speech Agent**
- **Text-to-Speech Agent** → **Audio Output Agent**
- **Voice Capture Agent** → **Language Detection Agent**
- **Language Detection Agent** → **Hindi Processing Agent**, **English Processing Agent**, **Regional Processing Agent**
- **Hindi Processing Agent** → **Speech Recognition Agent**
- **English Processing Agent** → **Speech Recognition Agent**
- **Regional Processing Agent** → **Speech Recognition Agent**
- **Voice Capture Agent** → **Command Detection Agent**
- **Command Detection Agent** → **Command Types Agent**
- **Command Types Agent** → **Navigation Commands Agent**, **Product Commands Agent**, **Search Commands Agent**, **Help Commands Agent**
- **Voice Capture Agent** → **Voice Settings Agent**
- **Voice Settings Agent** → **Speed Adjustment Agent**, **Volume Control Agent**, **Accent Selection Agent**
- **Voice Feedback Agent** → **Usage Analytics Agent**
- **Usage Analytics Agent** → **Command Frequency Agent**
- **Command Frequency Agent** → **Model Improvement Agent**