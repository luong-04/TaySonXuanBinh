const { app, BrowserWindow } = require('electron');
const path = require('path');

// Lưu ý: Không require 'electron-serve' ở dòng đầu nữa để tránh lỗi khi Dev

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    autoHideMenuBar: true,
    // Icon chỉ hiện khi đóng gói, để dòng này cũng không sao
    icon: path.join(__dirname, 'public/favicon.ico'), 
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    // --- CHẾ ĐỘ CODE (DEV) ---
    console.log("Đang chạy chế độ Dev (Localhost)...");
    
    // Chờ 3s để Next.js khởi động xong
    setTimeout(() => {
        win.loadURL('http://localhost:3000');
    }, 3000);

  } else {
    // --- CHẾ ĐỘ EXE (PRODUCTION) ---
    // Chỉ khi nào đóng gói exe mới gọi thư viện này
    // Cách này khắc phục hoàn toàn lỗi "serve is not a function"
    const serve = require('electron-serve');
    const loadURL = serve({ directory: 'out' });
    loadURL(win);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});