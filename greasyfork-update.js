// This script uses your GreasyFork `_greasyfork_session` cookie stored in GitHub Secrets
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const tough = require('tough-cookie');
const cheerio = require('cheerio');
// Import the 'wrapper' function specifically from the library
const {wrapper} = require('axios-cookiejar-support');

// Create a new cookie jar
const jar = new tough.CookieJar();

// Create a new axios instance wrapped with cookie jar support
const client = wrapper(axios.create({jar}));

// Load session cookie from environment variable
const sessionValue = process.env.GREASYFORK_SESSION;
if (!sessionValue) {
    console.error(
        '❌ GREASYFORK_SESSION not set. Please add it as a Repository Secret.',
    );
    process.exit(1);
}

// Set the `_greasyfork_session` cookie
const sessionCookie = new tough.Cookie({
    key: '_greasyfork_session',
    value: sessionValue,
    domain: 'greasyfork.org',
    path: '/',
    secure: true,
    httpOnly: true,
});
jar.setCookieSync(sessionCookie.toString(), 'https://greasyfork.org');

// Configure the HTTP client's default settings
client.defaults.baseURL = 'https://greasyfork.org';
client.defaults.withCredentials = true;
client.defaults.headers.common['User-Agent'] =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/117.0.0.0 Safari/537.36';

async function main() {
    const scriptId = '538095';

    // 1) Fetch "new version" form
    console.log('Fetching authenticity token...');
    const formPage = await client.get(`/en/scripts/${scriptId}/versions/new`);
    const $ = cheerio.load(formPage.data);
    const versionToken = $('input[name="authenticity_token"]').attr('value');
    if (!versionToken) {
        console.error(
            '❌ Failed to retrieve authenticity_token. Session may be invalid.',
        );
        process.exit(1);
    }
    console.log('✅ Authenticity token retrieved.');

    // 2) Build multipart form data
    const form = new FormData();
    form.append('authenticity_token', versionToken);
    form.append(
        'script_code_file',
        fs.createReadStream(
            path.resolve(__dirname, 'Persian_Font_Fix_Vazir.user.js'),
        ),
    );
    form.append('commit', 'Upload this version');

    // 3) POST new version
    console.log('Uploading new script version...');
    const uploadRes = await client.post(
        `/en/scripts/${scriptId}/versions`,
        form,
        {
            headers: form.getHeaders(),
            maxRedirects: 0,
            validateStatus: s => s === 302,
        },
    );

    console.log('✅ Successfully uploaded new version to GreasyFork');
}

main().catch(err => {
    // Provide more detailed error logging
    if (err.response) {
        console.error(
            'Error during GreasyFork upload: HTTP',
            err.response.status,
            err.response.statusText,
        );
        console.error('Response data:', err.response.data);
    } else {
        console.error('Error during GreasyFork upload:', err.message);
    }
    process.exit(1);
});
