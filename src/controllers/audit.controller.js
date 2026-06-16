// FILE: src/controllers/audit.controller.js
const Audit = require('../models/audit.model');

const auditController = {
    logs: async (req, res) => {
        try {
            const action = req.query.action || null;
            const logs = action ? await Audit.findByAction(action) : await Audit.findAll();
            const lockEvents = await Audit.findLockEvents();

            res.render('audit/logs', { logs, lockEvents });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error loading audit logs');
        }
    },

    check: (req, res) => {
        res.render('audit/check', {
            title: 'Audit System - ตรวจสอบความถูกต้องสลาก'
        });
    },

    fetchDirect: async (req, res) => {
        try {
            const { token, roundNo } = req.body;
            if (!token || !roundNo) {
                return res.status(400).json({ error: 'Missing token or roundNo' });
            }

            const digits = [6, 5, 4, 3, 2, 1];
            const pageSize = 1000;
            let allItems = [];

            // Helper to clean headers
            const headers = { 
                'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*'
            };

            // Helper to parse responses
            const parseResponse = (json) => {
                let items = [];
                let total = 0;

                if (json.items && Array.isArray(json.items)) {
                    items = json.items;
                    total = json.total || json.totalCount || json.count || items.length;
                } else if (json.data) {
                    if (Array.isArray(json.data)) {
                        items = json.data;
                        total = json.total || json.totalCount || json.count || items.length;
                    } else if (json.data.items && Array.isArray(json.data.items)) {
                        items = json.data.items;
                        total = json.data.total || json.data.totalCount || json.data.count || items.length;
                    } else if (json.data.data && Array.isArray(json.data.data)) {
                        items = json.data.data;
                        total = json.data.total || json.data.totalCount || json.data.count || items.length;
                    } else if (json.data.list && Array.isArray(json.data.list)) {
                        items = json.data.list;
                        total = json.data.total || json.data.totalCount || json.data.count || items.length;
                    }
                } else if (json.list && Array.isArray(json.list)) {
                    items = json.list;
                    total = json.total || json.totalCount || json.count || items.length;
                } else if (json.rows && Array.isArray(json.rows)) {
                    items = json.rows;
                    total = json.total || json.totalCount || json.count || items.length;
                } else if (Array.isArray(json)) {
                    items = json;
                    total = items.length;
                }
                return { items, total };
            };

            // Phase 1: Fetch Page 1 of all digits in parallel
            const firstPagePromises = digits.map(async (digit) => {
                const url = `https://api.xangkham.com/report/huaydigithome?roundNo=${roundNo}&digit=${digit}&page=1&perpage=${pageSize}&xangkham=1`;
                try {
                    const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    const data = await response.json();
                    const { items, total } = parseResponse(data);
                    items.forEach(item => item._digitType = digit);
                    return { digit, items, total };
                } catch (error) {
                    console.error(`Error fetching page 1 for digit ${digit}:`, error.message);
                    return { digit, items: [], total: 0 };
                }
            });

            const firstPageResults = await Promise.all(firstPagePromises);

            // Collect all items from page 1 and prepare promises for subsequent pages
            const remainingPagePromises = [];

            for (const result of firstPageResults) {
                allItems = allItems.concat(result.items);
                
                const totalPages = Math.ceil(result.total / pageSize);
                if (totalPages > 1) {
                    for (let p = 2; p <= totalPages; p++) {
                        const url = `https://api.xangkham.com/report/huaydigithome?roundNo=${roundNo}&digit=${result.digit}&page=${p}&perpage=${pageSize}&xangkham=1`;
                        remainingPagePromises.push(
                            fetch(url, { headers, signal: AbortSignal.timeout(15000) })
                                .then(async response => {
                                    if (!response.ok) {
                                        throw new Error(`HTTP ${response.status}`);
                                    }
                                    const data = await response.json();
                                    const { items } = parseResponse(data);
                                    items.forEach(item => item._digitType = result.digit);
                                    return items;
                                })
                                .catch(error => {
                                    console.error(`Error fetching page ${p} for digit ${result.digit}:`, error.message);
                                    return [];
                                })
                        );
                    }
                }
            }

            // Phase 2: Fetch all remaining pages in parallel
            if (remainingPagePromises.length > 0) {
                const remainingResults = await Promise.all(remainingPagePromises);
                remainingResults.forEach(items => {
                    allItems = allItems.concat(items);
                });
            }

            // Map the items to clean format expected by frontend: { number, amount }
            const mappedItems = allItems.map(i => {
                let num = String(i.no || i.number || i.n || i.digit || i.num || "");
                let type = i._digitType;
                
                // Pad number with leading zeros
                let paddedNum = num;
                while (paddedNum.length < type) paddedNum = "0" + paddedNum;

                return {
                    number: paddedNum,
                    amount: i.amount || i.c || i.bet || i.total || 0
                };
            });

            return res.json({
                success: true,
                count: mappedItems.length,
                totalAmount: mappedItems.reduce((sum, item) => sum + item.amount, 0),
                items: mappedItems
            });

        } catch (error) {
            console.error('Error fetching lottery data:', error);
            return res.status(500).json({ error: 'Failed to fetch lottery data: ' + error.message });
        }
    }
};

module.exports = auditController;
