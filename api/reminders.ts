export default async function handler(req, res) {
    try {
      const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL as string; // your /exec url
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN as string;
  
      if (!APPS_SCRIPT_URL || !TELEGRAM_BOT_TOKEN) {
        return res.status(500).json({ ok:false, error:"Missing env vars" });
      }
  
      // 1) Poll due trades
      const pollUrl = `${APPS_SCRIPT_URL}?mode=poll_open_trades`;
      const poll = await fetch(pollUrl);
      const data = await poll.json();
      if (!data.ok) return res.status(500).json({ ok:false, error:"Poll failed" });
  
      const due = data.due || [];
      if (due.length === 0) return res.status(200).json({ ok: true, sent: 0 });
  
      // 2) Send messages and mark sent
      let sent = 0;
      for (const item of due) {
        const text = item.reminder_message || 'BOOK BOOK BOOK. Respect risk.';
        const chatId = item.chat_id;
        if (!chatId) continue;
  
        const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({ chat_id: chatId, text })
        });
  
        if (tgRes.ok) {
          sent++;
          await fetch(APPS_SCRIPT_URL + '?mode=mark_sent', {
            method: "POST",
            headers: { "Content-Type":"application/json" },
            body: JSON.stringify({ row: item.row, frequency_minutes: item.frequency_minutes })
          });
        }
      }
  
      return res.status(200).json({ ok: true, sent });
    } catch (e:any) {
      return res.status(500).json({ ok:false, error: e.message });
    }
  }
  