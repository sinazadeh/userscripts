const {chromium} = require('playwright');
require('dotenv').config();
const path = require('path');

(async () => {
    const browser = await chromium.launch({
        headless: false, // run headful so you can watch it
        slowMo: 100, // slow things down a bit
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // log any in-page console messages
    page.on('console', msg => console.log('PAGE LOG ▶', msg.text()));

    // 1) Go to sign-in page
    await page.goto('https://greasyfork.org/en/users/sign_in', {
        waitUntil: 'networkidle',
    });
    console.log('▶ at sign‐in page, URL=', page.url());
    await page.screenshot({path: 'debug-signin.png'});

    // 2) Wait for the email input to appear (may be injected by JS)
    await page
        .waitForSelector('#user_email', {timeout: 30000})
        .catch(() =>
            console.warn(
                '⚠️ #user_email not found; page HTML snapshot in debug-signin.png',
            ),
        );

    // 3) Fill and submit
    await page.fill('#user_email', process.env.GREASYFORK_EMAIL);
    await page.fill('#user_password', process.env.GREASYFORK_PASSWORD);
    await Promise.all([
        page.click('input[name="commit"]'),
        page.waitForNavigation({timeout: 60000}),
    ]);
    console.log('▶ after login, URL=', page.url());
    await page.screenshot({path: 'debug-after-login.png'});

    // 4) Double-check you’re actually recognized as the script owner:
    const scriptId = '538095'; // numeric ID only
    await page.goto(`https://greasyfork.org/en/scripts/${scriptId}`, {
        waitUntil: 'networkidle',
    });
    console.log('▶ at script page, URL=', page.url());
    await page.screenshot({path: 'debug-script-page.png'});

    // 5) Now go to the new-version form
    await page.goto(
        `https://greasyfork.org/en/scripts/${scriptId}/versions/new`,
        {waitUntil: 'networkidle'},
    );
    console.log('▶ at versions/new, URL=', page.url());
    await page.screenshot({path: 'debug-versions-new.png'});

    // 6) Wait for any file input
    await page
        .waitForSelector('input[type="file"]', {timeout: 30000})
        .catch(err => {
            console.error('❌ file input never appeared:', err);
            process.exit(1);
        });
    console.log('▶ file input is present');

    // 7) Upload and submit
    await page.setInputFiles(
        'input[type="file"]',
        path.resolve(__dirname, 'Persian_Font_Fix_Vazir.user.js'),
    );
    await Promise.all([
        page.click('input[name="commit"]'),
        page.waitForNavigation({timeout: 60000}),
    ]);
    console.log('✅ upload finished, URL=', page.url());

    await browser.close();
})();
