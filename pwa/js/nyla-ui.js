/**
 * NYLA AI Assistant UI Manager
 * Handles the user interface for the NYLA chat assistant
 */

class NYLAAssistantUI {
  constructor(conversationManager) {
    this.conversation = conversationManager;
    this.currentMessage = null;
    this.isTyping = false;
    this.typingSpeed = 50; // milliseconds per character
    
    this.elements = {
      chatContainer: null,
      messagesContainer: null,
      questionsContainer: null,
      typingIndicator: null,
      stickerContainer: null
    };
  }

  /**
   * Initialize the NYLA tab UI
   */
  async initialize() {
    try {
      this.createNYLATabHTML();
      this.bindElements();
      this.setupEventListeners();
      await this.showWelcomeMessage();
      console.log('NYLA UI: Initialized successfully');
      return true;
    } catch (error) {
      console.error('NYLA UI: Initialization failed', error);
      return false;
    }
  }

  /**
   * Create the NYLA tab HTML structure
   */
  createNYLATabHTML() {
    // Find the tab navigation and add NYLA tab as first item
    const tabNavigation = document.querySelector('.tab-navigation');
    if (tabNavigation) {
      // Create NYLA tab button
      const nylaButton = document.createElement('button');
      nylaButton.className = 'tab-button';
      nylaButton.setAttribute('data-tab', 'nyla');
      nylaButton.innerHTML = '🤖 NYLA';
      
      // Insert as first tab
      tabNavigation.insertBefore(nylaButton, tabNavigation.firstChild);
    }

    // Create NYLA tab content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      const nylaTabHTML = `
        <div class="tab-content" id="nylaTab" data-section-title="🤖 NYLA AI Assistant">
          <!-- Chat Container -->
          <div class="nyla-chat-container">
            <!-- Messages Display -->
            <div class="nyla-messages" id="nylaMessages">
              <!-- Messages will be dynamically added here -->
            </div>
            
            <!-- Typing Indicator -->
            <div class="nyla-typing-indicator" id="nylaTyping" style="display: none;">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span class="typing-text">NYLA is typing...</span>
            </div>
            
            <!-- Question Buttons Container -->
            <div class="nyla-questions" id="nylaQuestions">
              <!-- Question buttons will be dynamically added here -->
            </div>
            
            <!-- Sticker Display -->
            <div class="nyla-sticker-container" id="nylaStickerContainer" style="display: none;">
              <img class="nyla-sticker" id="nylaSticker" src="" alt="NYLA Sticker">
            </div>
          </div>
          
          <!-- Stats/Info Panel (Optional) -->
          <div class="nyla-info-panel" id="nylaInfoPanel">
            <div class="nyla-stats">
              <span class="stats-text">💬 <span id="conversationCount">0</span> conversations</span>
            </div>
          </div>
        </div>
      `;
      
      // Insert NYLA tab content as first tab content
      mainContent.insertAdjacentHTML('afterbegin', nylaTabHTML);
    }
  }

  /**
   * Bind DOM elements
   */
  bindElements() {
    this.elements.chatContainer = document.getElementById('nylaTab');
    this.elements.messagesContainer = document.getElementById('nylaMessages');
    this.elements.questionsContainer = document.getElementById('nylaQuestions');
    this.elements.typingIndicator = document.getElementById('nylaTyping');
    this.elements.stickerContainer = document.getElementById('nylaStickerContainer');
    this.elements.sticker = document.getElementById('nylaSticker');
    this.elements.conversationCount = document.getElementById('conversationCount');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Question button clicks
    if (this.elements.questionsContainer) {
      this.elements.questionsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('nyla-question-btn')) {
          this.handleQuestionClick(e.target);
        }
      });
    }

    // Tab switching
    document.addEventListener('click', (e) => {
      if (e.target.getAttribute('data-tab') === 'nyla') {
        this.onTabActivated();
      }
    });
  }

  /**
   * Show welcome message and initial questions
   */
  async showWelcomeMessage() {
    const welcomeMessage = {
      text: `Hey there! I'm NYLA, your AI assistant for crypto transfers! 🤖✨\n\nI'm here to help you learn about NYLA, understand how transfers work, or answer any questions you might have. What interests you most?`,
      sentiment: 'friendly',
      isWelcome: true
    };

    await this.displayMessage(welcomeMessage, 'nyla');
    
    // Show initial questions
    const questions = this.conversation.generateWelcomeQuestions();
    this.displayQuestions(questions);
    
    // Update stats
    this.updateStats();
  }

  /**
   * Handle question button click
   */
  async handleQuestionClick(button) {
    if (this.isTyping) return; // Prevent clicks during typing

    const questionId = button.getAttribute('data-question-id');
    const questionText = button.textContent;
    const topic = button.getAttribute('data-topic');
    const action = button.getAttribute('data-action');

    // Handle special actions
    if (action === 'changeTopic') {
      this.handleChangeTopicAction();
      return;
    }

    // Disable all question buttons
    this.disableQuestionButtons();

    // Show user's question
    await this.displayMessage({ text: questionText }, 'user');

    // Show typing indicator
    this.showTyping();

    try {
      // Process the question
      const response = await this.conversation.processQuestion(questionId, questionText, topic);
      
      // Hide typing indicator
      this.hideTyping();
      
      // Display NYLA's response
      await this.displayMessage(response.answer, 'nyla');
      
      // Show sticker if available
      if (response.sticker) {
        this.showSticker(response.sticker);
      }
      
      // Display follow-up questions
      this.displayQuestions(response.followUps);
      
      // Update stats
      this.updateStats();
      
    } catch (error) {
      console.error('NYLA UI: Question processing failed', error);
      this.hideTyping();
      
      const errorResponse = this.conversation.generateErrorResponse();
      await this.displayMessage(errorResponse.answer, 'nyla');
      this.displayQuestions(errorResponse.followUps);
    }
  }

  /**
   * Handle change topic action
   */
  handleChangeTopicAction() {
    const result = this.conversation.changeTopicAction();
    
    // Clear current questions
    this.clearQuestions();
    
    // Show topic change message
    this.displayMessage({
      text: result.message,
      sentiment: 'friendly'
    }, 'nyla');
    
    // Show new questions
    this.displayQuestions(result.questions);
  }

  /**
   * Display a message in the chat
   */
  async displayMessage(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.className = `nyla-message nyla-message-${sender}`;
    
    const avatar = sender === 'nyla' ? '🤖' : '👤';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
      <div class="message-header">
        <span class="message-avatar">${avatar}</span>
        <span class="message-sender">${sender === 'nyla' ? 'NYLA' : 'You'}</span>
        <span class="message-time">${timestamp}</span>
      </div>
      <div class="message-content" data-text="${message.text}">
        ${sender === 'nyla' ? '' : this.formatMessageText(message.text)}
      </div>
    `;

    this.elements.messagesContainer.appendChild(messageElement);

    // Typing effect for NYLA messages
    if (sender === 'nyla') {
      await this.typeMessage(messageElement.querySelector('.message-content'), message.text);
    }

    // Scroll to bottom
    this.scrollToBottom();
  }

  /**
   * Type message with typing effect
   */
  async typeMessage(element, text) {
    this.isTyping = true;
    element.innerHTML = '';
    
    const formattedText = this.formatMessageText(text);
    
    // Create a temporary element to get plain text for typing
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = formattedText;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    let currentText = '';
    
    for (let i = 0; i < plainText.length; i++) {
      currentText += plainText[i];
      
      // Update the element with formatted version up to current position
      const currentFormatted = this.formatMessageText(currentText);
      element.innerHTML = currentFormatted;
      
      // Scroll to bottom during typing
      this.scrollToBottom();
      
      // Wait before next character
      await this.sleep(this.typingSpeed);
    }
    
    // Ensure final formatting is applied
    element.innerHTML = formattedText;
    this.isTyping = false;
  }

  /**
   * Format message text with basic markdown-like formatting
   */
  formatMessageText(text) {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/• /g, '<span class="bullet">•</span> ')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  /**
   * Display question buttons
   */
  displayQuestions(questions) {
    if (!questions || questions.length === 0) return;

    this.clearQuestions();

    questions.forEach(question => {
      const button = document.createElement('button');
      button.className = 'nyla-question-btn';
      button.setAttribute('data-question-id', question.id);
      button.setAttribute('data-topic', question.topic);
      button.textContent = question.text;
      
      if (question.action) {
        button.setAttribute('data-action', question.action);
      }

      this.elements.questionsContainer.appendChild(button);
    });

    // Animate buttons in
    this.animateQuestionsIn();
  }

  /**
   * Clear question buttons
   */
  clearQuestions() {
    if (this.elements.questionsContainer) {
      this.elements.questionsContainer.innerHTML = '';
    }
  }

  /**
   * Disable question buttons during processing
   */
  disableQuestionButtons() {
    const buttons = this.elements.questionsContainer.querySelectorAll('.nyla-question-btn');
    buttons.forEach(button => {
      button.disabled = true;
      button.classList.add('disabled');
    });
  }

  /**
   * Enable question buttons
   */
  enableQuestionButtons() {
    const buttons = this.elements.questionsContainer.querySelectorAll('.nyla-question-btn');
    buttons.forEach(button => {
      button.disabled = false;
      button.classList.remove('disabled');
    });
  }

  /**
   * Show typing indicator
   */
  showTyping() {
    if (this.elements.typingIndicator) {
      this.elements.typingIndicator.style.display = 'flex';
      this.scrollToBottom();
    }
  }

  /**
   * Hide typing indicator
   */
  hideTyping() {
    if (this.elements.typingIndicator) {
      this.elements.typingIndicator.style.display = 'none';
    }
  }

  /**
   * Show sticker
   */
  showSticker(stickerData) {
    if (this.elements.sticker && this.elements.stickerContainer) {
      this.elements.sticker.src = stickerData.path;
      this.elements.sticker.alt = `NYLA feeling ${stickerData.emotion}`;
      this.elements.stickerContainer.style.display = 'block';
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        this.elements.stickerContainer.style.display = 'none';
      }, 3000);
    }
  }

  /**
   * Update conversation stats
   */
  updateStats() {
    const stats = this.conversation.getStats();
    if (this.elements.conversationCount) {
      this.elements.conversationCount.textContent = stats.totalConversations;
    }
  }

  /**
   * Animate question buttons in
   */
  animateQuestionsIn() {
    const buttons = this.elements.questionsContainer.querySelectorAll('.nyla-question-btn');
    buttons.forEach((button, index) => {
      button.style.opacity = '0';
      button.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        button.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        button.style.opacity = '1';
        button.style.transform = 'translateY(0)';
      }, index * 100);
    });
  }

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom() {
    if (this.elements.messagesContainer) {
      this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }
  }

  /**
   * Handle tab activation
   */
  onTabActivated() {
    // Update stats when tab becomes active
    this.updateStats();
    
    // Scroll to bottom
    setTimeout(() => this.scrollToBottom(), 100);
  }

  /**
   * Sleep utility for typing animation
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current conversation history for display
   */
  getConversationHistory() {
    return this.conversation.conversationHistory;
  }

  /**
   * Clear conversation history
   */
  clearConversationHistory() {
    if (confirm('Are you sure you want to clear all conversation history?')) {
      this.conversation.conversationHistory = [];
      this.conversation.askedQuestions.clear();
      this.conversation.saveToStorage();
      
      // Clear UI
      this.elements.messagesContainer.innerHTML = '';
      this.clearQuestions();
      
      // Show welcome message again
      this.showWelcomeMessage();
    }
  }

  /**
   * Export conversation for debugging/analysis
   */
  exportConversation() {
    const conversation = {
      history: this.conversation.conversationHistory,
      userProfile: this.conversation.userProfile,
      stats: this.conversation.getStats(),
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(conversation, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `nyla-conversation-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NYLAAssistantUI;
}