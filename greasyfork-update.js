const {chromium} = require('playwright');
require('dotenv').config();
const path = require('path');

(async () => {
    const browser = await chromium.launch({headless: true});
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. Login
    await page.goto('https://greasyfork.org/en/users/sign_in');
    await page.fill('#user_email', process.env.GREASYFORK_EMAIL);
    await page.fill('#user_password', process.env.GREASYFORK_PASSWORD);
    await page.click('input[name="commit"]');
    await page.waitForNavigation();

    // 2. Go to new version page
    const scriptId = '538095-persian-font-fix-vazir';
    await page.goto(
        `https://greasyfork.org/en/scripts/${scriptId}/versions/new`,
    );

    // 3. Upload new script version
    const scriptPath = path.resolve(
        __dirname,
        'Persian_Font_Fix_Vazir.user.js',
    );
    await page.setInputFiles('input#script_code_file', scriptPath);

    // 4. Submit
    await page.click('input[name="commit"]');
    await page.waitForNavigation();

    console.log('✅ GreasyFork script updated successfully!');
    await browser.close();
})();
