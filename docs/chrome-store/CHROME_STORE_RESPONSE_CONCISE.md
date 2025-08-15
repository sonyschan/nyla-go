# activeTab Permission Usage - NYLA Go

## PRIMARY USE: Command Insertion into X.com

**Core Function:** Generate crypto transfer commands and insert directly into X.com compose boxes.

**Technical:** 
```js
chrome.tabs.sendMessage(tab.id, {
  action: 'insertCommand',
  command: transferCommand
});
```

**User Flow:**
1. Fill transfer form (@recipient, amount, token)
2. Click "Send to X.com" 
3. activeTab sends message to content script
4. Command inserted into X.com compose box

**Why Essential:** Need `sendMessage()` to communicate with content script on active X.com tab for text insertion.

## SECONDARY USES:

**Smart Recipient Detection:** Auto-fill @username when replying
**Page Validation:** Check if on X.com before insertion

## Impact Without activeTab:
❌ Core feature broken - cannot insert commands
❌ Users forced to copy/paste manually  
❌ Extension becomes basic text generator only

**This permission enables our PRIMARY advertised functionality - not future features.**