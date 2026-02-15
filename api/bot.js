const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

// O'zgaruvchilarni Vercel Environmentdan olamiz
const bot = new Telegraf(process.8590338050:AAH5-osx-g1VpgtvcUogYJE5E7H2y-f8YSMenv.);
const supabase = createClient(process.env.hjwjomkywxnijfxnrwdtL, process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqd2pvbWt5d3huaWpmeG5yd2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDc1NzEsImV4cCI6MjA4NTQyMzU3MX0.Yezqsbh0wku8svYkO4LPfibUuOhsVdSHKKqbzjahVoU);
const GROUP_ID = process.env.-1003621378351; // Natijalar tashlanadigan guruh IDsi

// Start komandasi
bot.start((ctx) => {
    ctx.reply("Assalomu alaykum. Testni boshlash uchun quyidagi tugmani bosing:", {
        reply_markup: {
            keyboard: [[{ text: "📝 Testni Boshlash", web_app: { url: process.env.WEBAPP_URL } }]],
            resize_keyboard: true
        }
    });
    // Userni bazaga qo'shish
    saveUser(ctx.from);
});

// Admin: O'qituvchi qo'shish (/add_teacher ID Limit)
bot.command('add_teacher', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return ctx.reply("Siz Admin emassiz!");
    
    const params = ctx.message.text.split(' ');
    const teacherId = params[1];
    const limit = params[2];

    if (!teacherId || !limit) return ctx.reply("Xato! Format: /add_teacher [ID] [Limit]");

    const { error } = await supabase.from('teachers').upsert({
        telegram_id: teacherId,
        test_limit: parseInt(limit),
        is_admin: false,
        created_count: 0
    });

    if (error) ctx.reply("Xatolik bo'ldi.");
    else {
        ctx.reply(`O'qituvchi qo'shildi! ID: ${teacherId}, Limit: ${limit}`);
        bot.telegram.sendMessage(GROUP_ID, `🆕 Yangi o'qituvchi qo'shildi!\nID: ${teacherId}\nLimit: ${limit}`);
    }
});

// Admin: Reklama
bot.command('broadcast', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return;
    const msg = ctx.message.text.replace('/broadcast ', '');
    // Barcha userlarga jo'natish (soddalashtirilgan, aslida queue kerak)
    const { data: users } = await supabase.from('users').select('telegram_id');
    users.forEach(u => bot.telegram.sendMessage(u.telegram_id, msg).catch(e => {}));
    ctx.reply("Xabar jo'natilmoqda...");
});

// Admin: Statistika
bot.command('stats', async (ctx) => {
    if (!await isAdmin(ctx.from.id)) return;
    const { count } = await supabase.from('results').select('*', { count: 'exact', head: true });
    ctx.reply(`Hozirgacha jami ${count} ta test yechilgan.`);
});

// Web Appdan kelgan ma'lumotlarni qabul qilish
bot.on('web_app_data', async (ctx) => {
    const data = JSON.parse(ctx.webAppData.data);
    const userId = ctx.from.id;
    const userLink = ctx.from.username ? `@${ctx.from.username}` : data.fullName;

    // 1. Test bazada borligini va aktivligini tekshirish
    const { data: testData, error } = await supabase
        .from('tests')
        .select('*')
        .eq('code', data.code)
        .eq('subject', data.subject)
        .eq('status', 'active')
        .single();

    if (!testData) {
        return ctx.reply("❌ Bunday kodli test topilmadi yoki vaqti tugagan.");
    }

    // 2. Qayta ishlashni tekshirish
    const { data: existingResult } = await supabase
        .from('results')
        .select('id')
        .eq('user_id', userId)
        .eq('test_id', testData.id)
        .single();

    if (existingResult) {
        return ctx.reply("⛔️ Siz bu testni avval yechgansiz!");
    }

    // 3. Natijani hisoblash
    let score = 0;
    let wrongAnswers = [];
    const correctKey = testData.correct_answers;
    const userAnswers = data.answers;

    for (let i = 0; i < data.count; i++) {
        let isCorrect = userAnswers[i] === correctKey[i];
        if (!isCorrect) wrongAnswers.push(i + 1);

        if (isCorrect) {
            if (data.mode === 'general') {
                score += 1;
            } else {
                if (i < 30) score += 1.1;
                else if (i < 60) score += 2.1;
                else score += 3.1;
            }
        }
    }
    score = parseFloat(score.toFixed(1));

    // 4. Natijani saqlash
    await supabase.from('results').insert({
        test_id: testData.id,
        user_id: userId,
        score: score,
        wrong_answers: wrongAnswers.join(', ')
    });

    // 5. Foydalanuvchiga javob
    ctx.reply(`✅ Test yakunlandi!\n👤 ${data.fullName}\n📚 Fan: ${data.subject}\n🔑 Kod: ${data.code}\n📈 Ball: ${score}\n❌ Xatolar: ${wrongAnswers.join(', ')}`);

    // 6. Guruhga natijani yuborish (Leaderboard logikasi murakkab, shuning uchun oddiy xabar)
    bot.telegram.sendMessage(GROUP_ID, `🏁 Yangi Natija:\n👤 ${userLink}\nFan: ${data.subject}\nKod: ${data.code}\nBall: ${score}`);
});

// Yordamchi funksiyalar
async function saveUser(user) {
    await supabase.from('users').upsert({
        telegram_id: user.id,
        username: user.username,
        full_name: `${user.first_name} ${user.last_name || ''}`
    });
}

async function isAdmin(id) {
    // Admin ID sini shu yerga yozing yoki bazadan tekshiring
    if(id == process.env.6045817037) return true; 
    const { data } = await supabase.from('teachers').select('is_admin').eq('telegram_id', id).single();
    return data?.is_admin;
}

// Vercel uchun Webhook
module.exports = async (req, res) => {
    try {
        await bot.handleUpdate(req.body);
        res.status(200).send('OK');
    } catch (e) {
        console.error(e);
        res.status(500).send('Error');
    }
};
