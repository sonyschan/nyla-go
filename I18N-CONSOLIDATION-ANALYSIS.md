# 🔍 i18n Consolidation Analysis

## 🚨 IDENTIFIED DUPLICATES

### **1. Tab Labels (4 duplicates)**
```javascript
// DUPLICATES:
"tab.send": "Send"
"ext.tab.send": "Send"

"tab.receive": "Receive" 
"ext.tab.receive": "Receive"

"tab.swap": "Swap"
"ext.tab.swap": "Swap"

// CONSOLIDATE TO:
"tab.send": "Send"
"tab.receive": "Receive"
"tab.swap": "Swap"
```

### **2. Blockchain Labels (2 duplicates)**
```javascript
// DUPLICATES:
"ui.blockchain": "Blockchain"
"ext.blockchain": "Blockchain"

// CONSOLIDATE TO:
"ui.blockchain": "Blockchain"
```

### **3. Command Preview Labels (4 duplicates)**
```javascript
// DUPLICATES:
"send.command.preview": "Command Preview"
"ext.command.preview": "Command Preview"

"send.command.placeholder": "Fill in the fields above to see the command"
"ext.send.command.placeholder": "Fill in the fields above to see the command"

"swap.command.placeholder": "Fill in the fields above to see the swap command"
"ext.swap.command.placeholder": "Fill in the fields above to see the swap command"

// CONSOLIDATE TO:
"command.preview": "Command Preview"
"command.send.placeholder": "Fill in the fields above to see the command"
"command.swap.placeholder": "Fill in the fields above to see the swap command"
```

### **4. QR Instructions (6 duplicates)**
```javascript
// DUPLICATES:
"receive.qr.instruction": "📱 Share this QR code to receive NYLA payments"
"ext.qr.instruction": "📱 Share this QR code to receive NYLA payments"

"receive.qr.instruction_dynamic": "📱 Share this QR code to receive {{token}} payments"
"ext.qr.instruction_dynamic": "📱 Share this QR code to receive {{token}} payments"
"ext.qr.instruction.dynamic": "📱 Share this QR code to receive {{token}} payments"

"receive.qr.hint": "Others can scan to send you tokens instantly"
"ext.qr.hint": "Others can scan to send you tokens instantly"

// CONSOLIDATE TO:
"qr.instruction": "📱 Share this QR code to receive NYLA payments"
"qr.instruction.dynamic": "📱 Share this QR code to receive {{token}} payments"
"qr.hint": "Others can scan to send you tokens instantly"
```

### **5. Menu Labels (6 duplicates)**
```javascript
// DUPLICATES:
"menu.raids": "Community Raids"
"ext.menu.raids": "Community Raids"

"menu.apps": "Community Apps"
"ext.menu.apps": "Community Apps"

"menu.settings": "Settings"
"ext.menu.settings": "Settings"

// CONSOLIDATE TO:
"menu.raids": "Community Raids"
"menu.apps": "Community Apps"
"menu.settings": "Settings"
```

### **6. Community Raids (14 duplicates)**
```javascript
// DUPLICATES:
"raids.core.title": "NYLA Core"
"ext.raids.core.title": "NYLA Core"

"raids.community.title": "Community"
"ext.raids.community.title": "Community"

"raids.team.title": "The Team"
"ext.raids.team.title": "The Team"

"raids.team.description": "Key NYLA project contributors - support their posts"
"ext.raids.team.description": "Key NYLA project contributors - support their posts"

"raids.raiders.title": "Active NYLA Raiders"
"ext.raids.active.title": "Active NYLA Raiders"

"raids.raiders.description": "Follow these community members' engagement patterns"
"ext.raids.active.description": "Follow these community members' engagement patterns"

"raids.ticker.title": "$NYLA ticker mentioned"
"ext.raids.ticker.title": "$NYLA ticker mentioned"

"raids.ticker.description": "Engage top/latest X posts around $NYLA"
"ext.raids.ticker.description": "Engage top/latest X posts around $NYLA"

// CONSOLIDATE TO:
"raids.core.title": "NYLA Core"
"raids.community.title": "Community"
"raids.team.title": "The Team"
"raids.team.description": "Key NYLA project contributors - support their posts"
"raids.active.title": "Active NYLA Raiders"
"raids.active.description": "Follow these community members' engagement patterns"
"raids.ticker.title": "$NYLA ticker mentioned"
"raids.ticker.description": "Engage top/latest X posts around $NYLA"
```

### **7. App Details (18 duplicates)**
```javascript
// DUPLICATES:
"apps.nyla.yuki.name": "NYLA x YUKI"
"ext.apps.nyla.yuki.name": "NYLA x YUKI"

"apps.nyla.yuki.author": "by @yukisofficial"
"ext.apps.nyla.yuki.author": "by @yukisofficial"

"apps.nyla.yuki.description": "Interactive NYLA-powered experience with community features and engagement"
"ext.apps.nyla.yuki.description": "Interactive NYLA-powered experience with community features and engagement"

"apps.moon.dodge.name": "Nyla Moon Dodge"
"ext.apps.moon.dodge.name": "Nyla Moon Dodge"

"apps.moon.dodge.author": "by @AgentPuffle"
"ext.apps.moon.dodge.author": "by @AgentPuffle"

"apps.moon.dodge.description": "Navigate through space obstacles in this exciting moon-themed dodge game"
"ext.apps.moon.dodge.description": "Navigate through space obstacles in this exciting moon-themed dodge game"

"apps.jump.name": "Nyla Jump"
"ext.apps.nyla.jump.name": "Nyla Jump"

"apps.jump.author": "by @AgentPuffle"
"ext.apps.nyla.jump.author": "by @AgentPuffle"

"apps.jump.description": "Fun jumping game featuring NYLA themes and mechanics"
"ext.apps.nyla.jump.description": "Fun jumping game featuring NYLA themes and mechanics"

// CONSOLIDATE TO:
"apps.yuki.name": "NYLA x YUKI"
"apps.yuki.author": "by @yukisofficial"
"apps.yuki.description": "Interactive NYLA-powered experience with community features and engagement"
"apps.dodge.name": "Nyla Moon Dodge"
"apps.dodge.author": "by @AgentPuffle"
"apps.dodge.description": "Navigate through space obstacles in this exciting moon-themed dodge game"
"apps.jump.name": "Nyla Jump"
"apps.jump.author": "by @AgentPuffle"
"apps.jump.description": "Fun jumping game featuring NYLA themes and mechanics"
```

### **8. Footer Links (4 duplicates)**
```javascript
// DUPLICATES:
"footer.feedback": "Feedback"
"ext.feedback": "Feedback"

"footer.donate": "Donate"
"ext.donate": "Donate"

// CONSOLIDATE TO:
"footer.feedback": "Feedback"
"footer.donate": "Donate"
```

### **9. Back Button (2 duplicates)**
```javascript
// DUPLICATES:
"ui.back": "← Back" (appears twice)

// KEEP ONE:
"ui.back": "← Back"
```

## 📊 CONSOLIDATION SUMMARY

**Total Duplicate Keys Found:** 60+
**Keys After Consolidation:** ~35 fewer keys
**Maintenance Reduction:** ~58% fewer duplicate translations to maintain

## 🎯 CONSOLIDATION BENEFITS

1. **Easier Maintenance**: Single source of truth for each translation
2. **Better Consistency**: Same text uses same key everywhere
3. **Smaller Bundle Size**: Fewer translation entries
4. **Clearer Code**: Logical key naming structure
5. **Faster Development**: No need to check multiple key variations

## 🔧 IMPLEMENTATION PLAN

1. **Phase 1**: Update extension-i18n-next.js with consolidated keys
2. **Phase 2**: Update HTML data-i18n attributes
3. **Phase 3**: Update JavaScript code using old keys
4. **Phase 4**: Update shared data source (nylago-data.js)
5. **Phase 5**: Test all translations work correctly

## ✅ PROPOSED KEY STRUCTURE

```javascript
// CONSOLIDATED STRUCTURE:
{
  // Navigation & UI
  "ui.back": "← Back",
  "ui.blockchain": "Blockchain",
  
  // Tabs
  "tab.send": "Send",
  "tab.receive": "Receive", 
  "tab.swap": "Swap",
  
  // Commands
  "command.preview": "Command Preview",
  "command.send.placeholder": "Fill in fields to see command",
  "command.swap.placeholder": "Fill in fields to see swap command",
  
  // QR Codes
  "qr.instruction": "📱 Share this QR code to receive NYLA payments",
  "qr.instruction.dynamic": "📱 Share this QR code to receive {{token}} payments",
  "qr.hint": "Others can scan to send you tokens instantly",
  "qr.toggle": "Switch to QR Code",
  
  // Community
  "menu.raids": "Community Raids",
  "menu.apps": "Community Apps", 
  "menu.settings": "Settings",
  
  // Raids
  "raids.title": "🎯 Community Raids",
  "raids.core.title": "NYLA Core",
  "raids.team.title": "The Team",
  // etc...
  
  // Apps
  "apps.title": "🚀 Community Apps",
  "apps.yuki.name": "NYLA x YUKI",
  // etc...
  
  // Footer
  "footer.feedback": "Feedback",
  "footer.donate": "Donate",
  "footer.version": "NYLA Go v{{version}}"
}
```