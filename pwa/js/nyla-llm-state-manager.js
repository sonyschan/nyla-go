/**
 * NYLA LLM State Manager
 * Simplifies complex LLM readiness logic with clear state machine
 */

class NYLALLMStateManager {
  static LLM_STATES = {
    NOT_AVAILABLE: 'not_available',     // No LLM engine (mobile)
    NOT_READY: 'not_ready',             // Engine exists but not initialized
    INITIALIZING: 'initializing',        // Engine loading
    READY: 'ready',                     // Fully ready for use
    RACE_CONDITION: 'race_condition',    // Initialized but not warmed up
    DEBUG_MODE: 'debug_mode'            // Mobile debug override
  };
  
  /**
   * Determine LLM state from engine status and device info
   */
  static getLLMState(llmEngine, device = null) {
    // No engine available (mobile devices)
    if (!llmEngine) {
      return this.LLM_STATES.NOT_AVAILABLE;
    }
    
    const status = llmEngine.getStatus();
    device = device || NYLADeviceUtils.getDeviceInfo();
    
    // Mobile debug mode - force attempt even if not warmed up
    if (device.isMobile && status.initialized && !status.loading) {
      return this.LLM_STATES.DEBUG_MODE;
    }
    
    // Fully ready state
    if (status.initialized && !status.loading && status.warmedUp) {
      return this.LLM_STATES.READY;
    }
    
    // Race condition: initialized but not warmed up
    if (status.initialized && !status.loading && !status.warmedUp) {
      return this.LLM_STATES.RACE_CONDITION;
    }
    
    // Currently loading
    if (status.loading) {
      return this.LLM_STATES.INITIALIZING;
    }
    
    // Not initialized yet
    return this.LLM_STATES.NOT_READY;
  }
  
  /**
   * Check if LLM can be used based on state
   */
  static canUseLLM(state) {
    return [
      this.LLM_STATES.READY,
      this.LLM_STATES.DEBUG_MODE,
      this.LLM_STATES.RACE_CONDITION
    ].includes(state);
  }
  
  /**
   * Get user-friendly message for current state
   */
  static getStateMessage(state) {
    const messages = {
      [this.LLM_STATES.NOT_AVAILABLE]: 'LLM not available on mobile - using RAG responses',
      [this.LLM_STATES.NOT_READY]: 'LLM engine not initialized',
      [this.LLM_STATES.INITIALIZING]: 'LLM engine loading...',
      [this.LLM_STATES.READY]: 'LLM engine ready',
      [this.LLM_STATES.RACE_CONDITION]: 'LLM engine warming up GPU buffers...',
      [this.LLM_STATES.DEBUG_MODE]: 'Mobile debug mode - forcing LLM attempt'
    };
    
    return messages[state] || 'Unknown LLM state';
  }
  
  /**
   * Get debug information for current state
   */
  static getDebugInfo(llmEngine, device = null) {
    device = device || NYLADeviceUtils.getDeviceInfo();
    const state = this.getLLMState(llmEngine, device);
    const status = llmEngine ? llmEngine.getStatus() : null;
    
    return {
      state,
      canUseLLM: this.canUseLLM(state),
      message: this.getStateMessage(state),
      details: {
        hasEngine: !!llmEngine,
        isMobile: device.isMobile,
        engineStatus: status ? {
          initialized: status.initialized,
          loading: status.loading,
          warmedUp: status.warmedUp,
          ready: status.ready
        } : null
      }
    };
  }
}

// Export for use in other modules
window.NYLALLMStateManager = NYLALLMStateManager;