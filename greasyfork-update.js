// Corrected version based on form analysis
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const tough = require('tough-cookie');
const cheerio = require('cheerio');
const {wrapper} = require('axios-cookiejar-support');

const jar = new tough.CookieJar();
const client = wrapper(axios.create({jar}));

const sessionValue = process.env.GREASYFORK_SESSION;
if (!sessionValue) {
    console.error('❌ GREASYFORK_SESSION not set.');
    process.exit(1);
}

const sessionCookie = new tough.Cookie({
    key: '_greasyfork_session',
    value: sessionValue,
    domain: 'greasyfork.org',
    path: '/',
    secure: true,
    httpOnly: true,
});
jar.setCookieSync(sessionCookie.toString(), 'https://greasyfork.org');

client.defaults.baseURL = 'https://greasyfork.org';
client.defaults.withCredentials = true;
client.defaults.headers.common['User-Agent'] =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36';

async function main() {
    const scriptId = '538095';
    const scriptFileName = 'Persian_Font_Fix_Vazir.user.js';
    const scriptFilePath = path.resolve(__dirname, scriptFileName);

    if (!fs.existsSync(scriptFilePath)) {
        console.error(`❌ Script file not found: ${scriptFileName}`);
        process.exit(1);
    }

    console.log('✅ Script file found');

    // Get the form page
    console.log('Fetching form page...');
    const formPage = await client.get(`/en/scripts/${scriptId}/versions/new`);
    const $ = cheerio.load(formPage.data);

    const versionToken = $('input[name="authenticity_token"]').attr('value');
    if (!versionToken) {
        console.error('❌ Failed to retrieve authenticity_token');
        process.exit(1);
    }

    console.log('✅ Authenticity token retrieved');

    // Get default values for required fields
    const additionalInfoDefault = $(
        'input[name="script_version[additional_info][0][attribute_default]"]',
    ).attr('value');
    const adultContentDefault = $(
        'input[name="script[adult_content_self_report]"][type="hidden"]',
    ).attr('value');

    console.log('📝 Required field defaults:');
    console.log(`  - additional_info default: ${additionalInfoDefault}`);
    console.log(`  - adult_content default: ${adultContentDefault}`);

    // Create form with all required fields
    const form = new FormData();

    // Authentication
    form.append('authenticity_token', versionToken);

    // File upload - use the correct field name
    form.append('code_upload', fs.createReadStream(scriptFilePath), {
        filename: scriptFileName,
        contentType: 'text/javascript',
    });

    // Required hidden fields
    form.append(
        'script_version[additional_info][0][attribute_default]',
        additionalInfoDefault || 'true',
    );
    form.append(
        'script[adult_content_self_report]',
        adultContentDefault || '0',
    );

    // Required radio buttons - set defaults
    form.append('script_version[additional_info][0][value_markup]', 'markdown');
    form.append('script_version[changelog_markup]', 'markdown');
    form.append('script[script_type]', '1'); // Userscript

    // Optional fields that might be required
    form.append('script_version[attachments][]', ''); // Empty attachments

    // Submit button
    form.append('commit', 'Post new version');

    console.log('📤 Uploading with corrected form data...');
    try {
        const uploadRes = await client.post(
            `/en/scripts/${scriptId}/versions`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    Referer: `https://greasyfork.org/en/scripts/${scriptId}/versions/new`,
                    Origin: 'https://greasyfork.org',
                },
                maxRedirects: 0,
                validateStatus: s => s === 302 || s === 200,
            },
        );

        console.log('✅ Success!');
        if (uploadRes.status === 302) {
            console.log('🔄 Redirected to:', uploadRes.headers.location);
        }
    } catch (err) {
        console.error('❌ Upload failed');

        if (err.response) {
            console.error(
                `Status: ${err.response.status} ${err.response.statusText}`,
            );

            if (err.response.status === 422) {
                // Save and analyze the error response
                fs.writeFileSync('debug_corrected_422.html', err.response.data);
                console.error(
                    'Full response saved to debug_corrected_422.html',
                );

                // Extract error messages
                const errorPage = cheerio.load(err.response.data);
                const title = errorPage('title').text();
                console.error(`Page title: ${title}`);

                // Look for specific error messages
                const errorSelectors = [
                    '.alert-danger',
                    '.alert-error',
                    '.error',
                    '.field_with_errors',
                    '.help-block',
                    '.invalid-feedback',
                    '#error_explanation',
                    '.notice',
                ];

                let foundErrors = false;
                errorSelectors.forEach(selector => {
                    errorPage(selector).each((i, elem) => {
                        const text = errorPage(elem).text().trim();
                        if (text) {
                            console.error(
                                `🔍 Error found (${selector}): ${text}`,
                            );
                            foundErrors = true;
                        }
                    });
                });

                if (!foundErrors) {
                    console.error(
                        '🔍 No specific error messages found in standard locations',
                    );

                    // Check for any text containing common error keywords
                    const pageText = errorPage('body').text().toLowerCase();
                    const errorKeywords = [
                        'error',
                        'invalid',
                        'required',
                        'missing',
                        'failed',
                        'cannot',
                    ];

                    errorKeywords.forEach(keyword => {
                        if (pageText.includes(keyword)) {
                            console.error(
                                `📝 Page contains keyword: ${keyword}`,
                            );
                        }
                    });
                }
            }
        }

        throw err;
    }
}

main().catch(console.error);
