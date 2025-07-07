const {chromium} = require('playwright');
require('dotenv').config();
const path = require('path');

(async () => {
    const browser = await chromium.launch({headless: true});
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1) Log in
    await page.goto('https://greasyfork.org/en/users/sign_in');
    await page.fill('#user_email', process.env.GREASYFORK_EMAIL);
    await page.fill('#user_password', process.env.GREASYFORK_PASSWORD);
    await Promise.all([
        page.click('input[name="commit"]'),
        page.waitForNavigation({timeout: 60000}),
    ]);

    // 2) Navigate to the "new version" form
    const scriptId = '538095'; // ← numeric-only ID
    await page.goto(
        `https://greasyfork.org/en/scripts/${scriptId}/versions/new`,
    );

    // 3) Wait for the file-upload input to appear
    await page.waitForSelector('input[type="file"]', {timeout: 60000});

    // 4) Upload your userscript
    const scriptPath = path.resolve(
        __dirname,
        'Persian_Font_Fix_Vazir.user.js',
    );
    await page.setInputFiles('input[type="file"]', scriptPath);

    // 5) Submit the form and wait
    await Promise.all([
        page.click('input[name="commit"]'),
        page.waitForNavigation({timeout: 60000}),
    ]);

    console.log('✅ GreasyFork script updated successfully!');
    await browser.close();
})();
