const axios = require('axios');

async function testRegister() {
    try {
        const response = await axios.post('http://localhost:4000/api/auth/register', {
            username: 'verify_test',
            email: 'verify_test@example.com',
            password: 'password123'
        });
        console.log('Register Response:', response.data);
    } catch (err) {
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', err.response.data);
        } else if (err.request) {
            console.error('No response received:', err.message);
        } else {
            console.error('Error:', err.message);
        }
    }
}

testRegister();
