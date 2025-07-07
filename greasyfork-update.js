// greasyfork-update.js
const {chromium} = require('playwright');
require('dotenv').config();
const path = require('path');

(async () => {
    // Launch browser in headless mode with a non-headless userAgent to avoid bot detection
    const browser = await chromium.launch({headless: true});
    const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/117.0.0.0 Safari/537.36';

    // Create a new context with custom userAgent and viewport
    const context = await browser.newContext({
        userAgent,
        viewport: {width: 1280, height: 800},
    });

    // Prevent WebDriver flag detection
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {get: () => false});
    });

    const page = await context.newPage();

    // Log console messages from the page
    page.on('console', msg => console.log('PAGE LOG ▶', msg.text()));

    // 1) Go to sign-in page
    await page.goto('https://greasyfork.org/en/users/sign_in', {
        waitUntil: 'networkidle',
    });
    console.log('▶ at sign-in page, URL=', page.url());
    await page.screenshot({path: 'debug-signin.png'});

    // 2) Wait for login inputs
    await page.waitForSelector('input[name="user[email]"]', {timeout: 30000});
    await page.waitForSelector('input[name="user[password]"]', {
        timeout: 30000,
    });

    // 3) Fill credentials and submit
    await page.fill('input[name="user[email]"]', process.env.GREASYFORK_EMAIL);
    await page.fill(
        'input[name="user[password]"]',
        process.env.GREASYFORK_PASSWORD,
    );
    await Promise.all([
        page.click('input[type="submit"][name="commit"]'),
        page.waitForNavigation({timeout: 60000}),
    ]);
    console.log('▶ after login, URL=', page.url());
    await page.screenshot({path: 'debug-after-login.png'});

    // 4) Confirm script ownership page
    const scriptSlug = '538095-persian-font-fix-vazir';
    await page.goto(`https://greasyfork.org/en/scripts/${scriptSlug}`, {
        waitUntil: 'networkidle',
    });
    console.log('▶ at script page, URL=', page.url());
    await page.screenshot({path: 'debug-script-page.png'});

    // 5) Navigate to new-version form
    await page.goto(
        `https://greasyfork.org/en/scripts/${scriptSlug}/versions/new`,
        {waitUntil: 'networkidle'},
    );
    console.log('▶ at versions/new, URL=', page.url());
    await page.screenshot({path: 'debug-versions-new.png'});

    // 6) Wait for file input and upload script
    await page.waitForSelector('input[type="file"]', {timeout: 30000});
    console.log('▶ file input is present');
    await page.setInputFiles(
        'input[type="file"]',
        path.resolve(__dirname, 'Persian_Font_Fix_Vazir.user.js'),
    );

    // 7) Submit the new version
    await Promise.all([
        page.click('input[type="submit"][name="commit"]'),
        page.waitForNavigation({timeout: 60000}),
    ]);
    console.log('✅ upload finished, URL=', page.url());

    await browser.close();
})();
