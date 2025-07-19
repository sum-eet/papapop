(function() {
  console.log('🚀 GOD MODE POPUP SCRIPT LOADED');
  
  // Simple popup creator
  function createPopup() {
    console.log('🎯 Creating GOD MODE popup');
    
    const overlay = document.createElement('div');
    overlay.id = 'godmode-popup';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    overlay.innerHTML = `
      <div style="
        background: white;
        padding: 40px;
        border-radius: 15px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        text-align: center;
        max-width: 450px;
        position: relative;
        animation: slideIn 0.3s ease-out;
      ">
        <style>
          @keyframes slideIn {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        </style>
        
        <div style="
          position: absolute;
          top: 15px;
          right: 20px;
          font-size: 28px;
          cursor: pointer;
          color: #666;
          line-height: 1;
        " onclick="document.getElementById('godmode-popup').remove(); console.log('🚀 GOD MODE popup closed');">×</div>
        
        <div style="font-size: 48px; margin-bottom: 20px;">🚀</div>
        <h2 style="margin: 0 0 15px 0; color: #333; font-size: 24px; font-weight: bold;">GOD MODE ACTIVATED!</h2>
        <p style="margin: 0 0 25px 0; color: #666; font-size: 16px; line-height: 1.5;">This popup will definitely show up or we riot.</p>
        
        <div style="margin-bottom: 25px;">
          <input type="email" placeholder="Enter your email for GOD MODE" style="
            width: 100%;
            padding: 15px;
            border: 2px solid #007cba;
            border-radius: 8px;
            font-size: 16px;
            margin-bottom: 15px;
            box-sizing: border-box;
          ">
          <button style="
            width: 100%;
            padding: 15px;
            background: linear-gradient(45deg, #007cba, #0056b3);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
          " onclick="alert('🚀 GOD MODE DISCOUNT: GODMODE50 for 50% OFF!'); console.log('🚀 GOD MODE button clicked');" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            HELL YEAH! 🚀
          </button>
        </div>
        
        <div style="
          background: linear-gradient(45deg, #ff6b6b, #ffa726);
          color: white;
          padding: 10px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 14px;
        ">
          🔥 Use code: <strong>GODMODE50</strong> for 50% OFF! 🔥
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    console.log('✅ GOD MODE popup displayed successfully!');
  }
  
  // Wait for page to load, then show popup after 3 seconds
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      console.log('📄 Page loaded, GOD MODE popup will show in 3 seconds...');
      setTimeout(createPopup, 3000);
    });
  } else {
    console.log('📄 Page already loaded, GOD MODE popup will show in 3 seconds...');
    setTimeout(createPopup, 3000);
  }
  
})();