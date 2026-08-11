const express = require('express');
const axios = require('axios');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(express.json());

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
});
const db = admin.firestore();

// Routes za kurasa za HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// 1. API ya Kusoma Bei na Maelezo (Inatumiwa na admin.html na index.html)
app.get('/api/price', async (req, res) => {
    try {
        const priceDoc = await db.collection('settings').doc('price').get();
        if (priceDoc.exists) {
            res.json({ success: true, ...priceDoc.data() });
        } else {
            res.json({ success: false, amount: 0, description: '' });
        }
    } catch (error) {
        console.error('Hitilafu ya kusoma bei:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Hifadhi Bei na Maelezo kutoka admin panel
app.post('/api/admin/price', async (req, res) => {
    try {
        const { amount, description } = req.body;
        await db.collection('settings').doc('price').set({ 
            amount: Number(amount),
            description: description || '' 
        });
        res.json({ success: true, message: 'Bei na maelezo vimehifadhiwa vizuri' });
    } catch (error) {
        console.error('Hitilafu:', error.message);
        res.status(500).json({ success: false, error: 'Imeshindwa kuhifadhi bei' });
    }
});

// 3. Ombi la Malipo kwenda HarakaPay
app.post('/api/pay', async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ success: false, error: 'Tafadhali weka namba ya simu' });
    }

    try {
        // Chukua bei kutoka Firebase
        const priceDoc = await db.collection('settings').doc('price').get();
        const amount = priceDoc.exists ? Number(priceDoc.data().amount) : 1000;

        // Tengeneza Webhook URL kulingana na domain ya Render
        const webhookUrl = `${req.protocol}://${req.get('host')}/api/webhook`;

        const BASE_URL = 'https://harakapay.net';
        const apiKey = process.env.HARAKAPAY_API_KEY;

        const response = await axios.post(
            `${BASE_URL}/api/v1/collect`,
            {
                phone: phone,
                amount: amount,
                description: 'Malipo ya huduma',
                webhook_url: webhookUrl
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey
                }
            }
        );

        res.json(response.data);

    } catch (error) {
        const actualError = error.response ? error.response.data : error.message;
        console.error('HITILAFU YA HARAKAPAY:', actualError);

        res.status(500).json({ 
            success: false, 
            error: error.response?.data?.message || error.message 
        });
    }
});

// 4. Webhook ya kupokea majibu ya malipo kutoka HarakaPay
app.post('/api/webhook', (req, res) => {
    const paymentData = req.body;
    console.log('Webhook imepokea data:', paymentData);

    if (paymentData.status === 'completed') {
        console.log(`Malipo ya oda ${paymentData.order_id} yamekamilika kwa mafanikio!`);
    }

    res.status(200).send('Webhook imepokelewa');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server inafanya kazi kwenye port ${PORT}`));

