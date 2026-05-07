const axios = require('axios');
const fs = require('fs');
const Expense = require('../models/expense.model');

// Render the main reconciliation page
exports.index = async (req, res) => {
    try {
        res.render('reconciliation/index', {
            title: 'Account Reconciliation',
            results: null,
            error: null
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading page');
    }
};

// Process the uploaded image and perform cross-check
exports.processImage = async (req, res) => {
    try {
        if (!req.files || !req.files.receiptImage) {
            return res.render('reconciliation/index', {
                title: 'Account Reconciliation',
                results: null,
                error: 'Please upload an image file.'
            });
        }

        const targetDate = req.body.targetDate || new Date().toISOString().split('T')[0];
        const imageFile = req.files.receiptImage;
        
        // 1. Convert Image to Base64
        const base64Image = imageFile.data.toString('base64');
        
        // 2. Call CometAPI Vision
        const apiKey = process.env.COMET_API_KEY;
        const baseUrl = process.env.AI_VISION_BASE_URL || 'https://api.cometapi.com/v1';
        const model = process.env.AI_VISION_MODEL || 'gemini-3-flash';

        if (!apiKey) {
            throw new Error("COMET_API_KEY is not configured in .env");
        }

        const prompt = `
        You are an expert financial accountant. Please analyze this ledger/account summary image.
        Extract all expense categories and their corresponding amounts in LAK. Pay close attention to Thai/Lao text and any negative values or deductions.
        Also, identify if there is a 'Promotion' summary or category.
        
        Return the response ONLY as a valid JSON object with the following structure:
        {
          "date": "YYYY-MM-DD",
          "items": [
            {"category": "Name of expense", "amount_lak": 100000}
          ],
          "promotions": {
            "total_promotions_lak": 50000,
            "details": "Optional text"
          }
        }
        
        Do not include any markdown formatting. Just the raw JSON text.
        `;

        const payload = {
            model: model,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: `data:${imageFile.mimetype};base64,${base64Image}` } }
                    ]
                }
            ],
            max_tokens: 2048,
            temperature: 0.1
        };

        const response = await axios.post(`${baseUrl}/chat/completions`, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000 // 60s timeout
        });

        let content = response.data.choices[0].message.content.trim();
        if (content.startsWith('```json')) content = content.substring(7);
        if (content.startsWith('```')) content = content.substring(3);
        if (content.endsWith('```')) content = content.slice(0, -3);
        
        const imageData = JSON.parse(content.trim());

        // 3. Fetch Data from System Database
        const systemExpensesRaw = await Expense.findByDate(targetDate);
        
        // Group by category
        const systemSummary = {};
        let systemPromotions = 0;
        
        systemExpensesRaw.forEach(exp => {
            const cat = exp.category || 'Unknown';
            const amount = parseFloat(exp.amount_lak) || 0;
            
            if (cat.toUpperCase().includes('PROMOTION')) {
                systemPromotions += amount;
            } else {
                systemSummary[cat] = (systemSummary[cat] || 0) + amount;
            }
        });

        // 4. Cross-Check Logic
        const missingInSystem = [];
        const discrepancies = [];
        const matched = [];
        const systemChecked = new Set();

        const imageItems = imageData.items || [];
        
        imageItems.forEach(item => {
            const cat = item.category || 'Unknown';
            const amount = parseFloat(item.amount_lak) || 0;
            
            let matchedSysCat = null;
            for (const sysCat of Object.keys(systemSummary)) {
                if (sysCat.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(sysCat.toLowerCase())) {
                    matchedSysCat = sysCat;
                    break;
                }
            }

            if (matchedSysCat) {
                systemChecked.add(matchedSysCat);
                const sysAmount = systemSummary[matchedSysCat];
                const diff = amount - sysAmount;
                
                if (Math.abs(diff) > 0.01) {
                    discrepancies.push({ category: cat, image_amount: amount, system_amount: sysAmount, difference: diff });
                } else {
                    matched.push({ category: cat, amount: amount });
                }
            } else {
                missingInSystem.push({ category: cat, amount: amount });
            }
        });

        const missingInImage = [];
        for (const [sysCat, sysAmount] of Object.entries(systemSummary)) {
            if (!systemChecked.has(sysCat)) {
                missingInImage.push({ category: sysCat, system_amount: sysAmount });
            }
        }

        const imgPromoTotal = parseFloat(imageData.promotions?.total_promotions_lak || 0);
        const promoDiff = imgPromoTotal - systemPromotions;

        const results = {
            targetDate,
            missingInSystem,
            missingInImage,
            discrepancies,
            matched,
            promotions: {
                image_total: imgPromoTotal,
                system_total: systemPromotions,
                difference: promoDiff,
                needs_cross_day_check: promoDiff > 0
            }
        };

        res.render('reconciliation/index', {
            title: 'Account Reconciliation Results',
            results: results,
            error: null
        });

    } catch (error) {
        console.error('Reconciliation Error:', error);
        res.render('reconciliation/index', {
            title: 'Account Reconciliation',
            results: null,
            error: 'Failed to process image: ' + error.message
        });
    }
};
