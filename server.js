const express = require('express');
const axios = require('axios');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
app.use(express.json());

// Initialize Firebase Admin kwa backend yako
admin.initializeApp({
    credential: admin.credential.applicationDefault()
});
const db = admin.firestore();

// Routes kwa ajili ya kurasa zako
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// API ya Admin kubadilisha bei
app.post('/api/admin/price', async (req, res) => {
    const { amount } = req.body;
    await db.collection('settings').doc('price').set({ amount: Number(amount) });
    res.json({ success: true });
});

// API ya malipo
app.post('/api/pay', async (req, res) => {
    const { phone } = req.body;
    const priceDoc = await db.collection('settings').doc('price').get();
    const amount = priceDoc.exists ? priceDoc.data().amount : 1000;

    try {
        const response = await axios.post('https://harakapay.net/api/v1/collect', 
            { phone, amount, description: 'Malipo Bango' },
            { headers: { 'X-API-Key': process.env.HARAKAPAY_API_KEY } }
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Payment failed' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

