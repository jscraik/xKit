/**
 * Circuit Breaker - Prevents cascading failures and enables graceful degradation
 *
 * When a model API starts failing, the circuit breaker "trips" and
 * temporarily redirects traffic to fallback models instead of
 * continuing to hammer the failing service.
 */

/**
 * Circuit breaker states
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of consecutive failures before tripping */
  threshold: number;
  /** How long to wait before attempting recovery (ms) */
  resetTimeout: number;
  /** Maximum number of test requests during half-open state */
  halfOpenMaxCalls: number;
}

/**
 * Circuit breaker event type
 */
export type CircuitEventType = 'success' | 'failure' | 'timeout' | 'trip' | 'reset';

/**
 * Circuit breaker event
 */
export interface CircuitEvent {
  type: CircuitEventType;
  state: CircuitState;
  timestamp: number;
  error?: string;
}

/**
 * Circuit breaker state machine
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private lastStateChange = Date.now();
  private events: CircuitEvent[] = [];

  constructor(
    private readonly name: string,
    private config: CircuitBreakerConfig,
  ) {}

  /**
   * Execute an operation through the circuit breaker
   * Returns the operation result or throws if circuit is open
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // If circuit is open, check if we should attempt recovery
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('half-open');
      } else {
        throw new Error(`Circuit breaker '${this.name}' is OPEN`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Check if circuit is open (blocking requests)
   */
  isOpen(): boolean {
    if (this.state !== 'open') {
      return false;
    }
    // Check if we should transition to half-open
    return !this.shouldAttemptReset();
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker stats
   */
  getStats() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      events: [...this.events],
    };
  }

  /**
   * Reset the circuit breaker manually
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastStateChange = Date.now();
    this.recordEvent('reset');
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'half-open') {
      this.successCount++;
      // If we succeed enough times in half-open, close the circuit
      if (this.successCount >= this.config.halfOpenMaxCalls) {
        this.transitionTo('closed');
      }
    } else {
      this.successCount++;
    }

    this.recordEvent('success');
  }

  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    // Trip the circuit if we've exceeded the threshold
    if (this.failureCount >= this.config.threshold) {
      this.transitionTo('open');
    }

    this.recordEvent('failure', error.message);
  }

  private shouldAttemptReset(): boolean {
    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    return timeSinceLastFailure >= this.config.resetTimeout;
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    if (newState === 'closed') {
      this.failureCount = 0;
      this.successCount = 0;
    } else if (newState === 'half-open') {
      this.successCount = 0;
    }

    if (newState === 'open') {
      this.recordEvent('trip');
    }

    console.log(`Circuit breaker '${this.name}': ${oldState} → ${newState}`);
  }

  private recordEvent(type: CircuitEventType, error?: string): void {
    const event: CircuitEvent = {
      type,
      state: this.state,
      timestamp: Date.now(),
      error,
    };
    this.events.push(event);

    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events.shift();
    }
  }
}

/**
 * Registry for managing multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker for a given key
   */
  get(key: string, config?: CircuitBreakerConfig): CircuitBreaker {
    let breaker = this.breakers.get(key);

    if (!breaker) {
      const defaultConfig: CircuitBreakerConfig = {
        threshold: 5,
        resetTimeout: 60000, // 1 minute
        halfOpenMaxCalls: 3,
      };
      breaker = new CircuitBreaker(key, config || defaultConfig);
      this.breakers.set(key, breaker);
    }

    return breaker;
  }

  /**
   * Get all circuit breakers
   */
  getAll(): CircuitBreaker[] {
    return Array.from(this.breakers.values());
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Get stats for all circuit breakers
   */
  getAllStats() {
    return this.getAll().map(b => b.getStats());
  }
}
