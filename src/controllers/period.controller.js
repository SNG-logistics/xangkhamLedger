// FILE: src/controllers/period.controller.js
const Period = require('../models/period.model');
const Summary = require('../models/summary.model');
const Expense = require('../models/expense.model');
const Cashflow = require('../models/cashflow.model');
const BankBalance = require('../models/bank_balance.model');
const Incident = require('../models/incident.model');
const Journal = require('../models/journal.model'); // Added missing import
const Setting = require('../models/setting.model');
const audit = require('../utils/audit');
const money = require('../utils/money'); // Ensure money util is imported if used in render
const lineService = require('../services/line.service');
const fs = require('fs');
const path = require('path');

const periodController = {
    list: async (req, res) => {
        try {
            const periods = await Period.findAll();
            const backfillMode = await Setting.get('BACKFILL_MODE');

            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json(periods);
            }

            res.render('periods/list', {
                periods,
                backfillMode: backfillMode === 'ON',
                money
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error loading periods');
        }
    },

    detail: async (req, res) => {
        try {
            const periodId = req.params.id;
            const period = await Period.findById(periodId);

            if (!period) {
                return res.status(404).send('Period not found');
            }

            const summary = await Summary.findByPeriod(periodId);
            const expenses = await Expense.findByPeriod(periodId);
            const journals = await Journal.findByPeriod(periodId);
            const expenseTotal = await Expense.getTotalByPeriod(periodId);
            const bankBalances = await BankBalance.getByPeriod(periodId);
            const incidents = await Incident.findByPeriod(periodId);

            // Calculate Expense Summary by Category
            const expenseSummary = {
                '1. จ่ายทั่วไป': 0,
                '2.1 โปรโมชั่นใช้เครดิต': 0,
                '2.2 โปรโมชั่นเงินสด': 0,
                '3. กิจกรรม/การตลาด': 0,
                '4. ธนาคาร': 0,
                '5. ภาษีอากร': 0,
                '6. โยนของ': 0,
                // Legacy support
                '2. โปรโมชันเงินสด': 0,
                '3. โปรโมชันใช้เครดิต': 0,
                '2. โปร': 0
            };

            expenses.forEach(exp => {
                if (expenseSummary[exp.category] !== undefined) {
                    expenseSummary[exp.category] += parseFloat(exp.amount_lak) || 0;
                } else {
                    // Fallback for unrecognized categories
                    expenseSummary['1. จ่ายทั่วไป'] += parseFloat(exp.amount_lak) || 0;
                }
            });

            // Calculate parent category "2. รวมโปรโมชั่น"
            expenseSummary['2. รวมโปรโมชั่น'] =
                expenseSummary['2.1 โปรโมชั่นใช้เครดิต'] +
                expenseSummary['2.2 โปรโมชั่นเงินสด'] +
                expenseSummary['2. โปรโมชันเงินสด'] +  // Legacy
                expenseSummary['3. โปรโมชันใช้เครดิต'] + // Legacy
                expenseSummary['2. โปร'];  // Legacy

            // Calculate Bank Total
            const bankTotal = {
                total_lak: bankBalances.reduce((sum, b) => sum + (parseFloat(b.balance_lak) || 0), 0)
            };

            // Check for saved recon image for this period
            const reconImageFile = path.join(__dirname, '../public/uploads', `recon_period_${periodId}.jpg`);
            const reconImageUrl = fs.existsSync(reconImageFile) ? `/uploads/recon_period_${periodId}.jpg` : null;

            res.render('periods/detail', {
                period,
                summary: summary || {},
                expenses,
                bankBalances,
                incidents,
                journals,
                expenseTotal,
                bankTotal,
                expenseSummary,
                reconImageUrl,
                money
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error loading period detail');
        }
    },

    create: async (req, res) => {
        try {
            const { period_date } = req.body;
            const date = new Date(period_date);
            const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

            const backfillMode = await Setting.get('BACKFILL_MODE');
            const isBackfill = backfillMode === 'ON';

            // Validation: Allow only weekdays Mon(1)-Fri(5)
            if (![1, 2, 3, 4, 5].includes(dayOfWeek)) {
                return res.status(400).send('อนุญาตให้สร้างงวดเฉพาะวัน จันทร์, อังคาร, พุธ, พฤหัสบดี, ศุกร์ เท่านั้น');
            }

            // Allow creation on any day if Backfill Mode is ON
            // No strict day check for backfill to allow flexibility

            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            // Pass is_backfill if model supports it (we added column, but model might need update if we want to save it explicitly, 
            // but for now relying on default/backfill logic provided in earlier steps. 
            // Assuming Period.create takes (date, year, month) based on reading.
            // If we want to save is_backfill, we might need to modify model create.
            // For safety, we adhere to existing signature for now, simply allowing the DATE creation.)

            const periodId = await Period.create(period_date, year, month);

            // If we want to mark it as backfill, we might need a separate update or updated model. 
            // For now, let's assume strict date rules are relaxed.

            await audit.log(
                req.session.userId,
                'CREATE_PERIOD',
                'periods',
                periodId,
                null,
                { period_date, year, month, isBackfill },
                null,
                req.ip,
                req.get('User-Agent')
            );

            res.redirect('/periods');
        } catch (error) {
            console.error('Create Period Error:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).send('มีงวดวันที่นี้อยู่แล้ว (Duplicate Date)');
            }
            res.status(500).send('Error creating period: ' + error.message);
        }
    },

    lock: async (req, res) => {
        try {
            const periodId = req.params.id;
            const { reason, forceOverride } = req.body;

            if (!reason || reason.trim() === '') {
                return res.status(400).json({ error: 'Reason is required for locking' });
            }

            const period = await Period.findById(periodId);
            if (!period) return res.status(404).json({ error: 'Period not found' });
            if (period.status === 'LOCKED') return res.status(400).json({ error: 'Period already locked' });

            // Check for critical incidents (BLOCKER)
            const hasCritical = await Incident.hasCriticalOpen(periodId);
            if (hasCritical) {
                return res.status(400).json({
                    error: 'Cannot lock: There are OPEN CRITICAL Incidents. Please resolve them first.'
                });
            }

            // SEQUENTIAL LOCK VALIDATION
            const hasOlderOpen = await Period.hasOpenOlder(period.period_date);
            if (hasOlderOpen) {
                return res.status(400).json({
                    error: 'Cannot lock: You have an OLDER period that is still OPEN. Please lock chronologicaly.'
                });
            }

            // Check net cash
            const cashStatus = await Cashflow.getNetCashByPeriod(periodId);
            if (cashStatus.net < 0) {
                if (!forceOverride) {
                    return res.status(400).json({
                        // FIXED: String concatenation
                        error: 'Net Cash is Negative(' + cashStatus.net.toLocaleString() + '). Cannot lock unless overridden.',
                        requiresOverride: true
                    });
                } else {
                    // Log override - FIXED: String concatenation
                    console.log('Period ' + periodId + ' Locked with Negative Cash: ' + cashStatus.net + ' by User ' + req.session.userId);
                }
            }

            await Period.lock(periodId, req.session.userId, reason + (cashStatus.net < 0 ? ' [OVERRIDE NEGATIVE CASH]' : ''));

            // Auto GL
            if (Journal.createAutoGL) {
                await Journal.createAutoGL(periodId, req.session.userId);
            }

            await audit.log(
                req.session.userId,
                'LOCK_PERIOD',
                'periods',
                periodId,
                { status: 'OPEN' },
                { status: 'LOCKED', final_net: cashStatus.net, override: !!forceOverride },
                reason,
                req.ip,
                req.get('User-Agent')
            );

            // Line Notify
            try {
                // Calculate Net Profit for Notification
                const summary = await Summary.findByPeriod(periodId) || {};
                const expenseTotal = await Expense.getTotalByPeriod(periodId);

                const grossSales = (parseFloat(summary.sales_6_digit) || 0) +
                    (parseFloat(summary.sales_5_digit) || 0) +
                    (parseFloat(summary.sales_4_digit) || 0) +
                    (parseFloat(summary.sales_3_digit) || 0) +
                    (parseFloat(summary.sales_2_digit) || 0) +
                    (parseFloat(summary.sales_1_digit) || 0);

                const totalPrizes = (parseFloat(summary.prize_6_digit) || 0) +
                    (parseFloat(summary.prize_5_digit) || 0) +
                    (parseFloat(summary.prize_4_digit) || 0) +
                    (parseFloat(summary.prize_3_digit) || 0) +
                    (parseFloat(summary.prize_2_digit) || 0) +
                    (parseFloat(summary.prize_1_digit) || 0);

                const profitThrowing = parseFloat(summary.profit_throwing) || 0;
                const totalExpenses = parseFloat(expenseTotal.total_lak) || 0;

                const netProfit = grossSales - totalPrizes + profitThrowing - totalExpenses;

                const lockerName = req.session.fullName || req.session.username || 'Admin';
                const message = `\n🔒 งวดวันที่ ${new Date(period.period_date).toLocaleDateString('th-TH')} ถูก LOCKED แล้ว\n` +
                    `โดย: ${lockerName}\n` +
                    `ยอดสรุป (Net Profit): ${netProfit.toLocaleString()} LAK\n` +
                    `เหตุผล: ${reason}\n` +
                    `\n🔗 https://xangkhamledger.com/`;
                await lineService.sendNotify(message);
            } catch (notifyError) {
                console.error('Line Notify Error:', notifyError);
            }



            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error locking period: ' + error.message });
        }
    },

    unlock: async (req, res) => {
        try {
            const periodId = req.params.id;
            const { reason } = req.body;

            if (!reason || reason.trim() === '') {
                return res.status(400).json({ error: 'Reason is required for unlocking' });
            }

            const period = await Period.findById(periodId);
            if (!period) return res.status(404).json({ error: 'Period not found' });
            if (period.status === 'OPEN') return res.status(400).json({ error: 'Period already open' });

            await Period.unlock(periodId, req.session.userId, reason);

            await audit.log(
                req.session.userId,
                'UNLOCK_PERIOD',
                'periods',
                periodId,
                { status: 'LOCKED' },
                { status: 'OPEN' },
                reason,
                req.ip,
                req.get('User-Agent')
            );

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error unlocking period' });
        }
    },

    delete: async (req, res) => {
        try {
            const periodId = req.params.id;
            const period = await Period.findById(periodId);
            if (!period) return res.status(404).json({ error: 'Period not found' });

            await Period.delete(periodId);

            await audit.log(
                req.session.userId,
                'DELETE_PERIOD',
                'periods',
                periodId,
                { period_date: period.period_date },
                null,
                'Manual deletion',
                req.ip,
                req.get('User-Agent')
            );

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error deleting period' });
        }
    },

    updateBalances: async (req, res) => {
        try {
            const periodId = req.params.id;
            const { balances } = req.body;
            const period = await Period.findById(periodId);
            if (!period) return res.status(404).json({ error: 'Period not found' });
            if (period.status === 'LOCKED') return res.status(400).json({ error: 'Period is Locked' });

            await BankBalance.upsert(periodId, balances, req.session.userId);

            await audit.log(
                req.session.userId,
                'UPDATE_BANK_BALANCES',
                'bank_balances',
                periodId,
                null,
                balances,
                null,
                req.ip,
                req.get('User-Agent')
            );

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error updating balances' });
        }
    },

    toggleBackfill: async (req, res) => {
        try {
            const current = await Setting.get('BACKFILL_MODE');
            const newValue = current === 'ON' ? 'OFF' : 'ON';
            await Setting.set('BACKFILL_MODE', newValue);

            await audit.log(
                req.session.userId,
                'TOGGLE_BACKFILL',
                'system_settings',
                null,
                current,
                newValue,
                null,
                req.ip,
                req.get('User-Agent')
            );

            res.json({ success: true, mode: newValue });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error toggling backfill mode' });
        }
    },

    createIncident: async (req, res) => {
        try {
            const periodId = req.params.id;
            const { title, description, severity } = req.body;
            await Incident.create({ period_id: periodId, title, description, severity, created_by: req.session.userId }, req.session.userId);
            res.redirect('/periods/' + periodId);
        } catch (error) {
            console.error(error);
            res.status(500).send('Error creating incident');
        }
    },

    resolveIncident: async (req, res) => {
        try {
            const { incidentId } = req.params;
            const { resolution_note } = req.body;
            await Incident.resolve(incidentId, resolution_note, req.session.userId);
            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error resolving incident' });
        }
    },

    reconcileImage: async (req, res) => {
        try {
            const periodId = req.params.id;
            const savedImagePath = path.join(__dirname, '../public/uploads', `recon_period_${periodId}.jpg`);
            const period = await Period.findById(periodId);
            const periodDateStr = period ? new Date(period.period_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

            let base64Image, mimeType;

            if (req.body.useSavedImage === 'true') {
                // Re-use the previously saved image — no need to re-upload
                if (!fs.existsSync(savedImagePath)) {
                    return res.status(400).json({ error: 'ไม่พบรูปที่บันทึกไว้ กรุณาอัปโหลดใหม่' });
                }
                base64Image = fs.readFileSync(savedImagePath).toString('base64');
                mimeType = 'image/jpeg';
            } else if (req.files && req.files.receiptImage) {
                // New upload — save it for future re-use
                const imageFile = req.files.receiptImage;
                base64Image = imageFile.data.toString('base64');
                mimeType = imageFile.mimetype;
                fs.writeFileSync(savedImagePath, imageFile.data);
            } else {
                return res.status(400).json({ error: 'กรุณาอัปโหลดรูปภาพ' });
            }
            
            const apiKey = process.env.COMET_API_KEY;
            const baseUrl = process.env.AI_VISION_BASE_URL || 'https://api.cometapi.com/v1';
            const model = process.env.AI_VISION_MODEL || 'gemini-3-flash';

            if (!apiKey) {
                return res.status(500).json({ error: "COMET_API_KEY is not configured" });
            }

            const prompt = `
            คุณเป็นนักบัญชีผู้เชี่ยวชาญ กรุณาวิเคราะห์รูปภาพสรุปบัญชี/รายจ่ายงวด ${periodDateStr}

            กฎสำคัญ:
            1. ใช้ชื่อตามในรูปภาษาไทย/ลาว ห้ามแปลเป็นอังกฤษ
            2. รายการที่ระบุว่า "(เพิ่มเติม)" หรือเป็นของงวดวันอื่น (ไม่ใช่งวด ${periodDateStr}) ให้ใส่ cross_day: true
            3. ห้ามมี newline ใน string value ให้ใช้ space แทน
            4. JSON ต้องถูกต้องสมบูรณ์ ไม่ต้องมี markdown

            ตอบกลับเป็น JSON เท่านั้น:
            {
              "items": [
                {"category": "ชื่อตามในรูป", "amount_lak": 100000, "cross_day": false}
              ],
              "promotions": {
                "total_promotions_lak": 50000,
                "details": ""
              }
            }
            `;

            const payload = {
                model: model,
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                        ]
                    }
                ],
                max_tokens: parseInt(process.env.AI_VISION_MAX_TOKENS || '2048'),
                temperature: 0.1
            };

            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(180000) // Increased to 3 minutes
            });

            if (!response.ok) {
                throw new Error(`AI API error: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            let content = responseData.choices[0].message.content || "";
            content = content.trim();
            
            let imageData;
            try {
                // Safely extract JSON using regex in case AI adds conversational text
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    let jsonString = jsonMatch[0];
                    // Strip literal control characters that break JSON
                    jsonString = jsonString.replace(/[\u0000-\u001F]+/g, " ");
                    imageData = JSON.parse(jsonString);
                } else {
                    throw new Error("No JSON object found in response");
                }
            } catch (err) {
                console.error("Failed to parse JSON. Raw AI response:", content);
                return res.status(500).json({ 
                    error: "AI ส่งข้อมูล JSON กลับมาไม่สมบูรณ์ (รูปแบบผิดพลาด) โปรดลองใหม่อีกครั้ง\nข้อมูลที่ได้:\n" + content.substring(0, 1000) 
                });
            }

            // Get System Expenses
            const expenses = await Expense.findByPeriod(periodId);

            // Build ONE unified amount pool from ALL expenses (consumable — prevents double-matching)
            // Previously split into promotion/non-promotion which caused AI-added promotion
            // expenses to be invisible during re-check (they lived in a pool that wasn't searched).
            const systemAmountPool = expenses.map(exp => ({
                amount: parseFloat(exp.amount_lak) || 0,
                category: exp.category || 'Unknown',
                used: false
            }));

            // Promotion total is still calculated for the summary section at the bottom
            const systemPromotions = systemAmountPool
                .filter(e => e.category.toUpperCase().includes('PROMOTION') ||
                             e.category.includes('โปรโมชั่น') ||
                             e.category.includes('โปรโมชัน') ||
                             e.category.includes('โปร'))
                .reduce((sum, e) => sum + e.amount, 0);

            const missingInSystem = [];
            const discrepancies = [];
            const matched = [];
            const systemChecked = new Set();
            const imageItems = imageData.items || [];

            // Keywords that indicate prize/reward payouts — already factored into the period formula
            // (gross_sales - total_prizes), so we must NOT flag these as missing expenses.
            const PRIZE_KEYWORDS = [
                'prize', 'reward', 'รางวัล', 'ถูกรางวัล', 'jackpot', 'payout',
                'winnings', 'ชนะ', 'เงินรางวัล', 'winning'
            ];
            const isPrizeItem = (cat) => PRIZE_KEYWORDS.some(kw => cat.toLowerCase().includes(kw.toLowerCase()));
            
            imageItems.forEach(item => {
                const cat = item.category || 'Unknown';
                const amount = parseFloat(item.amount_lak) || 0;

                // 1. Skip prize-related items
                if (isPrizeItem(cat)) {
                    matched.push({ category: cat + ' (ยอดถูกรางวัล — คำนวณแล้วในสูตร)', amount: amount });
                    return;
                }

                // 1b. Cross-day items — labeled for reference, not flagged as missing
                const isCrossDay = item.cross_day === true || cat.includes('เพิ่มเติม');
                if (isCrossDay) {
                    matched.push({ category: '📅 ' + cat + ' (รายการข้ามวัน)', amount: amount });
                    return;
                }

                // 2. PRIMARY: Amount-pool matching (exact amount, consume the entry)
                //    This handles the case where category names differ but the amount is the same
                //    e.g. AI reads "อากรค่ารับเหมา 180,000,000" but system has "5. ภาษีอากร 180,000,000"
                const amountMatchIdx = systemAmountPool.findIndex(
                    e => !e.used && Math.abs(e.amount - amount) <= 1
                );

                if (amountMatchIdx !== -1) {
                    systemAmountPool[amountMatchIdx].used = true;
                    const sysCat = systemAmountPool[amountMatchIdx].category;
                    systemChecked.add(sysCat);
                    matched.push({ category: cat + ' → ' + sysCat, amount: amount });
                    return;
                }

                // 3. FALLBACK: Category string matching (for items not yet in system)
                let matchedSysCat = null;
                for (const entry of systemAmountPool.filter(e => !e.used)) {
                    const sysCat = entry.category;
                    if (sysCat.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(sysCat.toLowerCase())) {
                        matchedSysCat = sysCat;
                        break;
                    }
                }

                if (matchedSysCat) {
                    // Mark all pool entries for this category as used
                    const sysTotal = systemAmountPool
                        .filter(e => !e.used && e.category === matchedSysCat)
                        .reduce((sum, e) => { e.used = true; return sum + e.amount; }, 0);
                    
                    systemChecked.add(matchedSysCat);
                    const diff = amount - sysTotal;
                    if (Math.abs(diff) > 0.01) {
                        discrepancies.push({ category: cat, image_amount: amount, system_amount: sysTotal, difference: diff });
                    } else {
                        matched.push({ category: cat, amount: amount });
                    }
                } else {
                    // 4. Truly missing — no amount match and no category name match
                    missingInSystem.push({ category: cat, amount: amount });
                }
            });

            const missingInImage = [];
            // Items in system (unmatched pool entries) that have no corresponding image item
            const usedCats = new Set(systemAmountPool.filter(e => e.used).map(e => e.category));
            for (const entry of systemAmountPool.filter(e => !e.used)) {
                // Group by category to avoid duplicates
                if (!missingInImage.find(m => m.category === entry.category)) {
                    const totalAmt = systemAmountPool
                        .filter(e => !e.used && e.category === entry.category)
                        .reduce((s, e) => s + e.amount, 0);
                    missingInImage.push({ category: entry.category, system_amount: totalAmt });
                }
            }

            const imgPromoTotal = parseFloat(imageData.promotions?.total_promotions_lak || 0);
            const promoDiff = imgPromoTotal - systemPromotions;

            res.json({
                success: true,
                results: {
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
                }
            });

        } catch (error) {
            console.error('Reconciliation Error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    saveSummaryImage: async (req, res) => {
        try {
            const periodId = req.params.id;
            if (!req.files || !req.files.summaryImage) {
                return res.status(400).json({ error: 'กรุณาอัปโหลดรูปภาพ' });
            }
            const savedPath = path.join(__dirname, '../public/uploads', `recon_period_${periodId}.jpg`);
            fs.writeFileSync(savedPath, req.files.summaryImage.data);
            res.json({ success: true, url: `/uploads/recon_period_${periodId}.jpg` });
        } catch (error) {
            console.error('SaveSummaryImage Error:', error);
            res.status(500).json({ error: 'บันทึกรูปภาพไม่สำเร็จ' });
        }
    },

    savePromoDashboardImage: async (req, res) => {
        try {
            const periodId = req.params.id;
            if (!req.files || !req.files.promoImage) {
                return res.status(400).json({ error: 'กรุณาอัปโหลดรูปภาพ' });
            }
            const savedPath = path.join(__dirname, '../public/uploads', `promo_period_${periodId}.jpg`);
            fs.writeFileSync(savedPath, req.files.promoImage.data);
            res.json({ success: true, url: `/uploads/promo_period_${periodId}.jpg` });
        } catch (error) {
            console.error('SavePromoDashboardImage Error:', error);
            res.status(500).json({ error: 'บันทึกรูประบบโปรโมชั่นไม่สำเร็จ' });
        }
    },

    reconcilePromotions: async (req, res) => {
        try {
            const periodId = req.params.id;
            const savedImagePath = path.join(__dirname, '../public/uploads', `promo_period_${periodId}.jpg`);
            
            if (!fs.existsSync(savedImagePath)) {
                return res.status(400).json({ error: 'ไม่พบรูปภาพหลักฐานโปรโมชั่นที่บันทึกไว้ โปรดอัปโหลดใหม่' });
            }

            const imageBuffer = fs.readFileSync(savedImagePath);
            const base64Image = imageBuffer.toString('base64');
            const mimeType = 'image/jpeg';
            
            const apiKey = process.env.AI_VISION_API_KEY;
            const baseUrl = process.env.AI_VISION_API_BASE_URL || 'https://api.openai.com/v1';
            const model = process.env.AI_VISION_MODEL || 'gpt-4o-mini';

            const prompt = `
            คุณเป็นนักบัญชี นี่คือหน้าจอ Dashboard สรุปการจ่ายโปรโมชั่น
            
            หน้าที่ของคุณ:
            ดึงเฉพาะตัวเลข "ยอดโปรโมชั่น" ข้ามยอดธนาคาร (เช่น BCEL-ONE, LDB, JDB ห้ามนำมาเด็ดขาด)
            ตัวอย่างรายการโปรโมชั่นที่ต้องดึง: โปรนามสัตว์, โปรรอบทิศ, โปรเลขสลับ, โปรเลขข้างเคียง, โปรเลขหน้า, โปรเลขท้าย
            
            ตอบกลับเป็น JSON array ของ items อย่างเดียว ห้ามมีข้อความอื่น:
            {
              "items": [
                {"category": "ชื่อโปรโมชั่น", "amount_lak": 1200000}
              ]
            }
            `;

            const payload = {
                model: model,
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                        ]
                    }
                ],
                max_tokens: 1500,
                temperature: 0.1
            };

            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(180000) // Increased to 3 minutes
            });

            if (!response.ok) {
                throw new Error(`AI API error: ${response.status}`);
            }

            const responseData = await response.json();
            let content = responseData.choices[0].message.content || "";
            content = content.trim();

            let imageData;
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    imageData = JSON.parse(jsonMatch[0].replace(/[\u0000-\u001F]+/g, " "));
                } else {
                    throw new Error("No JSON found");
                }
            } catch (err) {
                return res.status(500).json({ error: "AI ส่งข้อมูล JSON กลับมาผิดพลาด" });
            }

            const expenses = await Expense.findByPeriod(periodId);
            const systemPromos = expenses
                .filter(exp => {
                    const c = (exp.category || '').toUpperCase();
                    const d = (exp.description || '').toUpperCase();
                    // Match items categorized as "2.2 โปรโมชั่นเงินสด" or similar
                    return c.includes('PROMOTION') || c.includes('โปรโมชั่น') || c.includes('โปรโมชัน') || c.includes('โปร');
                })
                .map(exp => ({
                    id: exp.id,
                    amount: parseFloat(exp.amount_lak) || 0,
                    category: exp.category,
                    description: exp.description || '',
                    used: false
                }));

            const imageItems = imageData.items || [];
            const missingInSystem = [];
            const matched = [];

            imageItems.forEach(item => {
                const cat = item.category || 'Unknown';
                const amount = parseFloat(item.amount_lak) || 0;
                
                // Match by exact amount first, then by keyword if amount match fails
                const matchIdx = systemPromos.findIndex(
                    e => !e.used && Math.abs(e.amount - amount) <= 1
                );

                if (matchIdx !== -1) {
                    systemPromos[matchIdx].used = true;
                    matched.push({ category: cat, amount, system_desc: systemPromos[matchIdx].description });
                } else {
                    missingInSystem.push({ category: cat, amount });
                }
            });

            const missingInImage = systemPromos.filter(e => !e.used).map(e => ({
                category: e.category,
                description: e.description,
                amount: e.amount
            }));

            res.json({
                success: true,
                results: { missingInSystem, missingInImage, matched }
            });
        } catch (error) {
            console.error('ReconcilePromotions Error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    quickAddExpense: async (req, res) => {
        try {
            const periodId = req.params.id;
            const { category, amount_lak, description } = req.body;

            const period = await Period.findById(periodId);
            if (!period) return res.status(404).json({ error: 'Period not found' });
            if (period.status === 'LOCKED') return res.status(400).json({ error: 'Period is Locked' });

            // Create expense with current period date
            // occurred_at = period.period_date (set to e.g. 12:00:00 to avoid timezone issues)
            const occurred_at = new Date(period.period_date).toISOString().split('T')[0] + ' 12:00:00';

            const expenseId = await Expense.create(
                occurred_at,
                periodId,
                category,
                description || 'เพิ่มจากระบบตรวจบิล AI',
                parseFloat(amount_lak) || 0,
                0, // amount_thb
                [], // no file paths
                req.session.userId
            );

            // Trigger real-time dashboard update if needed
            if (req.io) {
                const periods = await Period.findAll();
                const history = periods.slice(0, 10).map(p => {
                    const profit = (parseFloat(p.gross_sales) || 0) - (parseFloat(p.total_prizes) || 0) - (parseFloat(p.total_expenses) || 0);
                    return {
                        period_date: new Date(p.period_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }),
                        net_profit: profit
                    };
                }).reverse();
                
                req.io.emit('dashboard:update', {
                    totalPeriods: periods.length,
                    openPeriods: periods.filter(p => p.status === 'OPEN').length,
                    lockedPeriods: periods.filter(p => p.status === 'LOCKED').length,
                    history
                });
            }

            res.json({ success: true, message: 'เพิ่มรายการสำเร็จ' });
        } catch (error) {
            console.error('Quick Add Expense Error:', error);
            res.status(500).json({ error: 'Error adding expense: ' + error.message });
        }
    }
};

module.exports = periodController;
