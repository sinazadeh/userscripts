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

const {script: scriptId, file: filePath} = args;
if (!scriptId || !filePath) {
    console.error('Usage: --script <id> --file <path>');
    process.exit(1);
}

// Endpoints
const FORM_URL = `https://greasyfork.org/en/scripts/${scriptId}-*/versions/new`;
const POST_URL = `https://greasyfork.org/en/scripts/${scriptId}/versions`;

// Session cookie
const session = process.env.GREASYFORK_SESSION;
if (!session) {
    console.error('❌ Missing GREASYFORK_SESSION env variable');
    process.exit(1);
}
const cookieHeader = {Cookie: `_greasyfork_session=${session}`};

async function fetchAuthenticityToken() {
    const res = await axios.get(FORM_URL, {
        headers: {
            ...cookieHeader,
            'User-Agent': 'Mozilla/5.0',
            Accept: 'text/html',
            Referer: 'https://greasyfork.org/',
            Origin: 'https://greasyfork.org',
        },
    });
    const m = res.data.match(/name="authenticity_token" value="([^"]+)"/);
    if (!m) throw new Error('Cannot find authenticity_token on page');
    return m[1];
}

async function main() {
    const token = await fetchAuthenticityToken();
    const form = new FormData();

    // Bare minimum fields
    form.append('authenticity_token', token);
    form.append('version[script]', scriptId);
    form.append('code_upload', fs.createReadStream(path.resolve(filePath)));
    form.append('commit', 'Post new version');

    const headers = {
        ...form.getHeaders(),
        ...cookieHeader,
        'User-Agent': 'Mozilla/5.0',
        Accept: 'text/html',
        Referer: FORM_URL,
        Origin: 'https://greasyfork.org',
    };

    try {
        console.log(`Uploading to ${POST_URL}`);
        const resp = await axios.post(POST_URL, form, {headers});
        if (resp.status === 200) {
            console.log('✅ Upload succeeded');
        } else {
            console.error('❌ Unexpected status:', resp.status);
            process.exit(1);
        }
    } catch (error) {
        if (error.config?.headers) delete error.config.headers['Cookie'];
        console.error('❌ Upload failed:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            headers: error.config?.headers,
        });

        if (error.response?.data) {
            fs.writeFileSync('debug_upload.html', error.response.data, 'utf8');
            console.error('📝 Wrote debug_upload.html');
        }
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
