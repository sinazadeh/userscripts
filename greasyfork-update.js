const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// ——— Simple flag parsing ———
const args = {};
const raw = process.argv.slice(2);
for (let i = 0; i < raw.length; i++) {
    if (raw[i].startsWith('--')) {
        const key = raw[i].slice(2);
        const val = raw[i + 1];
        args[key] = val;
        i++;
    }
}

const {script: scriptId, file: filePath, changes} = args;
if (!scriptId || !filePath) {
    console.error('Usage: --script <id> --file <path> [--changes "<text>"]');
    process.exit(1);
}

// endpoint (with trailing slash!)
const NEW_VERSION_URL = `https://greasyfork.org/en/scripts/${scriptId}/versions/new/`;

async function fetchAuthenticityToken() {
    const res = await axios.get(NEW_VERSION_URL);
    const m = res.data.match(/name="authenticity_token" value="([^"]+)"/);
    if (!m) throw new Error('Cannot find authenticity_token on page');
    return m[1];
}

async function main() {
    const token = await fetchAuthenticityToken();
    const form = new FormData();

    form.append('authenticity_token', token);
    form.append('version[script]', scriptId);

    // only append changes if passed
    if (changes) {
        form.append('version[changes]', changes);
    }

    form.append('version[file]', fs.createReadStream(path.resolve(filePath)));
    // Greasy Fork defaults
    form.append('additional_info', 'true');
    form.append('adult_content', '0');

    const headers = form.getHeaders();

    try {
        console.log(`Uploading to ${NEW_VERSION_URL}`);
        const resp = await axios.post(NEW_VERSION_URL, form, {headers});
        if (resp.status === 200) {
            console.log('✅ Upload succeeded');
        } else {
            console.error('❌ Unexpected status:', resp.status);
            process.exit(1);
        }
    } catch (error) {
        // strip cookies before logging
        if (error.config?.headers) {
            delete error.config.headers['Cookie'];
            delete error.config.headers['cookie'];
        }
        console.error('❌ Upload failed:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            headers: error.config?.headers,
        });

        if (error.response?.data) {
            fs.writeFileSync(
                'debug_corrected_422.html',
                error.response.data,
                'utf8',
            );
            console.error('📝 Wrote debug_corrected_422.html');
        }
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
