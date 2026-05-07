const https = require('https');
require('dotenv').config();
const dns = require('dns');

// Fix for ENOTFOUND on some Windows machines / Node versions
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const lineService = {
    /**
     * Send a push message using LINE Messaging API
     * @param {string} text - The message text to send
     */
    sendNotify: async (text) => {
        try {
            // Hardcoded fallback for immediate testing
            const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || 'FsBhLUvTDHWXreAFx/4mkShDOArAdvOQZq35XGeLX3+DlsXC+/3Wy3d769cKAbYfdl5CNtZ+SCdDJOCxFhsLUSVaITHOs4TGTZwMALYDHG0G4w26EusYG99sjYgIeGDvwy0GiGbQU6M1DX68VA0LWgdB04t89/1O/w1cDnyilFU=';
            const userId = process.env.LINE_USER_ID || 'Uc5a30d090e731f5a2f262c283b50fc4b';

            if (!token) {
                console.warn('⚠️ LINE_CHANNEL_ACCESS_TOKEN is missing. Cannot send Line message.');
                return;
            }

            if (!userId) {
                console.warn('⚠️ LINE_USER_ID is missing. Cannot send Line message.');
                return;
            }

            const postData = JSON.stringify({
                to: userId,
                messages: [
                    {
                        type: 'text',
                        text: text
                    }
                ]
            });

            const options = {
                hostname: 'api.line.me',
                path: '/v2/bot/message/push',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            return new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    res.on('end', () => {
                        if (res.statusCode === 200 || res.statusCode === 202) { // 200 OK or 202 Accepted
                            console.log('✅ Line Message Sent:', text.substring(0, 50) + '...');
                            resolve(JSON.parse(data || '{}'));
                        } else {
                            console.warn(`⚠️ Line API Failed [${res.statusCode}]: ${data}`);
                            // Don't reject to prevent app crash, just warn
                            resolve(null);
                        }
                    });
                });

                req.on('error', (e) => {
                    if (e.code === 'ENOTFOUND') {
                        console.warn('⚠️ Line Network Error: Check Internet');
                    } else {
                        console.error('❌ Line Request Error:', e.message);
                    }
                    // Don't reject, just resolve null to keep app running
                    resolve(null);
                });

                req.write(postData);
                req.end();
            });

        } catch (error) {
            console.error('Line Service Error:', error.message);
        }
    }
};

module.exports = lineService;
