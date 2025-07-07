// Simplified version for debugging - only essential fields
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

    // Log the form structure for debugging
    console.log('\n🔍 Form analysis:');
    $('form').each((i, form) => {
        const action = $(form).attr('action');
        const method = $(form).attr('method');
        console.log(`Form ${i}: action="${action}", method="${method}"`);

        $(form)
            .find('input, textarea, select')
            .each((j, input) => {
                const name = $(input).attr('name');
                const type = $(input).attr('type');
                const value = $(input).attr('value');
                const required = $(input).attr('required');
                console.log(
                    `  Field: name="${name}", type="${type}", value="${value}", required="${required}"`,
                );
            });
    });

    // Create minimal form - only essential fields
    const form = new FormData();
    form.append('authenticity_token', versionToken);
    form.append('script_code_file', fs.createReadStream(scriptFilePath), {
        filename: scriptFileName,
        contentType: 'text/javascript',
    });
    form.append('commit', 'Upload this version');

    console.log('\n📤 Uploading with minimal form data...');
    try {
        const uploadRes = await client.post(
            `/en/scripts/${scriptId}/versions`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    Referer: `https://greasyfork.org/en/scripts/${scriptId}/versions/new`,
                    Origin: 'https://greasyfork.org',
                },
                maxRedirects: 0,
                validateStatus: s => s === 302 || s === 200,
            },
        );

        console.log('✅ Success!');
        if (uploadRes.status === 302) {
            console.log('Redirect location:', uploadRes.headers.location);
        }
    } catch (err) {
        console.error('❌ Upload failed');

        if (err.response) {
            console.error(
                `Status: ${err.response.status} ${err.response.statusText}`,
            );

            if (err.response.status === 422) {
                // Save full response for manual inspection
                fs.writeFileSync('debug_422_response.html', err.response.data);
                console.error('Full response saved to debug_422_response.html');

                // Try to extract error messages
                const errorPage = cheerio.load(err.response.data);
                const title = errorPage('title').text();
                console.error(`Page title: ${title}`);

                // Look for error messages
                const errors = [];
                errorPage('.alert, .error, .notice, .flash').each((i, elem) => {
                    const text = errorPage(elem).text().trim();
                    if (text) errors.push(text);
                });

                if (errors.length > 0) {
                    console.error('Error messages found:');
                    errors.forEach(err => console.error(`  - ${err}`));
                }
            }
        }

        throw err;
    }
}

main().catch(console.error);
