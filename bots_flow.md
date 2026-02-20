flowchart TD
Start([User sends command]) --> CheckGuild{Guild has<br/>configured bots?}
CheckGuild -->|No| Error1[Show: No bots configured]
CheckGuild -->|Yes| CheckCommandType{Command requires<br/>voice channel?}

    CheckCommandType -->|No| CheckPrefixMatch{Prefix matches<br/>specific bot?}
    CheckCommandType -->|Yes| CheckVC{User in<br/>voice channel?}

    CheckVC -->|No| ErrorNoVC[❌ Show: Must be<br/>in voice channel]
    CheckVC -->|Yes| QueryState[Query Discord's<br/>real voice state]

    QueryState --> CheckSameVC{Bot already<br/>in user's VC?}

    CheckSameVC -->|Yes| UseSameBot[✅ Priority 1:<br/>Use that bot]
    CheckSameVC -->|No| CheckMatchingPrefix{Bot with matching<br/>prefix AND idle?}

    CheckMatchingPrefix -->|Yes| UseMatchingBot[✅ Priority 2:<br/>Use matching bot]
    CheckMatchingPrefix -->|No| CheckIdleBot{Any bot<br/>idle?}

    CheckIdleBot -->|Yes| UseIdleBot[✅ Priority 3:<br/>Use first idle bot]
    CheckIdleBot -->|No| AllBusy[❌ All bots busy]
    AllBusy --> PickForError[Pick first bot<br/>for error message]
    PickForError --> ShowErrorBusy[Show: No free bots]

    CheckPrefixMatch -->|Yes| UseBot[Use matched bot]
    CheckPrefixMatch -->|No| IsGlobalPrefix{Using global<br/>prefix?}

    IsGlobalPrefix -->|Yes| HashDistribute[Distribute using<br/>message ID hash]
    IsGlobalPrefix -->|No| UseFirst[Use first available bot]

    UseSameBot --> OnlyChosen{Is this bot<br/>the chosen one?}
    UseMatchingBot --> OnlyChosen
    UseIdleBot --> OnlyChosen
    UseBot --> OnlyChosen
    HashDistribute --> OnlyChosen
    UseFirst --> OnlyChosen

    OnlyChosen -->|No| EarlyExit[Early exit:<br/>Don't process]
    OnlyChosen -->|Yes| ValidCheck{Command<br/>valid?}
    ValidCheck -->|No| ShowError[Show command error]
    ValidCheck -->|Yes| Execute[✅ Execute command]

    style UseSameBot fill:#4CAF50
    style UseMatchingBot fill:#4CAF50
    style UseIdleBot fill:#4CAF50
    style Execute fill:#4CAF50
    style ShowError fill:#f44336
    style ShowErrorBusy fill:#f44336
    style ErrorNoVC fill:#f44336
    style Error1 fill:#f44336
    style EarlyExit fill:#FF9800
