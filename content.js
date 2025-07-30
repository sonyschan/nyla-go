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
    console.log('NYLA Debug: ========== Starting getReplyRecipients ==========');
    console.log('NYLA Debug: Current URL:', window.location.href);
    console.log('NYLA Debug: Document referrer:', document.referrer);
    
    const recipients = [];
    
    // Helper function to clean and extract usernames more precisely
    function extractCleanUsernames(text) {
      console.log('NYLA Debug: Extracting from text:', text);
      
      // More precise regex that stops at word boundaries or common separators
      // This will match @username but stop before words like "Post", "Reply", etc.
      const usernameMatches = text.match(/@[a-zA-Z0-9_]+(?=\s|$|[^a-zA-Z0-9_]|Post|Reply|·|,|\.|!|\?)/g);
      
      if (usernameMatches) {
        // Additional cleanup: remove common suffixes that might be captured
        const cleanedMatches = usernameMatches.map(username => {
          // Remove common suffixes that shouldn't be part of username
          const cleaned = username.replace(/(Post|Reply|Likes|Reposts|Views|Follow|Following)$/i, '');
          console.log('NYLA Debug: Cleaned username:', username, '->', cleaned);
          return cleaned;
        }).filter(username => username.length > 1); // Filter out just '@'
        
        return cleanedMatches;
      }
      
      return [];
    }
    
    // Special case: Detect username from compose dialog context
    function getComposeDialogContext() {
      console.log('NYLA Debug: === getComposeDialogContext called ===');
      console.log('NYLA Debug: Current pathname:', window.location.pathname);
      
      // Check if we're in a compose dialog (/compose/post) OR a reply dialog popup
      const isComposeDialog = window.location.pathname === '/compose/post';
      const textareaSelectors = [
        '[data-testid="tweetTextarea_0"]',
        '[data-testid="tweetTextarea_1"]',
        '[data-testid="tweetTextarea"]',
        '[contenteditable="true"][data-testid*="tweet"]',
        '[role="textbox"][data-testid*="tweet"]'
      ];
      
      let foundTextarea = false;
      for (const selector of textareaSelectors) {
        if (document.querySelector(selector)) {
          console.log('NYLA Debug: Found textarea with selector:', selector);
          foundTextarea = true;
          break;
        }
      }
      
      const isReplyDialog = document.querySelector('[role="dialog"]') && foundTextarea;
      
      console.log('NYLA Debug: isComposeDialog:', isComposeDialog);
      console.log('NYLA Debug: isReplyDialog:', isReplyDialog);
      console.log('NYLA Debug: Dialog element:', !!document.querySelector('[role="dialog"]'));
      console.log('NYLA Debug: tweetTextarea_0:', !!document.querySelector('[data-testid="tweetTextarea_0"]'));
      console.log('NYLA Debug: tweetTextarea_1:', !!document.querySelector('[data-testid="tweetTextarea_1"]'));
      
      if (isComposeDialog || isReplyDialog) {
        console.log('NYLA Debug: In compose/reply dialog, looking for context');
        
        // Method 1: For reply dialogs, look for "Replying to @username" text
        if (isReplyDialog) {
          console.log('NYLA Debug: Detected reply dialog, searching for reply context');
          
          // Look specifically for "Replying to" text in the dialog
          const replyIndicators = document.querySelectorAll('[role="dialog"] *');
          console.log('NYLA Debug: Found', replyIndicators.length, 'dialog elements to check');
          for (const element of replyIndicators) {
            const text = element.textContent || '';
            if (text.toLowerCase().includes('replying to')) {
              console.log('NYLA Debug: Found "Replying to" text:', text);
              const usernames = extractCleanUsernames(text);
              if (usernames.length > 0) {
                console.log('NYLA Debug: Extracted username from reply dialog:', usernames[0]);
                return usernames[0];
              }
            }
            // Also check for newer patterns
            if (text.toLowerCase().includes('reply to') || text.toLowerCase().includes('responding to')) {
              console.log('NYLA Debug: Found alternative reply text:', text);
              const usernames = extractCleanUsernames(text);
              if (usernames.length > 0) {
                console.log('NYLA Debug: Extracted username from alternative reply text:', usernames[0]);
                return usernames[0];
              }
            }
          }
          
          // Alternative: Look for username links in the reply dialog
          const dialogUsernameLinks = document.querySelectorAll('[role="dialog"] a[href^="/"]');
          for (const link of dialogUsernameLinks) {
            const href = link.getAttribute('href');
            const match = href.match(/^\/([a-zA-Z0-9_]+)$/);
            if (match && match[1] && !href.includes('status') && !href.includes('photo')) {
              const username = '@' + match[1];
              console.log('NYLA Debug: Found username from reply dialog link:', username);
              return username;
            }
          }
          
          // Additional method: Look for the original tweet content in the reply dialog
          const originalTweetElements = document.querySelectorAll('[role="dialog"] [data-testid*="tweet"], [role="dialog"] article');
          for (const tweetElement of originalTweetElements) {
            // Look for username mentions or author information
            const usernameElements = tweetElement.querySelectorAll('a[href^="/"]');
            for (const userLink of usernameElements) {
              const href = userLink.getAttribute('href');
              const match = href.match(/^\/([a-zA-Z0-9_]+)(?:\/status\/\d+)?$/);
              if (match && match[1] && !['home', 'explore', 'notifications'].includes(match[1])) {
                const username = '@' + match[1];
                console.log('NYLA Debug: Found username from original tweet in reply dialog:', username);
                return username;
              }
            }
          }
        }
        
        // Method 2: Look for quoted tweet or referenced tweet in the dialog
        const quotedTweetSelectors = [
          '[data-testid="quoteTweet"]',
          '[data-testid*="tweet"]',
          '.css-1dbjc4n[role="blockquote"]',
          '[role="blockquote"]'
        ];
        
        for (const selector of quotedTweetSelectors) {
          const quotedElements = document.querySelectorAll(selector);
          for (const element of quotedElements) {
            const text = element.textContent || '';
            const usernames = extractCleanUsernames(text);
            if (usernames.length > 0) {
              console.log('NYLA Debug: Found username in quoted tweet:', usernames[0]);
              return usernames[0];
            }
            
            // Also check for username links within quoted tweets
            const usernameLinks = element.querySelectorAll('a[href^="/"]');
            for (const link of usernameLinks) {
              const href = link.getAttribute('href');
              const match = href.match(/^\/([a-zA-Z0-9_]+)$/);
              if (match && match[1] && !href.includes('status') && !href.includes('photo')) {
                const username = '@' + match[1];
                console.log('NYLA Debug: Found username from quoted tweet link:', username);
                return username;
              }
            }
          }
        }
        
        // Method 2: Extract tweet author from current URL or page context
        // For URLs like https://x.com/shax_btc/status/123, extract 'shax_btc'
        const currentUrl = window.location.href;
        const tweetAuthorMatch = currentUrl.match(/x\.com\/([a-zA-Z0-9_]+)\/status\/\d+/);
        if (tweetAuthorMatch && tweetAuthorMatch[1]) {
          const username = '@' + tweetAuthorMatch[1];
          console.log('NYLA Debug: Found tweet author from current URL:', username);
          return username;
        }
        
        // Check document referrer as fallback
        if (document.referrer) {
          const referrerMatch = document.referrer.match(/x\.com\/([a-zA-Z0-9_]+)(?:\/status\/\d+)?/);
          if (referrerMatch && referrerMatch[1] && 
              !referrerMatch[1].includes('home') && 
              !referrerMatch[1].includes('explore') &&
              !referrerMatch[1].includes('notifications')) {
            const username = '@' + referrerMatch[1];
            console.log('NYLA Debug: Found username from referrer:', username);
            return username;
          }
        }
        
        // Method 3: Look for any username in the compose dialog content
        const dialogContent = document.querySelector('[role="dialog"]');
        if (dialogContent) {
          const dialogText = dialogContent.textContent || '';
          const usernames = extractCleanUsernames(dialogText);
          if (usernames.length > 0) {
            console.log('NYLA Debug: Found username in dialog content:', usernames[0]);
            return usernames[0];
          }
          
          // Look for username links in the dialog
          const usernameLinks = dialogContent.querySelectorAll('a[href^="/"]');
          for (const link of usernameLinks) {
            const href = link.getAttribute('href');
            const match = href.match(/^\/([a-zA-Z0-9_]+)$/);
            if (match && match[1] && !href.includes('status') && !href.includes('photo')) {
              const username = '@' + match[1];
              console.log('NYLA Debug: Found username from dialog link:', username);
              return username;
            }
          }
        }
        
        // Method 4: Check browser history or session storage for context
        try {
          const historyState = window.history.state;
          if (historyState && historyState.usr) {
            const username = '@' + historyState.usr;
            console.log('NYLA Debug: Found username from history state:', username);
            return username;
          }
        } catch (e) {
          console.log('NYLA Debug: Could not access history state');
        }
      }
      
      return null;
    }
    
    // Priority 1: Check for reply dialog popup context (highest priority)
    const replyDialog = document.querySelector('[role="dialog"]');
    console.log('NYLA Debug: Reply dialog found:', !!replyDialog);
    if (replyDialog) {
      console.log('NYLA Debug: Reply dialog detected, using specialized detection');
      console.log('NYLA Debug: Dialog HTML:', replyDialog.innerHTML.substring(0, 500) + '...');
      const dialogRecipient = getComposeDialogContext();
      if (dialogRecipient) {
        console.log('NYLA Debug: Using reply dialog recipient:', dialogRecipient);
        return dialogRecipient;
      }
    }
    
    // Priority 2: Check for compose dialog context
    const composeContextRecipient = getComposeDialogContext();
    if (composeContextRecipient) {
      console.log('NYLA Debug: Using compose dialog context recipient:', composeContextRecipient);
      return composeContextRecipient;
    }
    
    // Special case: If we're on a tweet page, extract the author from URL
    function getTweetAuthorFromUrl() {
      const currentUrl = window.location.href;
      const tweetMatch = currentUrl.match(/x\.com\/([a-zA-Z0-9_]+)\/status\/\d+/);
      if (tweetMatch && tweetMatch[1]) {
        const username = '@' + tweetMatch[1];
        console.log('NYLA Debug: Found tweet author from URL:', username);
        return username;
      }
      return null;
    }
    
    // Check for tweet author from URL (for reply scenarios on tweet pages)
    const tweetAuthor = getTweetAuthorFromUrl();
    if (tweetAuthor && window.location.pathname.includes('/status/')) {
      console.log('NYLA Debug: Using tweet author as recipient:', tweetAuthor);
      return tweetAuthor;
    }
    
    // Look for specific X.com reply indicators first
    const replyIndicators = document.querySelectorAll('[data-testid="reply"], [data-testid*="replyingTo"]');
    replyIndicators.forEach(element => {
      const text = element.textContent || element.innerText || '';
      console.log('NYLA Debug: Reply indicator text:', text);
      const usernames = extractCleanUsernames(text);
      recipients.push(...usernames);
    });
    
    // Search for text containing "Replying to" using XPath
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
      console.log('NYLA Debug: XPath found text:', text);
      const usernames = extractCleanUsernames(text);
      recipients.push(...usernames);
    }
    
    // Look for username links in the reply context
    const usernameLinks = document.querySelectorAll('a[href*="/"]:not([href*="status"]):not([href*="photo"])');
    usernameLinks.forEach(link => {
      const href = link.getAttribute('href');
      // Extract username from href like "/username" 
      const match = href.match(/^\/([a-zA-Z0-9_]+)$/);
      if (match && match[1]) {
        const username = '@' + match[1];
        // Check if this link is in a reply context
        const parentText = link.closest('[data-testid*="reply"]')?.textContent || 
                          link.parentElement?.textContent || '';
        if (parentText.toLowerCase().includes('replying') || 
            link.closest('[data-testid*="reply"]')) {
          console.log('NYLA Debug: Found username link:', username);
          recipients.push(username);
        }
      }
    });
    
    // Remove duplicates and return first valid one
    const uniqueRecipients = [...new Set(recipients)];
    console.log('NYLA Debug: All found recipients:', uniqueRecipients);
    
    // Filter out common false positives (like current user's own username)
    const filteredRecipients = uniqueRecipients.filter(recipient => {
      if (!recipient || recipient.length <= 1 || recipient === '@') {
        return false;
      }
      
      // Filter out known current user indicators (this will help avoid self-mentions)
      const username = recipient.replace('@', '').toLowerCase();
      const suspiciousPatterns = ['h2crypto_eth', 'home', 'explore', 'notifications', 'messages', 'bookmarks'];
      
      return !suspiciousPatterns.includes(username);
    });
    
    console.log('NYLA Debug: Filtered recipients (removed self/system):', filteredRecipients);
    
    // Return the first valid recipient
    for (const recipient of filteredRecipients) {
      if (recipient && recipient.length > 1 && recipient !== '@') {
        console.log('NYLA Debug: Returning recipient:', recipient);
        return recipient;
      }
    }
    
    return null;
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
  
  // ===== NYLA PROFILE DETECTION & ICON INJECTION =====
  
  // NYLA Profile Detection Engine
  function detectNylaProfile() {
    console.log('NYLA Profile: Starting detection...');
    
    // Only run on profile pages (not status pages)
    const urlPath = window.location.pathname;
    if (urlPath.includes('/status/') || urlPath.includes('/compose') || 
        urlPath === '/' || urlPath === '/home' || urlPath === '/explore') {
      console.log('NYLA Profile: Not a profile page, skipping');
      return false;
    }
    
    try {
      // Extract profile information
      const profileName = document.querySelector('[data-testid="UserName"]')?.textContent?.trim() || '';
      const profileBio = document.querySelector('[data-testid="UserDescription"]')?.textContent?.trim() || '';
      const profileHandle = document.querySelector('[data-testid="UserScreenName"]')?.textContent?.trim() || '';
      const username = urlPath.slice(1); // Remove leading slash
      
      // Combine all text for search
      const searchText = `${profileName} ${profileBio} ${profileHandle} ${username}`.toLowerCase();
      
      console.log('NYLA Profile: Scanning text:', searchText);
      
      // Check for NYLA keywords (case-insensitive)
      const nylaKeywords = ['nyla', 'agentnyla', 'agent nyla'];
      const hasNyla = nylaKeywords.some(keyword => searchText.includes(keyword));
      
      console.log('NYLA Profile: Detection result:', hasNyla);
      return hasNyla;
      
    } catch (error) {
      console.log('NYLA Profile: Detection error:', error);
      return false;
    }
  }
  
  // Create NYLAgo icon element
  function createNylaIcon() {
    const iconContainer = document.createElement('div');
    iconContainer.className = 'nyla-icon-container';
    iconContainer.style.cssText = `
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 17px;
      background: rgba(15, 20, 25, 0.1);
      border: 1px solid rgba(207, 217, 222, 0.75);
      cursor: pointer;
      transition: all 0.2s ease;
      margin: 0 0 0 8px;
      position: relative;
      z-index: 1000;
      visibility: visible !important;
      opacity: 1 !important;
      flex-shrink: 0;
      box-sizing: border-box;
      vertical-align: middle;
    `;
    
    // Add hover effects
    iconContainer.addEventListener('mouseenter', () => {
      iconContainer.style.background = 'rgba(255, 107, 53, 0.1)';
      iconContainer.style.borderColor = 'rgba(255, 255, 255, 0.9)';
      iconContainer.style.transform = 'scale(1.05)';
    });
    
    iconContainer.addEventListener('mouseleave', () => {
      iconContainer.style.background = 'rgba(15, 20, 25, 0.1)';
      iconContainer.style.borderColor = 'rgba(207, 217, 222, 0.75)';
      iconContainer.style.transform = 'scale(1)';
    });
    
    // Create SVG icon
    const svgIcon = document.createElement('div');
    svgIcon.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="nylaGradientProfile" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#FF8C42;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#FF6B35;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="11" fill="url(#nylaGradientProfile)"/>
        <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.5"/>
        <text x="12" y="16" font-family="Arial, sans-serif" font-size="14" font-weight="900" 
              fill="white" text-anchor="middle" dominant-baseline="middle">N</text>
      </svg>
    `;
    
    // Add tooltip
    iconContainer.title = 'Open NYLAgo Transfer - Click to send NYLA tokens to this user';
    iconContainer.setAttribute('aria-label', 'NYLAgo Transfer Assistant');
    
    iconContainer.appendChild(svgIcon);
    return iconContainer;
  }
  
  // Find optimal placement for the icon
  function findIconPlacement() {
    console.log('NYLA Profile: Starting placement search...');
    
    // Look specifically for Follow button to place NYLAgo button right after it
    const followSelectors = [
      '[data-testid*="follow"]',
      '[aria-label*="Follow" i]',
      '[role="button"]'
    ];
    
    // Try to find Follow button first for optimal placement
    for (const selector of followSelectors) {
      const elements = document.querySelectorAll(selector);
      console.log(`NYLA Profile: Found ${elements.length} elements for selector: ${selector}`);
      
      for (const element of elements) {
        // Check if this element contains "Follow" text
        const elementText = element.textContent?.toLowerCase() || '';
        const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
        
        if (elementText.includes('follow') || ariaLabel.includes('follow')) {
          const profileHeader = element.closest('[data-testid="UserCell"]') || 
                               element.closest('[data-testid="primaryColumn"]') ||
                               element.closest('div[role="banner"]');
          
          if (profileHeader && isElementVisible(element)) {
            // Find the immediate parent container that holds the Follow button
            const directParent = element.parentElement;
            
            // Check if the parent is a flex container or if we can make it one
            const parentStyle = window.getComputedStyle(directParent);
            console.log('NYLA Profile: Follow button direct parent:', directParent);
            console.log('NYLA Profile: Parent display style:', parentStyle.display);
            
            // Return the direct parent so we can insert right after the Follow button
            return { 
              container: directParent, 
              insertAfter: element,
              insertMethod: 'afterend' // Insert immediately after Follow button
            };
          }
        }
      }
    }
    
    // Fallback: try to find other action buttons area
    const generalSelectors = [
      '[data-testid="userActions"]', // User actions container
      '[role="button"]', // Any button in profile header
    ];
    
    for (const selector of generalSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        // Check if this element is in the profile header area
        const profileHeader = element.closest('[data-testid="UserCell"]') || 
                             element.closest('[data-testid="primaryColumn"]');
        if (profileHeader && isElementVisible(element)) {
          // Find parent container to place icon next to
          const parent = element.parentElement;
          if (parent && parent.style.display !== 'none') {
            console.log('NYLA Profile: Found fallback placement target:', element);
            return { container: parent, insertAfter: null };
          }
        }
      }
    }
    
    // Fallback: try to find any visible button container in profile area
    const profileButtons = document.querySelector('[data-testid="primaryColumn"] [role="button"]');
    if (profileButtons) {
      return { container: profileButtons.parentElement, insertAfter: null };
    }
    
    console.log('NYLA Profile: No suitable placement found');
    return null;
  }
  
  // Inject NYLAgo icon into profile
  function injectNylagoIcon() {
    // Check if icon already exists
    if (document.querySelector('.nyla-icon-container') || document.querySelector('.nyla-button-wrapper')) {
      console.log('NYLA Profile: Icon or wrapper already exists');
      return;
    }
    
    const placement = findIconPlacement();
    if (!placement) {
      console.log('NYLA Profile: Could not find suitable placement, trying emergency fallback');
      // Emergency fallback: try to find any button in profile area
      const anyButton = document.querySelector('[data-testid="primaryColumn"] [role="button"], main [role="button"]');
      if (anyButton && isElementVisible(anyButton)) {
        const emergencyContainer = anyButton.parentElement;
        if (emergencyContainer) {
          const nylaIcon = createNylaIcon();
          nylaIcon.addEventListener('click', handleNylaIconClick);
          emergencyContainer.appendChild(nylaIcon);
          console.log('NYLA Profile: NYLAgo icon injected using emergency fallback');
          return;
        }
      }
      console.log('NYLA Profile: No placement options found at all');
      return;
    }
    
    const nylaIcon = createNylaIcon();
    
    // Add click handler
    nylaIcon.addEventListener('click', handleNylaIconClick);
    
    // Insert icon with optimal positioning
    if (placement.container && placement.insertAfter && placement.insertMethod === 'afterend') {
      // Strategy: Create a horizontal wrapper container for Follow button + NYLAgo button
      const followButton = placement.insertAfter;
      const parentContainer = placement.container;
      
      console.log('NYLA Profile: Creating horizontal wrapper for buttons');
      
      // Create a flex wrapper container
      const buttonWrapper = document.createElement('div');
      buttonWrapper.className = 'nyla-button-wrapper';
      buttonWrapper.style.cssText = `
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        gap: 8px !important;
        flex-wrap: nowrap !important;
        width: 100% !important;
      `;
      
      // Move the Follow button into the wrapper
      parentContainer.insertBefore(buttonWrapper, followButton);
      buttonWrapper.appendChild(followButton);
      
      // Add the NYLAgo button to the wrapper
      buttonWrapper.appendChild(nylaIcon);
      
      console.log('NYLA Profile: NYLAgo icon placed in horizontal wrapper with Follow button');
      console.log('NYLA Profile: Wrapper element:', buttonWrapper);
      
    } else if (placement.container && placement.insertAfter) {
      // Legacy insertion method
      placement.insertAfter.insertAdjacentElement('afterend', nylaIcon);
      console.log('NYLA Profile: NYLAgo icon injected after Follow button (legacy)', placement.insertAfter);
    } else if (placement.container) {
      // Fallback: append to container
      placement.container.appendChild(nylaIcon);
      console.log('NYLA Profile: NYLAgo icon injected to container', placement.container);
    } else {
      // Legacy placement structure
      placement.appendChild(nylaIcon);
      console.log('NYLA Profile: NYLAgo icon injected with legacy placement', placement);
    }
    
    // Verify injection worked
    setTimeout(() => {
      const injectedIcon = document.querySelector('.nyla-icon-container');
      if (injectedIcon) {
        const rect = injectedIcon.getBoundingClientRect();
        console.log('NYLA Profile: Icon verification - exists:', !!injectedIcon, 'visible:', rect.width > 0 && rect.height > 0, 'rect:', rect);
        console.log('NYLA Profile: Icon parent:', injectedIcon.parentElement);
        console.log('NYLA Profile: Icon computed style:', window.getComputedStyle(injectedIcon));
      } else {
        console.log('NYLA Profile: Icon injection failed - element not found in DOM');
      }
    }, 100);
  }
  
  // Handle NYLAgo icon click
  function handleNylaIconClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('NYLA Profile: NYLAgo icon clicked');
    
    // Add visual feedback
    const icon = event.currentTarget;
    icon.style.transform = 'scale(0.95)';
    setTimeout(() => {
      icon.style.transform = 'scale(1)';
    }, 150);
    
    // Try to find and click the "Post" button
    const postButtonSelectors = [
      '[data-testid="SideNav_NewTweet_Button"]', // Main post button
      '[aria-label*="Post" i]', // Post button by aria-label
      '[role="button"]:contains("Post")', // Generic post button
    ];
    
    for (const selector of postButtonSelectors) {
      const postButton = document.querySelector(selector);
      if (postButton && isElementVisible(postButton)) {
        console.log('NYLA Profile: Triggering post button click');
        postButton.click();
        
        // Wait for compose dialog to open and show feedback
        setTimeout(() => {
          showNylagoFeedback();
        }, 500);
        
        return;
      }
    }
    
    // Fallback: show instruction message
    console.log('NYLA Profile: Could not find post button, showing fallback message');
    alert('Click the "Post" button to open the compose dialog, then use the NYLAgo extension!');
  }
  
  // Show visual feedback in compose dialog
  function showNylagoFeedback() {
    // Check if we're now in a compose dialog
    const composeDialog = document.querySelector('[role="dialog"]');
    if (composeDialog && window.location.pathname === '/compose/post') {
      // Create a subtle notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #FF8C42, #FF6B35);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
      `;
      
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 16px; height: 16px;">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="11" fill="white"/>
              <text x="12" y="16" font-family="Arial" font-size="14" font-weight="900" 
                    fill="#FF6B35" text-anchor="middle" dominant-baseline="middle">N</text>
            </svg>
          </div>
          <span>Now click the NYLAgo extension to start your transfer!</span>
        </div>
      `;
      
      // Add animation keyframes
      if (!document.querySelector('#nyla-keyframes')) {
        const style = document.createElement('style');
        style.id = 'nyla-keyframes';
        style.textContent = `
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(notification);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = 'slideIn 0.3s ease-out reverse';
          setTimeout(() => notification.remove(), 300);
        }
      }, 5000);
      
      console.log('NYLA Profile: Feedback notification shown');
    }
  }
  
  // Monitor profile changes
  function startProfileMonitoring() {
    let currentPath = window.location.pathname;
    let profileCheckTimeout;
    
    // Check for profile changes
    function checkProfile() {
      if (window.location.pathname !== currentPath) {
        currentPath = window.location.pathname;
        console.log('NYLA Profile: Path changed to:', currentPath);
        
        // Clear any existing timeout
        clearTimeout(profileCheckTimeout);
        
        // Remove existing icon and wrapper
        const existingIcon = document.querySelector('.nyla-icon-container');
        const existingWrapper = document.querySelector('.nyla-button-wrapper');
        if (existingIcon) {
          existingIcon.remove();
        }
        if (existingWrapper) {
          // Move Follow button back before removing wrapper
          const followButton = existingWrapper.querySelector('[role="button"]');
          if (followButton) {
            existingWrapper.parentElement.insertBefore(followButton, existingWrapper);
          }
          existingWrapper.remove();
        }
        
        // Wait for page to load, then check for NYLA
        profileCheckTimeout = setTimeout(() => {
          if (detectNylaProfile()) {
            console.log('NYLA Profile: NYLA profile detected, injecting icon');
            injectNylagoIcon();
          }
        }, 1000);
      }
    }
    
    // Initial check
    setTimeout(() => {
      if (detectNylaProfile()) {
        console.log('NYLA Profile: Initial NYLA profile detected, injecting icon');
        injectNylagoIcon();
      }
    }, 1500);
    
    // Monitor URL changes
    setInterval(checkProfile, 1000);
    
    // Monitor DOM changes for dynamic content
    const observer = new MutationObserver((mutations) => {
      let shouldRecheck = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if profile information was added/updated
          const hasProfileChange = Array.from(mutation.addedNodes).some(node => {
            return node.nodeType === 1 && (
              node.querySelector && (
                node.querySelector('[data-testid="UserName"]') ||
                node.querySelector('[data-testid="UserDescription"]')
              )
            );
          });
          if (hasProfileChange) {
            shouldRecheck = true;
          }
        }
      });
      
      if (shouldRecheck) {
        clearTimeout(profileCheckTimeout);
        profileCheckTimeout = setTimeout(() => {
          const existingIcon = document.querySelector('.nyla-icon-container');
          if (!existingIcon && detectNylaProfile()) {
            console.log('NYLA Profile: Profile content updated, NYLA detected');
            injectNylagoIcon();
          }
        }, 500);
      }
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('NYLA Profile: Monitoring started');
  }
  
  // Initialize profile monitoring
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startProfileMonitoring);
  } else {
    startProfileMonitoring();
  }
  
})();