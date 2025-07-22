// NYLA Transfer Assistant - Content Script for X.com
// Handles command injection into X.com compose boxes

(function() {
  'use strict';
  
  // Common selectors for X.com compose boxes
  const COMPOSE_SELECTORS = [
    '[data-testid="tweetTextarea_0"]',           // Main timeline compose
    '[data-testid="tweetTextarea_1"]',           // Reply compose
    '[data-testid="tweetTextarea_0_label"]',     // Main compose with label
    '[contenteditable="true"][data-testid*="tweet"]', // Generic tweet textarea
    '[role="textbox"][data-testid*="tweet"]',    // Alternative role-based selector
    '[role="textbox"]',                          // Generic textbox role
    'div[contenteditable="true"][spellcheck="true"]', // Generic contenteditable
    'div[contenteditable="true"]',               // All contenteditable divs
    '.public-DraftEditor-content',               // Draft.js editor content
    '[data-contents="true"]',                    // Alternative content area
    '.DraftEditor-editorContainer div[contenteditable="true"]', // Draft.js specific
    '.notranslate',                              // X.com often uses this class
    'div[data-testid*="reply"]',                 // Reply-specific selectors
    'div[aria-label*="reply" i]',                // Aria label containing "reply"
    'div[aria-label*="post" i]'                  // Aria label containing "post"
  ];
  
  // Find the active compose box
  function findComposeBox() {
    // First try to find focused elements or recently clicked elements
    const activeElement = document.activeElement;
    if (activeElement && isElementEditable(activeElement) && 
        (activeElement.contentEditable === 'true' || activeElement.tagName === 'TEXTAREA')) {
      return activeElement;
    }
    
    // Look for compose boxes with specific priority order
    for (const selector of COMPOSE_SELECTORS) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        // Check if element is visible and editable
        if (isElementVisible(element) && isElementEditable(element)) {
          // Additional check for X.com specific elements
          const parentDialog = element.closest('[role="dialog"]');
          const parentMain = element.closest('main');
          
          // Prioritize elements in dialogs (reply boxes) or main content
          if (parentDialog || parentMain) {
            return element;
          }
        }
      }
    }
    
    // Fallback: try any visible contenteditable element
    const allContentEditable = document.querySelectorAll('div[contenteditable="true"], textarea');
    for (const element of allContentEditable) {
      if (isElementVisible(element) && isElementEditable(element)) {
        return element;
      }
    }
    
    return null;
  }
  
  // Check if element is visible
  function isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.visibility !== 'hidden' && 
           style.display !== 'none' &&
           element.offsetParent !== null;
  }
  
  // Check if element is editable
  function isElementEditable(element) {
    return element.isContentEditable || 
           element.contentEditable === 'true' ||
           !element.disabled;
  }
  
  // Insert command into compose box
  function insertCommand(command) {
    // Wait a bit for any page transitions to complete
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const composeBox = findComposeBox();
          
          if (!composeBox) {
            // Try clicking on any reply area to activate it
            const replyElements = document.querySelectorAll('[aria-label*="reply" i], [data-testid*="reply"], .css-1dbjc4n[role="button"]');
            for (const element of replyElements) {
              if (isElementVisible(element)) {
                element.click();
                break;
              }
            }
            
            // Try again after clicking
            setTimeout(() => {
              const retryComposeBox = findComposeBox();
              if (!retryComposeBox) {
                reject(new Error('Could not find X.com compose box. Please click on the reply area first, then try again.'));
                return;
              }
              insertIntoBox(retryComposeBox, command);
              resolve(true);
            }, 500);
            return;
          }
          
          insertIntoBox(composeBox, command);
          resolve(true);
        } catch (error) {
          reject(error);
        }
      }, 100);
    });
  }
  
  // Helper function to simulate typing character by character
  function simulateTyping(element, text) {
    return new Promise((resolve) => {
      element.focus();
      
      // Clear existing content first
      element.innerHTML = '';
      element.textContent = '';
      
      let index = 0;
      
      function typeNextChar() {
        if (index < text.length) {
          const char = text[index];
          
          // Insert character at cursor position
          const selection = window.getSelection();
          const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : document.createRange();
          
          // Create text node and insert it
          const textNode = document.createTextNode(char);
          range.deleteContents();
          range.insertNode(textNode);
          
          // Move cursor to end of inserted text
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
          selection.removeAllRanges();
          selection.addRange(range);
          
          // Dispatch input event for this character
          const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: char
          });
          element.dispatchEvent(inputEvent);
          
          // Dispatch keyboard events
          const keydownEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            key: char,
            code: `Key${char.toUpperCase()}`,
            charCode: char.charCodeAt(0),
            keyCode: char.charCodeAt(0)
          });
          element.dispatchEvent(keydownEvent);
          
          const keyupEvent = new KeyboardEvent('keyup', {
            bubbles: true,
            key: char,
            code: `Key${char.toUpperCase()}`,
            charCode: char.charCodeAt(0),
            keyCode: char.charCodeAt(0)
          });
          element.dispatchEvent(keyupEvent);
          
          index++;
          setTimeout(typeNextChar, 20); // Small delay between characters
        } else {
          // Finished typing, trigger final events
          const finalInputEvent = new Event('input', { bubbles: true });
          element.dispatchEvent(finalInputEvent);
          
          const changeEvent = new Event('change', { bubbles: true });
          element.dispatchEvent(changeEvent);
          
          resolve();
        }
      }
      
      // Start typing
      typeNextChar();
    });
  }
  
  // Alternative method using document.execCommand (more reliable for some cases)
  function insertTextWithExecCommand(element, text) {
    element.focus();
    
    // Clear existing content
    if (element.contentEditable === 'true' || element.isContentEditable) {
      // Select all content and delete
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Delete selected content
      document.execCommand('delete', false);
      
      // Insert new text
      document.execCommand('insertText', false, text);
    } else {
      // For input/textarea elements
      element.select();
      document.execCommand('delete', false);
      document.execCommand('insertText', false, text);
    }
    
    // Trigger events
    const inputEvent = new Event('input', { bubbles: true });
    element.dispatchEvent(inputEvent);
    
    const changeEvent = new Event('change', { bubbles: true });
    element.dispatchEvent(changeEvent);
  }
  
  // Helper function to find and validate the proper editor element
  function findProperEditor(element) {
    // Look for the actual editor container that X.com expects
    const possibleEditors = [
      element,
      element.querySelector('[data-contents="true"]'),
      element.closest('[data-testid*="tweet"]'),
      element.closest('.DraftEditor-root'),
      element.querySelector('.public-DraftEditor-content'),
      element.querySelector('.DraftEditor-editorContainer')
    ].filter(Boolean);
    
    for (const editor of possibleEditors) {
      if (editor && editor.isContentEditable) {
        return editor;
      }
    }
    
    return element;
  }
  
  // Enhanced method using Clipboard API (most reliable for modern browsers)
  async function insertWithClipboard(element, text) {
    try {
      // Focus the element first
      element.focus();
      
      // Clear existing content by selecting all and deleting
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Use clipboard API if available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        
        // Simulate Ctrl+V paste
        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: new DataTransfer()
        });
        
        // Add text to clipboard data
        if (pasteEvent.clipboardData) {
          pasteEvent.clipboardData.setData('text/plain', text);
        }
        
        element.dispatchEvent(pasteEvent);
        
        // Also try execCommand paste as backup
        document.execCommand('paste');
        
        return true;
      }
    } catch (error) {
      console.log('Clipboard method failed:', error);
      return false;
    }
  }
  
  // Method using native Selection and Range APIs
  function insertWithSelection(element, text) {
    try {
      element.focus();
      
      // Get current selection or create new one
      const selection = window.getSelection();
      let range;
      
      if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      } else {
        range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(true);
      }
      
      // Clear existing content
      range.selectNodeContents(element);
      range.deleteContents();
      
      // Create text node and insert
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      
      // Move selection to end
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Trigger input event
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      });
      element.dispatchEvent(inputEvent);
      
      return true;
    } catch (error) {
      console.log('Selection method failed:', error);
      return false;
    }
  }
  
  // Find React fiber and update React state directly
  function getReactInstance(element) {
    // Look for React fiber properties
    const keys = Object.keys(element).find(key => 
      key.startsWith('__reactInternalInstance') || 
      key.startsWith('__reactFiber') ||
      key.startsWith('_reactInternalFiber')
    );
    
    if (keys) {
      return element[keys];
    }
    
    // Also check parent elements
    let current = element.parentElement;
    while (current) {
      const parentKeys = Object.keys(current).find(key => 
        key.startsWith('__reactInternalInstance') || 
        key.startsWith('__reactFiber') ||
        key.startsWith('_reactInternalFiber')
      );
      
      if (parentKeys) {
        return current[parentKeys];
      }
      
      current = current.parentElement;
    }
    
    return null;
  }
  
  // Method that works with X.com's React system
  function insertViaReactEvent(element, text) {
    try {
      element.focus();
      
      // Clear existing content first
      element.textContent = '';
      
      // Create a proper React SyntheticEvent
      const nativeEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      });
      
      // Set the text content
      element.textContent = text;
      
      // Create React-compatible event object
      const reactEvent = {
        bubbles: true,
        cancelable: true,
        currentTarget: element,
        target: element,
        nativeEvent: nativeEvent,
        type: 'input',
        isTrusted: true,
        timeStamp: Date.now()
      };
      
      // Try to find and call React's onChange handler
      const reactInstance = getReactInstance(element);
      if (reactInstance) {
        // Look for onChange in props
        const props = reactInstance.memoizedProps || reactInstance.props;
        if (props && props.onChange) {
          props.onChange(reactEvent);
        }
        
        // Also try onInput
        if (props && props.onInput) {
          props.onInput(reactEvent);
        }
        
        // Try to update React state
        if (reactInstance.stateNode && reactInstance.stateNode.forceUpdate) {
          reactInstance.stateNode.forceUpdate();
        }
      }
      
      // Dispatch the native event
      element.dispatchEvent(nativeEvent);
      
      return true;
    } catch (error) {
      console.log('React event method failed:', error);
      return false;
    }
  }
  
  // Simplest method: Just focus and simulate user typing
  function insertWithSimulatedUserInput(element, text) {
    return new Promise((resolve) => {
      element.focus();
      
      // Clear content
      element.textContent = '';
      
      // Set the text
      element.textContent = text;
      
      // Set cursor at the end
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Simulate a single keypress to trigger validation
      const keyEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: ' ',
        code: 'Space',
        keyCode: 32,
        which: 32
      });
      
      element.dispatchEvent(keyEvent);
      
      // Then immediately dispatch input event
      setTimeout(() => {
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: ' '
        });
        element.dispatchEvent(inputEvent);
        
        // Remove the extra space we added
        setTimeout(() => {
          if (element.textContent.endsWith(' ')) {
            element.textContent = element.textContent.slice(0, -1);
            
            // Final input event
            const finalInputEvent = new InputEvent('input', {
              bubbles: true,
              cancelable: true,
              inputType: 'deleteContentBackward'
            });
            element.dispatchEvent(finalInputEvent);
          }
          resolve(true);
        }, 50);
        
      }, 50);
    });
  }
  
  // Debug function to explore X.com's editor structure
  function debugXcomEditor(element) {
    console.log('NYLA Transfer: Debugging X.com editor structure');
    console.log('Element:', element);
    console.log('Parent elements:');
    
    let current = element;
    let level = 0;
    while (current && level < 5) {
      console.log(`Level ${level}:`, current.tagName, current.className, current.dataset);
      
      // Look for React instances
      const reactKeys = Object.keys(current).filter(key => 
        key.startsWith('__react') || key.startsWith('_react')
      );
      if (reactKeys.length > 0) {
        console.log(`React keys at level ${level}:`, reactKeys);
        const reactInstance = current[reactKeys[0]];
        console.log(`React instance:`, reactInstance);
        if (reactInstance && reactInstance.memoizedProps) {
          console.log(`React props:`, reactInstance.memoizedProps);
        }
      }
      
      current = current.parentElement;
      level++;
    }
  }
  
  // Method: Use browser's native undo/redo and typing simulation
  function insertViaUndoRedoStack(element, text) {
    try {
      element.focus();
      
      // First, ensure there's something to undo by typing a character
      document.execCommand('insertText', false, 'x');
      
      // Now undo that character
      document.execCommand('undo', false);
      
      // Now insert our actual text
      document.execCommand('insertText', false, text);
      
      console.log('NYLA Transfer: Used undo/redo method');
      return true;
    } catch (error) {
      console.log('Undo/redo method failed:', error);
      return false;
    }
  }
  
  // Method: Try to find and trigger X.com's own input handlers
  function findAndTriggerXcomHandlers(element) {
    try {
      // Look for event listeners on the element and its parents
      let current = element;
      while (current) {
        // Check for React events
        const reactKeys = Object.keys(current).find(key => 
          key.startsWith('__react') || key.startsWith('_react')
        );
        
        if (reactKeys) {
          const reactInstance = current[reactKeys];
          if (reactInstance && reactInstance.memoizedProps) {
            const props = reactInstance.memoizedProps;
            
            // Look for input-related handlers
            const handlers = ['onInput', 'onChange', 'onKeyDown', 'onKeyUp', 'onBeforeInput'];
            
            for (const handler of handlers) {
              if (props[handler] && typeof props[handler] === 'function') {
                console.log(`Found ${handler} handler, attempting to call it`);
                
                // Create a synthetic event for this handler
                const syntheticEvent = {
                  target: element,
                  currentTarget: element,
                  type: handler.toLowerCase().replace('on', ''),
                  nativeEvent: new Event('input'),
                  preventDefault: () => {},
                  stopPropagation: () => {}
                };
                
                try {
                  props[handler](syntheticEvent);
                } catch (handlerError) {
                  console.log(`Handler ${handler} failed:`, handlerError);
                }
              }
            }
          }
        }
        
        current = current.parentElement;
        if (current === document.body) break;
      }
    } catch (error) {
      console.log('Handler search failed:', error);
    }
  }
  
  // Method: Manual character-by-character insertion with delays
  async function insertCharByChar(element, text) {
    element.focus();
    element.textContent = ''; // Clear first
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Use execCommand to insert each character
      document.execCommand('insertText', false, char);
      
      // Small delay between characters
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    console.log('NYLA Transfer: Used char-by-char insertion');
    return true;
  }
  
  // Helper function to insert text into compose box
  async function insertIntoBox(composeBox, command) {
    // Find the proper editor element
    const properEditor = findProperEditor(composeBox);
    
    console.log('NYLA Transfer: Inserting into element:', properEditor);
    console.log('NYLA Transfer: Element type:', properEditor.tagName, 'contentEditable:', properEditor.contentEditable);
    
    // Debug X.com's editor structure
    debugXcomEditor(properEditor);
    
    // Focus the element
    properEditor.focus();
    
    // Wait for focus to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Try different insertion methods in order
    const methods = [
      () => insertViaUndoRedoStack(properEditor, command),
      () => insertCharByChar(properEditor, command),
      () => insertTextWithExecCommand(properEditor, command),
      () => insertViaReactEvent(properEditor, command)
    ];
    
    for (const method of methods) {
      try {
        const result = await method();
        if (result !== false) {
          // Verify content was inserted
          const content = properEditor.textContent || properEditor.value || '';
          if (content.includes(command)) {
            console.log('NYLA Transfer: Command inserted successfully');
            
            // Try to trigger X.com's own handlers
            findAndTriggerXcomHandlers(properEditor);
            
            // Give X.com time to process
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return;
          }
        }
      } catch (error) {
        console.log('Insertion method failed:', error);
        continue;
      }
    }
    
    console.error('NYLA Transfer: All insertion methods failed');
  }
  
  // Function to detect reply recipients
  function getReplyRecipients() {
    const recipients = [];
    
    // Look for "Replying to" text patterns
    const replyingToSelectors = [
      '[data-testid*="reply"]',
      '[aria-label*="replying" i]',
      'span:contains("Replying to")',
      'div:contains("Replying to")'
    ];
    
    // Search for text containing "Replying to"
    const textNodes = document.evaluate(
      "//text()[contains(., 'Replying to')]",
      document,
      null,
      XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    
    for (let i = 0; i < textNodes.snapshotLength; i++) {
      const node = textNodes.snapshotItem(i);
      const text = node.textContent;
      
      // Extract usernames from "Replying to @user1 @user2" pattern
      const usernameMatches = text.match(/@[a-zA-Z0-9_]+/g);
      if (usernameMatches) {
        recipients.push(...usernameMatches);
      }
    }
    
    // Also look in nearby elements
    const replyElements = document.querySelectorAll('[data-testid*="reply"], [aria-label*="reply" i]');
    replyElements.forEach(element => {
      const text = element.textContent || element.innerText || '';
      if (text.toLowerCase().includes('replying')) {
        const usernameMatches = text.match(/@[a-zA-Z0-9_]+/g);
        if (usernameMatches) {
          recipients.push(...usernameMatches);
        }
      }
    });
    
    // Remove duplicates and return first one
    const uniqueRecipients = [...new Set(recipients)];
    return uniqueRecipients.length > 0 ? uniqueRecipients[0] : null;
  }
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'insertCommand') {
      insertCommand(message.command)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('NYLA Transfer error:', error);
          sendResponse({ 
            success: false, 
            error: error.message 
          });
        });
      
      // Return true to indicate we'll respond asynchronously
      return true;
    }
    
    if (message.action === 'getReplyRecipient') {
      const recipient = getReplyRecipients();
      sendResponse({ recipient });
      return true;
    }
  });
  
  // Debug function - can be removed in production
  function debugComposeBoxes() {
    console.log('NYLA Transfer: Scanning for compose boxes...');
    COMPOSE_SELECTORS.forEach((selector, index) => {
      const elements = document.querySelectorAll(selector);
      console.log(`Selector ${index + 1} (${selector}): ${elements.length} elements found`);
      elements.forEach((el, elIndex) => {
        console.log(`  Element ${elIndex + 1}:`, {
          visible: isElementVisible(el),
          editable: isElementEditable(el),
          element: el
        });
      });
    });
  }
  
  // Log when content script loads
  console.log('NYLA Transfer Assistant: Content script loaded on', window.location.href);
  
  // Debug on demand (uncomment for debugging)
  // setTimeout(debugComposeBoxes, 3000);
  
})();