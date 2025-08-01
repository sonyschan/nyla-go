# 🧪 NYLA Go PWA - Mobile Gesture Testing Guide

## 🚀 Quick Start Testing

### **Option 1: Full PWA Test (Recommended)**
```bash
# Start local server in PWA directory
cd pwa
python3 -m http.server 8080

# Open http://localhost:8080 in browser
# Enable mobile device simulation in DevTools
```

### **Option 2: Isolated Gesture Test**
```bash
# Open the dedicated test file
open test-gestures.html
# Or serve it: python3 -m http.server 8081
```

---

## 📱 Mobile Device Simulation Setup

### **Chrome DevTools**
1. **Open DevTools** - `F12` or `Cmd+Option+I`
2. **Enable Device Toolbar** - Click mobile icon or `Cmd+Shift+M`
3. **Select Device** - Choose iPhone/iPad/Android from dropdown
4. **Refresh Page** - `F5` to activate mobile mode
5. **Check Console** - Look for "Mobile mode activated" message

### **Safari DevTools** 
1. **Enable Developer Menu** - Safari → Preferences → Advanced
2. **Open Web Inspector** - `Cmd+Option+I`
3. **Responsive Design Mode** - Device icon in toolbar
4. **Select Device** - Choose from device list

---

## 🎮 Testing Checklist

### **Phase 1: Swipe Navigation** ✅

#### **Basic Swipe Tests**
- [ ] **Left Swipe** - Should advance to next tab (Receive → Raid → App)
- [ ] **Right Swipe** - Should go to previous tab (App → Raid → Receive)
- [ ] **Velocity Check** - Slow swipes should not trigger navigation
- [ ] **Vertical Tolerance** - Slight vertical movement should still work
- [ ] **Console Logs** - Check for "NYLA GO PWA: Mobile gestures initialized"

#### **Advanced Swipe Tests**
- [ ] **Fast Swipe Left** - Should jump to last tab (App)
- [ ] **Fast Swipe Right** - Should jump to first tab (Receive)
- [ ] **Boundary Elastic** - Swipe past first/last tab shows bounce effect
- [ ] **Visual Indicators** - Arrows appear briefly on first load
- [ ] **Velocity Display** - Shows real-time velocity during swipe

#### **Expected Console Output**
```
NYLA GO PWA: Mobile mode activated
NYLA GO PWA: Mobile gestures initialized
Touch start: (x, y)
Velocity: 1.23
Tab switched: Raid
```

---

### **Phase 1: Haptic Feedback** ✅

#### **Haptic Pattern Tests**
- [ ] **Light Vibration** - Normal tab switch (10ms)
- [ ] **Medium Vibration** - Fast swipe or zoom actions (20ms)
- [ ] **Error Pattern** - Boundary hits (10-50-10ms pattern)
- [ ] **Device Support** - Check `'vibrate' in navigator` in console
- [ ] **Pattern Differences** - Different actions feel distinct

#### **Test on Different Devices**
- [ ] **iPhone** - Should use Taptic Engine if available
- [ ] **Android** - Should use standard vibration API
- [ ] **Desktop** - Should gracefully skip haptic feedback
- [ ] **No Support** - Should continue working without errors

---

### **Phase 2: QR Code Pinch/Zoom** ✅

#### **Basic Zoom Tests**
- [ ] **Two-Finger Pinch** - Should zoom QR code (1x to 3x)
- [ ] **Pinch Out** - Should zoom in smoothly
- [ ] **Pinch In** - Should zoom out, reset to 1x at minimum
- [ ] **Double Tap** - Should toggle between 1x and 2x zoom
- [ ] **Zoom Limits** - Should not zoom beyond 1x-3x range

#### **Advanced Zoom Tests**
- [ ] **Pan When Zoomed** - Single finger should move zoomed QR code
- [ ] **Zoom Controls** - +/- buttons should work
- [ ] **Reset Button** - Should reset to 1x zoom and center position
- [ ] **Visual Feedback** - Controls appear/disappear appropriately
- [ ] **Boundary Limits** - Should prevent panning outside reasonable bounds

#### **Performance Tests**
- [ ] **Smooth Transitions** - No jank during zoom/pan operations
- [ ] **Touch Prevention** - Should prevent default browser zoom
- [ ] **Memory Usage** - No memory leaks during repeated zoom operations

---

### **Phase 2: Velocity-Based Swipes** ✅

#### **Velocity Detection Tests**
- [ ] **Slow Swipe** - Under 0.3 px/ms should not trigger navigation
- [ ] **Normal Swipe** - 0.3-1.5 px/ms should navigate to adjacent tab
- [ ] **Fast Swipe** - Over 1.5 px/ms should jump to first/last tab
- [ ] **Velocity Display** - Should show accurate real-time velocity
- [ ] **Fast Swipe Indicator** - "Fast Swipe!" popup should appear

#### **Edge Cases**
- [ ] **Very Short Swipes** - Under 50px should not trigger navigation
- [ ] **Diagonal Swipes** - Should work if horizontal component is dominant
- [ ] **Multi-Touch** - Should handle multiple fingers gracefully
- [ ] **Interrupted Swipes** - Should handle touch interruptions

---

## 🔍 Debugging & Troubleshooting

### **Common Issues & Solutions**

#### **"Mobile gestures not working"**
- ✅ Check if `mobile-mode` class is applied to body
- ✅ Verify screen width is < 1024px in DevTools
- ✅ Look for "Mobile gestures initialized" in console
- ✅ Ensure touch events are enabled in browser

#### **"Haptic feedback not felt"**
- ✅ Enable vibration in browser settings
- ✅ Test on actual mobile device (not just simulation)
- ✅ Check if `navigator.vibrate` returns true
- ✅ Try different vibration patterns

#### **"QR zoom not responding"**
- ✅ Verify QR code is wrapped in `qr-zoom-container`
- ✅ Check for `touch-action: none` CSS property
- ✅ Test with two-finger gestures, not single finger
- ✅ Look for pinch event logs in console

#### **"Swipes triggering browser navigation"**
- ✅ Check if `preventDefault()` is being called
- ✅ Verify `passive: false` in event listeners
- ✅ Test in incognito/private mode
- ✅ Clear browser cache and reload

---

## 📊 Performance Monitoring

### **Key Metrics to Watch**
```javascript
// Check in browser console
performance.mark('gesture-start');
// ... perform gesture ...
performance.mark('gesture-end');
performance.measure('gesture-duration', 'gesture-start', 'gesture-end');
console.log(performance.getEntriesByType('measure'));
```

### **Memory Usage**
- Monitor memory usage during extended gesture testing
- Check for event listener leaks
- Verify proper cleanup on component unmount

### **Battery Impact**
- Test haptic feedback intensity vs battery drain
- Monitor continuous touch event processing
- Check for unnecessary animations

---

## 🎯 Test Results Template

### **Device Test Report**
```
Device: [iPhone 12 Pro / Samsung Galaxy S21 / etc.]
Browser: [Chrome 100 / Safari 15 / etc.]
Date: [YYYY-MM-DD]

✅ Swipe Navigation: PASS/FAIL
✅ Haptic Feedback: PASS/FAIL  
✅ QR Pinch/Zoom: PASS/FAIL
✅ Velocity Detection: PASS/FAIL
✅ Performance: PASS/FAIL

Notes:
- [Any specific observations]
- [Performance issues found]
- [Browser-specific behaviors]
```

---

## 🚀 Advanced Testing

### **Load Testing**
- Test with 100+ rapid swipes
- Monitor memory usage over time
- Check for gesture conflicts

### **Accessibility Testing**
- Test with reduced motion settings
- Verify keyboard navigation still works
- Check screen reader compatibility

### **Cross-Platform Testing**
- iOS Safari vs Android Chrome
- Different screen sizes and densities
- Portrait vs landscape orientation

---

## 📞 Reporting Issues

If you find any issues during testing:

1. **Record the Issue**
   - Device/browser details
   - Steps to reproduce
   - Expected vs actual behavior
   - Console errors (if any)

2. **Check Known Issues**
   - Browser-specific touch event differences
   - iOS Safari gesture limitations
   - Android haptic feedback variations

3. **Performance Impact**
   - Note any lag or jank
   - Memory usage patterns
   - Battery drain observations

---

Happy Testing! 🎉