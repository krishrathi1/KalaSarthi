/**
 * Voice Navigation Guidance System
 * Provides help, tutorials, and contextual guidance for voice navigation
 * Includes command suggestions, onboarding, and user assistance
 */

import { VoiceNavigationLogger, LogLevel, LogCategory } from './VoiceNavigationLogger';

export interface VoiceCommand {
    command: string;
    description: string;
    examples: string[];
    category: string;
    language: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface HelpTopic {
    id: string;
    title: string;
    description: string;
    content: string;
    audioContent?: string;
    category: string;
    keywords: string[];
    relatedTopics: string[];
}

export interface ContextualHint {
    id: string;
    trigger: string;
    condition: string;
    message: string;
    audioMessage?: string;
    priority: number;
    frequency: 'once' | 'session' | 'always';
    shown: boolean;
}

export interface TutorialStep {
    id: string;
    title: string;
    description: string;
    instruction: string;
    audioInstruction?: string;
    expectedCommand?: string;
    validationPattern?: string;
    hints: string[];
    nextStep?: string;
}

export interface Tutorial {
    id: string;
    title: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: number;
    steps: TutorialStep[];
    prerequisites: string[];
}

export interface GuidanceConfig {
    enableContextualHints: boolean;
    enableAudioGuidance: boolean;
    hintFrequency: 'minimal' | 'normal' | 'verbose';
    autoStartTutorial: boolean;
    language: string;
}

export interface UserProgress {
    userId: string;
    completedTutorials: string[];
    currentTutorial?: string;
    currentStep?: string;
    commandsLearned: string[];
    hintsShown: string[];
    skillLevel: 'beginner' | 'intermediate' | 'advanced';
    lastActivity: Date;
}

export class VoiceNavigationGuidance {
    private static instance: VoiceNavigationGuidance;
    private logger: VoiceNavigationLogger;
    private config: GuidanceConfig;
    private commands: Map<string, VoiceCommand[]>;
    private helpTopics: Map<string, HelpTopic>;
    private contextualHints: Map<string, ContextualHint>;
    private tutorials: Map<string, Tutorial>;
    private userProgress: Map<string, UserProgress>;
    private currentUser?: string;

    private constructor() {
        this.logger = VoiceNavigationLogger.getInstance();
        this.config = this.getDefaultConfig();
        this.commands = new Map();
        this.helpTopics = new Map();
        this.contextualHints = new Map();
        this.tutorials = new Map();
        this.userProgress = new Map();

        this.initializeCommands();
        this.initializeHelpTopics();
        this.initializeContextualHints();
        this.initializeTutorials();
    }

    public static getInstance(): VoiceNavigationGuidance {
        if (!VoiceNavigationGuidance.instance) {
            VoiceNavigationGuidance.instance = new VoiceNavigationGuidance();
        }
        return VoiceNavigationGuidance.instance;
    }

    /**
     * Configure the guidance system
     */
    public configure(config: Partial<GuidanceConfig>): void {
        this.config = { ...this.config, ...config };
        this.logger.info(LogCategory.SYSTEM, 'Guidance system configured', { config: this.config });
    }

    /**
     * Set current user for personalized guidance
     */
    public setCurrentUser(userId: string): void {
        this.currentUser = userId;

        // Load or create user progress
        if (!this.userProgress.has(userId)) {
            this.userProgress.set(userId, {
                userId,
                completedTutorials: [],
                commandsLearned: [],
                hintsShown: [],
                skillLevel: 'beginner',
                lastActivity: new Date()
            });
        }

        this.logger.info(LogCategory.USER_INTERACTION, 'Current user set for guidance', { userId });
    }

    /**
     * Get help for voice navigation commands
     */
    public getHelp(query?: string, language: string = 'en-US'): {
        commands: VoiceCommand[];
        topics: HelpTopic[];
        suggestions: string[];
    } {
        try {
            this.logger.info(LogCategory.USER_INTERACTION, 'Help requested', { query, language });

            let commands: VoiceCommand[] = [];
            let topics: HelpTopic[] = [];
            let suggestions: string[] = [];

            if (query) {
                // Search for specific help
                commands = this.searchCommands(query, language);
                topics = this.searchHelpTopics(query);
                suggestions = this.generateSuggestions(query);
            } else {
                // General help - show basic commands
                commands = this.getBasicCommands(language);
                topics = this.getBasicHelpTopics();
                suggestions = this.getGeneralSuggestions();
            }

            // Update user progress
            this.updateUserActivity('help_requested', { query, language });

            return { commands, topics, suggestions };
        } catch (error) {
            this.logger.error(
                LogCategory.USER_INTERACTION,
                'Error getting help',
                error instanceof Error ? error : new Error(String(error)),
                { query, language }
            );

            return {
                commands: this.getBasicCommands(language),
                topics: [],
                suggestions: ['Try saying "help" for basic commands']
            };
        }
    }

    /**
     * Get contextual hints based on current situation
     */
    public getContextualHints(context: {
        currentPage?: string;
        lastError?: string;
        userAction?: string;
        sessionDuration?: number;
    }): ContextualHint[] {
        try {
            if (!this.config.enableContextualHints) {
                return [];
            }

            const relevantHints: ContextualHint[] = [];
            const userProgress = this.getCurrentUserProgress();

            for (const hint of this.contextualHints.values()) {
                // Check if hint should be shown
                if (this.shouldShowHint(hint, context, userProgress)) {
                    relevantHints.push(hint);
                }
            }

            // Sort by priority
            relevantHints.sort((a, b) => b.priority - a.priority);

            // Limit based on frequency setting
            const maxHints = this.getMaxHints();
            const hintsToShow = relevantHints.slice(0, maxHints);

            // Mark hints as shown
            hintsToShow.forEach(hint => {
                hint.shown = true;
                if (userProgress) {
                    userProgress.hintsShown.push(hint.id);
                }
            });

            this.logger.debug(LogCategory.USER_INTERACTION, 'Contextual hints generated', {
                context,
                hintsCount: hintsToShow.length
            });

            return hintsToShow;
        } catch (error) {
            this.logger.error(
                LogCategory.USER_INTERACTION,
                'Error getting contextual hints',
                error instanceof Error ? error : new Error(String(error)),
                { context }
            );

            return [];
        }
    }

    /**
     * Start a tutorial for the user
     */
    public startTutorial(tutorialId: string): {
        success: boolean;
        tutorial?: Tutorial;
        currentStep?: TutorialStep;
        message: string;
    } {
        try {
            const tutorial = this.tutorials.get(tutorialId);
            if (!tutorial) {
                return {
                    success: false,
                    message: `Tutorial ${tutorialId} not found`
                };
            }

            const userProgress = this.getCurrentUserProgress();
            if (!userProgress) {
                return {
                    success: false,
                    message: 'User not set. Please set current user first.'
                };
            }

            // Check prerequisites
            const missingPrereqs = tutorial.prerequisites.filter(
                prereq => !userProgress.completedTutorials.includes(prereq)
            );

            if (missingPrereqs.length > 0) {
                return {
                    success: false,
                    message: `Missing prerequisites: ${missingPrereqs.join(', ')}`
                };
            }

            // Start tutorial
            userProgress.currentTutorial = tutorialId;
            userProgress.currentStep = tutorial.steps[0]?.id;

            this.logger.info(LogCategory.USER_INTERACTION, 'Tutorial started', {
                tutorialId,
                userId: this.currentUser,
                estimatedTime: tutorial.estimatedTime
            });

            return {
                success: true,
                tutorial,
                currentStep: tutorial.steps[0],
                message: `Started tutorial: ${tutorial.title}`
            };
        } catch (error) {
            this.logger.error(
                LogCategory.USER_INTERACTION,
                'Error starting tutorial',
                error instanceof Error ? error : new Error(String(error)),
                { tutorialId }
            );

            return {
                success: false,
                message: 'Failed to start tutorial'
            };
        }
    }

    /**
     * Process tutorial step completion
     */
    public processTutorialStep(
        command: string,
        tutorialId?: string,
        stepId?: string
    ): {
        success: boolean;
        completed: boolean;
        nextStep?: TutorialStep;
        feedback: string;
        audioFeedback?: string;
    } {
        try {
            const userProgress = this.getCurrentUserProgress();
            if (!userProgress) {
                return {
                    success: false,
                    completed: false,
                    feedback: 'User not set'
                };
            }

            const currentTutorialId = tutorialId || userProgress.currentTutorial;
            const currentStepId = stepId || userProgress.currentStep;

            if (!currentTutorialId || !currentStepId) {
                return {
                    success: false,
                    completed: false,
                    feedback: 'No active tutorial'
                };
            }

            const tutorial = this.tutorials.get(currentTutorialId);
            if (!tutorial) {
                return {
                    success: false,
                    completed: false,
                    feedback: 'Tutorial not found'
                };
            }

            const currentStep = tutorial.steps.find(step => step.id === currentStepId);
            if (!currentStep) {
                return {
                    success: false,
                    completed: false,
                    feedback: 'Tutorial step not found'
                };
            }

            // Validate command
            const isValid = this.validateTutorialCommand(command, currentStep);

            if (isValid) {
                // Move to next step or complete tutorial
                const currentStepIndex = tutorial.steps.findIndex(step => step.id === currentStepId);
                const nextStepIndex = currentStepIndex + 1;

                if (nextStepIndex < tutorial.steps.length) {
                    // Move to next step
                    const nextStep = tutorial.steps[nextStepIndex];
                    userProgress.currentStep = nextStep.id;

                    this.logger.info(LogCategory.USER_INTERACTION, 'Tutorial step completed', {
                        tutorialId: currentTutorialId,
                        stepId: currentStepId,
                        nextStepId: nextStep.id
                    });

                    return {
                        success: true,
                        completed: false,
                        nextStep,
                        feedback: `Great! Moving to next step: ${nextStep.title}`,
                        audioFeedback: `Excellent! Now let's ${nextStep.instruction}`
                    };
                } else {
                    // Complete tutorial
                    userProgress.completedTutorials.push(currentTutorialId);
                    userProgress.currentTutorial = undefined;
                    userProgress.currentStep = undefined;

                    // Update skill level if needed
                    this.updateUserSkillLevel(userProgress);

                    this.logger.info(LogCategory.USER_INTERACTION, 'Tutorial completed', {
                        tutorialId: currentTutorialId,
                        userId: this.currentUser
                    });

                    return {
                        success: true,
                        completed: true,
                        feedback: `Congratulations! You've completed the ${tutorial.title} tutorial.`,
                        audioFeedback: `Well done! You've mastered ${tutorial.title}. You're ready for more advanced features.`
                    };
                }
            } else {
                // Provide hint
                const hint = currentStep.hints[Math.floor(Math.random() * currentStep.hints.length)];

                return {
                    success: false,
                    completed: false,
                    feedback: `That's not quite right. ${hint}`,
                    audioFeedback: `Try again. ${hint}`
                };
            }
        } catch (error) {
            this.logger.error(
                LogCategory.USER_INTERACTION,
                'Error processing tutorial step',
                error instanceof Error ? error : new Error(String(error)),
                { command, tutorialId, stepId }
            );

            return {
                success: false,
                completed: false,
                feedback: 'Error processing tutorial step'
            };
        }
    }

    /**
     * Get command suggestions based on context
     */
    public getCommandSuggestions(context: {
        currentPage?: string;
        userInput?: string;
        errorType?: string;
        language?: string;
    }): string[] {
        try {
            const language = context.language || this.config.language;
            const commands = this.commands.get(language) || [];

            let suggestions: string[] = [];

            if (context.currentPage) {
                // Page-specific suggestions
                suggestions = this.getPageSpecificSuggestions(context.currentPage, commands);
            } else if (context.userInput) {
                // Input-based suggestions
                suggestions = this.getInputBasedSuggestions(context.userInput, commands);
            } else if (context.errorType) {
                // Error-based suggestions
                suggestions = this.getErrorBasedSuggestions(context.errorType, commands);
            } else {
                // General suggestions
                suggestions = this.getGeneralCommandSuggestions(commands);
            }

            this.logger.debug(LogCategory.USER_INTERACTION, 'Command suggestions generated', {
                context,
                suggestionsCount: suggestions.length
            });

            return suggestions.slice(0, 5); // Limit to 5 suggestions
        } catch (error) {
            this.logger.error(
                LogCategory.USER_INTERACTION,
                'Error getting command suggestions',
                error instanceof Error ? error : new Error(String(error)),
                { context }
            );

            return ['Try saying "help" for available commands'];
        }
    }

    /**
     * Get available tutorials
     */
    public getAvailableTutorials(skillLevel?: 'beginner' | 'intermediate' | 'advanced'): Tutorial[] {
        const userProgress = this.getCurrentUserProgress();
        const userSkillLevel = skillLevel || userProgress?.skillLevel || 'beginner';

        return Array.from(this.tutorials.values()).filter(tutorial => {
            // Filter by skill level
            if (tutorial.difficulty !== userSkillLevel && userSkillLevel !== 'advanced') {
                return false;
            }

            // Check if already completed
            if (userProgress?.completedTutorials.includes(tutorial.id)) {
                return false;
            }

            // Check prerequisites
            const hasPrerequisites = tutorial.prerequisites.every(
                prereq => userProgress?.completedTutorials.includes(prereq)
            );

            return hasPrerequisites;
        });
    }

    /**
     * Initialize voice commands database
     */
    private initializeCommands(): void {
        const englishCommands: VoiceCommand[] = [
            {
                command: 'go to dashboard',
                description: 'Navigate to the main dashboard',
                examples: ['go to dashboard', 'open dashboard', 'show dashboard'],
                category: 'navigation',
                language: 'en-US',
                difficulty: 'beginner'
            },
            {
                command: 'open profile',
                description: 'Navigate to your profile page',
                examples: ['open profile', 'show profile', 'my profile'],
                category: 'navigation',
                language: 'en-US',
                difficulty: 'beginner'
            },
            {
                command: 'show marketplace',
                description: 'Navigate to the marketplace',
                examples: ['show marketplace', 'open marketplace', 'go to marketplace'],
                category: 'navigation',
                language: 'en-US',
                difficulty: 'beginner'
            },
            {
                command: 'help',
                description: 'Get help with voice commands',
                examples: ['help', 'show help', 'what can I say'],
                category: 'system',
                language: 'en-US',
                difficulty: 'beginner'
            },
            {
                command: 'go back',
                description: 'Navigate to the previous page',
                examples: ['go back', 'back', 'previous page'],
                category: 'navigation',
                language: 'en-US',
                difficulty: 'beginner'
            }
        ];

        this.commands.set('en-US', englishCommands);

        // Add Hindi commands
        const hindiCommands: VoiceCommand[] = [
            {
                command: 'डैशबोर्ड पर जाएं',
                description: 'मुख्य डैशबोर्ड पर जाएं',
                examples: ['डैशबोर्ड पर जाएं', 'डैशबोर्ड खोलें', 'डैशबोर्ड दिखाएं'],
                category: 'navigation',
                language: 'hi-IN',
                difficulty: 'beginner'
            },
            {
                command: 'प्रोफाइल खोलें',
                description: 'अपने प्रोफाइल पेज पर जाएं',
                examples: ['प्रोफाइल खोलें', 'प्रोफाइल दिखाएं', 'मेरा प्रोफाइल'],
                category: 'navigation',
                language: 'hi-IN',
                difficulty: 'beginner'
            }
        ];

        this.commands.set('hi-IN', hindiCommands);
    }

    /**
     * Initialize help topics
     */
    private initializeHelpTopics(): void {
        const topics: HelpTopic[] = [
            {
                id: 'getting_started',
                title: 'Getting Started with Voice Navigation',
                description: 'Learn the basics of voice navigation',
                content: 'Voice navigation allows you to navigate the application using voice commands. Click the microphone button and speak clearly.',
                category: 'basics',
                keywords: ['getting started', 'basics', 'introduction'],
                relatedTopics: ['voice_commands', 'troubleshooting']
            },
            {
                id: 'voice_commands',
                title: 'Available Voice Commands',
                description: 'Complete list of voice commands',
                content: 'You can use commands like "go to dashboard", "open profile", "show marketplace", and many more.',
                category: 'commands',
                keywords: ['commands', 'voice', 'navigation'],
                relatedTopics: ['getting_started', 'advanced_features']
            },
            {
                id: 'troubleshooting',
                title: 'Troubleshooting Voice Navigation',
                description: 'Common issues and solutions',
                content: 'If voice navigation is not working, check your microphone permissions and internet connection.',
                category: 'support',
                keywords: ['troubleshooting', 'problems', 'issues', 'not working'],
                relatedTopics: ['getting_started', 'browser_support']
            }
        ];

        topics.forEach(topic => {
            this.helpTopics.set(topic.id, topic);
        });
    }

    /**
     * Initialize contextual hints
     */
    private initializeContextualHints(): void {
        const hints: ContextualHint[] = [
            {
                id: 'first_visit',
                trigger: 'session_start',
                condition: 'new_user',
                message: 'Welcome! Click the microphone button to start using voice navigation.',
                priority: 10,
                frequency: 'once',
                shown: false
            },
            {
                id: 'microphone_permission',
                trigger: 'microphone_denied',
                condition: 'permission_error',
                message: 'Please allow microphone access to use voice navigation.',
                priority: 9,
                frequency: 'session',
                shown: false
            },
            {
                id: 'speech_not_recognized',
                trigger: 'recognition_failed',
                condition: 'multiple_failures',
                message: 'Try speaking more clearly or use simpler commands like "help" or "go to dashboard".',
                priority: 8,
                frequency: 'always',
                shown: false
            }
        ];

        hints.forEach(hint => {
            this.contextualHints.set(hint.id, hint);
        });
    }

    /**
     * Initialize tutorials
     */
    private initializeTutorials(): void {
        const basicTutorial: Tutorial = {
            id: 'basic_voice_navigation',
            title: 'Basic Voice Navigation',
            description: 'Learn the fundamentals of voice navigation',
            difficulty: 'beginner',
            estimatedTime: 300, // 5 minutes
            prerequisites: [],
            steps: [
                {
                    id: 'step1',
                    title: 'Activate Voice Navigation',
                    description: 'Learn how to start voice navigation',
                    instruction: 'Click the microphone button to activate voice navigation',
                    hints: ['Look for the microphone icon in the header', 'The button should turn green when active'],
                    nextStep: 'step2'
                },
                {
                    id: 'step2',
                    title: 'Basic Navigation Command',
                    description: 'Try your first navigation command',
                    instruction: 'Say "go to dashboard"',
                    expectedCommand: 'go to dashboard',
                    validationPattern: 'dashboard',
                    hints: ['Speak clearly and at normal pace', 'Make sure your microphone is working'],
                    nextStep: 'step3'
                },
                {
                    id: 'step3',
                    title: 'Get Help',
                    description: 'Learn how to get help',
                    instruction: 'Say "help" to see available commands',
                    expectedCommand: 'help',
                    validationPattern: 'help',
                    hints: ['The help command shows all available voice commands', 'You can ask for help anytime']
                }
            ]
        };

        this.tutorials.set(basicTutorial.id, basicTutorial);
    }

    // Helper methods...
    private getCurrentUserProgress(): UserProgress | undefined {
        return this.currentUser ? this.userProgress.get(this.currentUser) : undefined;
    }

    private updateUserActivity(activity: string, data?: any): void {
        const userProgress = this.getCurrentUserProgress();
        if (userProgress) {
            userProgress.lastActivity = new Date();
        }
    }

    private shouldShowHint(hint: ContextualHint, context: any, userProgress?: UserProgress): boolean {
        // Implementation for hint display logic
        if (hint.frequency === 'once' && hint.shown) return false;
        if (hint.frequency === 'session' && userProgress?.hintsShown.includes(hint.id)) return false;

        // Add more sophisticated condition checking here
        return true;
    }

    private getMaxHints(): number {
        switch (this.config.hintFrequency) {
            case 'minimal': return 1;
            case 'normal': return 3;
            case 'verbose': return 5;
            default: return 3;
        }
    }

    private searchCommands(query: string, language: string): VoiceCommand[] {
        const commands = this.commands.get(language) || [];
        return commands.filter(cmd =>
            cmd.command.toLowerCase().includes(query.toLowerCase()) ||
            cmd.description.toLowerCase().includes(query.toLowerCase()) ||
            cmd.examples.some(ex => ex.toLowerCase().includes(query.toLowerCase()))
        );
    }

    private searchHelpTopics(query: string): HelpTopic[] {
        return Array.from(this.helpTopics.values()).filter(topic =>
            topic.keywords.some(keyword => keyword.toLowerCase().includes(query.toLowerCase())) ||
            topic.title.toLowerCase().includes(query.toLowerCase()) ||
            topic.description.toLowerCase().includes(query.toLowerCase())
        );
    }

    private generateSuggestions(query: string): string[] {
        // Generate contextual suggestions based on query
        return [`Try "help ${query}"`, 'Say "show all commands"', 'Ask "what can I do here?"'];
    }

    private getBasicCommands(language: string): VoiceCommand[] {
        const commands = this.commands.get(language) || [];
        return commands.filter(cmd => cmd.difficulty === 'beginner').slice(0, 5);
    }

    private getBasicHelpTopics(): HelpTopic[] {
        return Array.from(this.helpTopics.values()).filter(topic => topic.category === 'basics');
    }

    private getGeneralSuggestions(): string[] {
        return [
            'Try saying "go to dashboard"',
            'Say "help" for available commands',
            'Use "open profile" to view your profile'
        ];
    }

    private validateTutorialCommand(command: string, step: TutorialStep): boolean {
        if (!step.validationPattern) return true;
        return command.toLowerCase().includes(step.validationPattern.toLowerCase());
    }

    private updateUserSkillLevel(userProgress: UserProgress): void {
        const completedCount = userProgress.completedTutorials.length;
        if (completedCount >= 3) {
            userProgress.skillLevel = 'advanced';
        } else if (completedCount >= 1) {
            userProgress.skillLevel = 'intermediate';
        }
    }

    private getPageSpecificSuggestions(page: string, commands: VoiceCommand[]): string[] {
        // Return page-specific command suggestions
        const pageCommands = commands.filter(cmd =>
            cmd.examples.some(ex => ex.includes(page.toLowerCase()))
        );
        return pageCommands.map(cmd => cmd.command);
    }

    private getInputBasedSuggestions(input: string, commands: VoiceCommand[]): string[] {
        // Return suggestions based on partial input
        return commands
            .filter(cmd => cmd.command.toLowerCase().startsWith(input.toLowerCase()))
            .map(cmd => cmd.command)
            .slice(0, 3);
    }

    private getErrorBasedSuggestions(errorType: string, commands: VoiceCommand[]): string[] {
        // Return suggestions based on error type
        switch (errorType) {
            case 'speech_not_recognized':
                return ['Try speaking more clearly', 'Say "help" for commands', 'Use simple words'];
            case 'command_not_found':
                return ['Say "help" to see available commands', 'Try "go to dashboard"', 'Use "open profile"'];
            default:
                return this.getGeneralCommandSuggestions(commands);
        }
    }

    private getGeneralCommandSuggestions(commands: VoiceCommand[]): string[] {
        return commands
            .filter(cmd => cmd.difficulty === 'beginner')
            .map(cmd => cmd.command)
            .slice(0, 3);
    }

    private getDefaultConfig(): GuidanceConfig {
        return {
            enableContextualHints: true,
            enableAudioGuidance: true,
            hintFrequency: 'normal',
            autoStartTutorial: false,
            language: 'en-US'
        };
    }
}