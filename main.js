const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

// --- SỬA LỖI Ở ĐÂY ---
// Load thư viện và xử lý trường hợp nó trả về object thay vì function
const serveLib = require('electron-serve');
const serve = serveLib.default || serveLib; 

// Khởi tạo appServe. 
const appServe = serve({ directory: 'out' });

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      devTools: true // Cho phép mở F12 debug
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'public/favicon.ico'), 
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    // --- CHẾ ĐỘ DEV (Chạy code) ---
    console.log("Đang chạy chế độ Dev (Localhost)...");
    
    // Load localhost
    win.loadURL('http://localhost:3000');
    
    // Mở DevTools ngay lập tức để debug nếu cần
    win.webContents.openDevTools();

  } else {
    // --- CHẾ ĐỘ EXE (PRODUCTION) ---
    console.log("Đang chạy chế độ Production (Exe)...");
    
    // Load file tĩnh từ thư mục 'out' bằng thư viện đã sửa lỗi
    appServe(win).then(() => {
      win.loadURL('app://-');
    });

    // Bật phím tắt F12 để mở bảng lỗi khi cần
    globalShortcut.register('F12', () => {
      win.webContents.toggleDevTools();
    });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});