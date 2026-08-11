const express = require('express');
const axios = require('axios');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(express.json());

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.applicationDefault()
});
const db = admin.firestore();

// Routes za kufungua kurasa za HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// API ya kuhifadhi bei kutoka admin panel
app.post('/api/admin/price', async (req, res) => {
    try {
        const { amount } = req.body;
        await db.collection('settings').doc('price').set({ amount: Number(amount) });
        res.json({ success: true, message: 'Bei imehifadhiwa vizuri' });
    } catch (error) {
        console.error('Hitilafu ya Admin:', error.message);
        res.status(500).json({ success: false, error: 'Imeshindwa kuhifadhi bei' });
    }
});

// API ya Malipo kwenda HarakaPay
app.post('/api/pay', async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ success: false, error: 'Tafadhali weka namba ya simu' });
    }

    try {
        // 1. Chukua bei kutoka Firebase Firestore (kama haipo itaweka 1000 moja kwa moja)
        const priceDoc = await db.collection('settings').doc('price').get();
        const amount = priceDoc.exists ? Number(priceDoc.data().amount) : 1000;

        // 2. Tuma ombi kwenda HarakaPay
        const harakaPayUrl = 'https://harakapay.net/api/v1/collect';
        const apiKey = process.env.HARAKAPAY_API_KEY;

        const response = await axios.post(
            harakaPayUrl,
            {
                phone: phone,
                amount: amount,
                description: 'Malipo ya Bango'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey
                }
            }
        );

        // Rudisha jibu lenye mafanikio kwenda kwenye website
        res.json(response.data);

    } catch (error) {
        // Hapa ndipo itaandika sababu halisi kwenye Render Logs ukiona imekataa
        const actualError = error.response ? error.response.data : error.message;
        console.error('HITILAFU HALISI YA HARAKAPAY:', actualError);

        const errorMsg = error.response && error.response.data && error.response.data.message 
            ? error.response.data.message 
            : error.message;

        res.status(500).json({ success: false, error: errorMsg });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server inafanya kazi kwenye port ${PORT}`));
