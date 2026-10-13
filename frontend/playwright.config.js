import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 60000, workers: 1,
  use: {baseURL:'http://127.0.0.1:18080', viewport:{width:1440,height:1050}, headless:true, launchOptions:process.env.UI_CHROMIUM_PATH?{executablePath:process.env.UI_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{}},
  webServer:{command:'python -m uvicorn main:app --app-dir ../backend --host 127.0.0.1 --port 18080',url:'http://127.0.0.1:18080/api/health',reuseExistingServer:false,timeout:30000}
});
