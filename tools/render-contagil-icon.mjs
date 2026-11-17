import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const browser=await chromium.launch({headless:true,...(process.env.UX_CHROME_PATH?{executablePath:process.env.UX_CHROME_PATH}:{})});
try{
 const page=await browser.newPage({viewport:{width:600,height:600},deviceScaleFactor:1});
 await page.goto(pathToFileURL(resolve('assets/brand/icon.svg')).href,{waitUntil:'load'});
 await page.locator('svg').evaluate(el=>{el.setAttribute('width','512');el.setAttribute('height','512');});
 await page.locator('svg').screenshot({path:'assets/brand/icon-512.png',omitBackground:true});
 console.log('Favicon SVG rasterized 512 px.');
}finally{await browser.close()}
