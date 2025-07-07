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
    const scriptFileName = 'Persian_Font_Fix_Vazir.user.js';
    const scriptFilePath = path.resolve(__dirname, scriptFileName);

    // Check if the script file exists
    if (!fs.existsSync(scriptFilePath)) {
        console.error(`❌ Script file not found: ${scriptFileName}`);
        console.error(`Looking for file at: ${scriptFilePath}`);
        process.exit(1);
    }

    console.log(`✅ Script file found: ${scriptFileName}`);

    // 1) Fetch "new version" form
    console.log('Fetching authenticity token...');
    const formPage = await client.get(`/en/scripts/${scriptId}/versions/new`);
    const $ = cheerio.load(formPage.data);

    // Get authenticity token
    const versionToken = $('input[name="authenticity_token"]').attr('value');
    if (!versionToken) {
        console.error(
            '❌ Failed to retrieve authenticity_token. Session may be invalid.',
        );
        process.exit(1);
    }
    console.log('✅ Authenticity token retrieved.');

    // Check for additional hidden form fields that might be required
    const hiddenFields = {};
    $('input[type="hidden"]').each((i, elem) => {
        const name = $(elem).attr('name');
        const value = $(elem).attr('value');
        if (name && value && name !== 'authenticity_token') {
            hiddenFields[name] = value;
            console.log(`Found hidden field: ${name} = ${value}`);
        }
    });

    // 2) Build multipart form data
    const form = new FormData();
    form.append('authenticity_token', versionToken);

    // Add any additional hidden fields
    Object.keys(hiddenFields).forEach(key => {
        form.append(key, hiddenFields[key]);
    });

    // Add the script file
    form.append('script_code_file', fs.createReadStream(scriptFilePath), {
        filename: scriptFileName,
        contentType: 'application/javascript',
    });

    // Add commit button value
    form.append('commit', 'Upload this version');

    // 3) POST new version
    console.log('Uploading new script version...');
    try {
        const uploadRes = await client.post(
            `/en/scripts/${scriptId}/versions`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    Referer: `https://greasyfork.org/en/scripts/${scriptId}/versions/new`,
                    Origin: 'https://greasyfork.org',
                },
                maxRedirects: 0,
                validateStatus: s => s === 302 || s === 200,
            },
        );

        if (uploadRes.status === 302) {
            console.log(
                '✅ Successfully uploaded new version to GreasyFork (redirected)',
            );
            console.log('Redirect location:', uploadRes.headers.location);
        } else {
            console.log('✅ Successfully uploaded new version to GreasyFork');
        }
    } catch (err) {
        if (err.response && err.response.status === 422) {
            console.error('❌ Validation error (422). Response body:');
            console.error(err.response.data);

            // Try to parse HTML for error messages
            const errorPage = cheerio.load(err.response.data);
            const errorMessages = [];
            errorPage('.alert-danger, .error, .field_with_errors').each(
                (i, elem) => {
                    const text = errorPage(elem).text().trim();
                    if (text) errorMessages.push(text);
                },
            );

            if (errorMessages.length > 0) {
                console.error('Validation errors found:');
                errorMessages.forEach(msg => console.error(`  - ${msg}`));
            }
        }
        throw err;
    }
}

main().catch(err => {
    // Provide more detailed error logging
    if (err.response) {
        console.error(
            'Error during GreasyFork upload: HTTP',
            err.response.status,
            err.response.statusText,
        );

        // Log response headers for debugging
        console.error('Response headers:', err.response.headers);

        // Only log response data if it's not too long
        if (err.response.data && err.response.data.length < 2000) {
            console.error('Response data:', err.response.data);
        } else {
            console.error('Response data too long to display');
        }
    } else {
        console.error('Error during GreasyFork upload:', err.message);
    }
    process.exit(1);
});
