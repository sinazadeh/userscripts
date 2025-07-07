const {chromium} = require('playwright');
require('dotenv').config();
const path = require('path');

(async () => {
    // Launch in headless mode so no X server is required
    const browser = await chromium.launch({headless: true});
    const context = await browser.newContext();
    const page = await context.newPage();

    // Log in-page console messages
    page.on('console', msg => console.log('PAGE LOG ▶', msg.text()));

    // 1) Go to sign-in page
    await page.goto('https://greasyfork.org/en/users/sign_in', {
        waitUntil: 'networkidle',
    });
    console.log('▶ at sign-in page, URL=', page.url());
    await page.screenshot({path: 'debug-signin.png'});

    // 2) Wait for the correct email input selector
    await page
        .waitForSelector('input[name="user[email]"]', {timeout: 30000})
        .catch(() =>
            console.warn(
                '⚠️ input[name="user[email]"] not found; see debug-signin.png',
            ),
        );

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

    // 4) Navigate to script page to confirm ownership using slug
    const scriptSlug = '538095-persian-font-fix-vazir';
    await page.goto(`https://greasyfork.org/en/scripts/${scriptSlug}`, {
        waitUntil: 'networkidle',
    });
    console.log('▶ at script page, URL=', page.url());
    await page.screenshot({path: 'debug-script-page.png'});

    // 5) Go to the "new version" form using full slug
    await page.goto(
        `https://greasyfork.org/en/scripts/${scriptSlug}/versions/new`,
        {waitUntil: 'networkidle'},
    );
    console.log('▶ at versions/new, URL=', page.url());
    await page.screenshot({path: 'debug-versions-new.png'});

    // 6) Wait for the file input to appear
    await page
        .waitForSelector('input[type="file"]', {timeout: 30000})
        .catch(err => {
            console.error('❌ file input never appeared:', err);
            process.exit(1);
        });
    console.log('▶ file input is present');

    // 7) Upload your updated userscript and submit
    await page.setInputFiles(
        'input[type="file"]',
        path.resolve(__dirname, 'Persian_Font_Fix_Vazir.user.js'),
    );
    await Promise.all([
        page.click('input[type="submit"][name="commit"]'),
        page.waitForNavigation({timeout: 60000}),
    ]);
    console.log('✅ upload finished, URL=', page.url());

    await browser.close();
})();
