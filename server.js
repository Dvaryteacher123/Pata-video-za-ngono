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

// Routes za kusoma faili za HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// API ya Admin kuhifadhi bei kwenye Firebase
app.post('/api/admin/price', async (req, res) => {
    try {
        const { amount } = req.body;
        await db.collection('settings').doc('price').set({ amount: Number(amount) });
        res.json({ success: true, message: 'Bei imehifadhiwa vizuri' });
    } catch (error) {
        console.error('Hitilafu ya Admin:', error);
        res.status(500).json({ success: false, error: 'Imeshindwa kuhifadhi bei' });
    }
});

// API ya Malipo ikifuata mtiririko halisi wa HarakaPay API
app.post('/api/pay', async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ success: false, error: 'Tafadhali weka namba ya simu' });
    }

    try {
        // 1. Chukua bei kutoka Firebase Firestore
        const priceDoc = await db.collection('settings').doc('price').get();
        const amount = priceDoc.exists ? Number(priceDoc.data().amount) : 1000; // Default iwe 1000 kama hakuna

        // 2. Tuma ombi kwenda HarakaPay API (/api/v1/collect)
        const harakaPayUrl = 'https://harakapay.net/api/v1/collect';
        const apiKey = process.env.HARAKAPAY_API_KEY;

        const response = await axios.post(
            harakaPayUrl,
            {
                phone: phone,
                amount: amount,
                description: 'Malipo ya Bango Kubwa'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey
                }
            }
        );

        // Rudisha majibu kamili kwa frontend
        res.json(response.data);

    } catch (error) {
        console.error('Hitilafu ya Malipo HarakaPay:', error.response ? error.response.data : error.message);
        
        // Tumia ujumbe uliosahihi kutoka HarakaPay kama upo, au toa ujumbe wa jumla
        const errorMsg = error.response && error.response.data && error.response.data.message 
            ? error.response.data.message 
            : 'Imeshindwa kuunganisha na mfumo wa malipo wa HarakaPay.';

        res.status(500).json({ success: false, error: errorMsg });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server inafanya kazi kwenye port ${PORT}`));
