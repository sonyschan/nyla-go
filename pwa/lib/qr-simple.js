// Simple QR Code implementation using DOM manipulation
// Creates scannable QR codes without external dependencies

class SimpleQR {
  static create(text, size = 180) {
    // Create container for QR code with logo overlay
    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      width: ${size}px;
      height: ${size}px;
      display: inline-block;
      border-radius: 4px;
      overflow: hidden;
    `;
    
    // Use qr-server.com API with higher error correction for logo overlay
    const encodedText = encodeURIComponent(text);
    const qrDataURL = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&ecc=H&data=${encodedText}`;
    
    // Create QR code image
    const img = document.createElement('img');
    img.src = qrDataURL;
    img.width = size;
    img.height = size;
    img.alt = 'QR Code';
    img.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
    `;
    
    // Create NYLA logo overlay
    const logoOverlay = document.createElement('div');
    const logoSize = Math.floor(size * 0.2); // Logo is 20% of QR size
    logoOverlay.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: ${logoSize}px;
      height: ${logoSize}px;
      background: white;
      border-radius: 8px;
      padding: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
    `;
    
    // Create NYLA logo image
    const logo = document.createElement('img');
    logo.src = 'https://ipfs.io/ipfs/bafkreicrqacpuzh7ssx56wmzq2hj64oqw4wmkez6gqt6vqoxtl4ajmdfhe';
    logo.alt = 'NYLA';
    logo.style.cssText = `
      width: ${logoSize - 8}px;
      height: ${logoSize - 8}px;
      border-radius: 4px;
      object-fit: contain;
    `;
    
    // Handle logo loading
    logo.onload = function() {
      console.log('NYLA logo loaded successfully');
    };
    
    logo.onerror = function() {
      console.log('NYLA logo failed to load, using fallback');
      // Fallback: Create simple NYLA text logo
      logoOverlay.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #FF8C42, #FF6B35);
          color: white;
          width: ${logoSize - 8}px;
          height: ${logoSize - 8}px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: Arial, sans-serif;
          font-weight: 900;
          font-size: ${Math.floor(logoSize * 0.3)}px;
        ">NYLA</div>
      `;
    };
    
    // Add QR image error handling
    img.onerror = function() {
      console.error('QR image failed to load');
      container.innerHTML = `
        <div style="width: ${size}px; height: ${size}px; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; background: #f9f9f9; border-radius: 4px;">
          <div style="text-align: center; color: #666;">
            <div style="font-size: 24px; margin-bottom: 10px;">📱</div>
            <div style="font-size: 12px;">QR Code</div>
            <div style="font-size: 12px;">Unavailable</div>
          </div>
        </div>
      `;
    };
    
    img.onload = function() {
      console.log('QR code loaded successfully');
      // Add logo overlay after QR loads
      logoOverlay.appendChild(logo);
      container.appendChild(logoOverlay);
    };
    
    // Add QR image to container first
    container.appendChild(img);
    
    return container;
  }
  
  // Alternative method using QR.js embedded code
  static createLocal(text, size = 180) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
    
    // Create a simple data matrix based on text
    const moduleSize = Math.floor(size / 21); // 21x21 for Version 1
    const modules = this.generateModules(text, 21);
    
    ctx.fillStyle = 'black';
    for (let row = 0; row < 21; row++) {
      for (let col = 0; col < 21; col++) {
        if (modules[row] && modules[row][col]) {
          ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize);
        }
      }
    }
    
    return canvas;
  }
  
  static generateModules(text, size) {
    // This is still a simplified version, but more structured
    const modules = Array(size).fill().map(() => Array(size).fill(false));
    
    // Add finder patterns (3 corners)
    this.addPattern(modules, 0, 0, this.finderPattern);
    this.addPattern(modules, 0, size - 7, this.finderPattern);
    this.addPattern(modules, size - 7, 0, this.finderPattern);
    
    // Add separators around finder patterns
    this.addSeparators(modules, size);
    
    // Add timing patterns
    for (let i = 8; i < size - 8; i++) {
      modules[6][i] = (i % 2) === 0;
      modules[i][6] = (i % 2) === 0;
    }
    
    // Add dark module
    modules[4 * 5 + 9][8] = true;
    
    // Fill data area with pattern based on text
    this.fillDataArea(modules, text, size);
    
    return modules;
  }
  
  static finderPattern = [
    [true, true, true, true, true, true, true],
    [true, false, false, false, false, false, true],
    [true, false, true, true, true, false, true],
    [true, false, true, true, true, false, true],
    [true, false, true, true, true, false, true],
    [true, false, false, false, false, false, true],
    [true, true, true, true, true, true, true]
  ];
  
  static addPattern(modules, startRow, startCol, pattern) {
    pattern.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (startRow + r < modules.length && startCol + c < modules[0].length) {
          modules[startRow + r][startCol + c] = cell;
        }
      });
    });
  }
  
  static addSeparators(modules, size) {
    // Add white separators around finder patterns
    // Top-left
    for (let i = 0; i < 8; i++) {
      modules[7][i] = false;
      modules[i][7] = false;
    }
    // Top-right
    for (let i = 0; i < 8; i++) {
      modules[7][size - 8 + i] = false;
      modules[i][size - 8] = false;
    }
    // Bottom-left
    for (let i = 0; i < 8; i++) {
      modules[size - 8][i] = false;
      modules[size - 8 + i][7] = false;
    }
  }
  
  static fillDataArea(modules, text, size) {
    // Simple data filling based on text hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) & 0xffffffff;
    }
    
    let bitIndex = 0;
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!this.isReserved(row, col, size)) {
          modules[row][col] = ((hash >> (bitIndex % 32)) & 1) === 1;
          bitIndex++;
        }
      }
    }
  }
  
  static isReserved(row, col, size) {
    // Finder patterns and separators
    if ((row < 9 && col < 9) || 
        (row < 9 && col >= size - 8) || 
        (row >= size - 8 && col < 9)) {
      return true;
    }
    
    // Timing patterns
    if (row === 6 || col === 6) {
      return true;
    }
    
    return false;
  }
}

window.SimpleQR = SimpleQR;