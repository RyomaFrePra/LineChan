require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN;
const CHANNEL_SECRET = process.env.CHANNEL_SECRET;

app.use(bodyParser.json());

// LINE Webhookエンドポイント
app.post('/webhook', async (req, res) => {
    const events = req.body.events;
    
    // イベントがない場合は何もしない
    if (!events || events.length === 0) {
        return res.status(200).send("No events");
    }

    // イベントごとに処理
    for (const event of events) {
        if (event.type === 'message' && event.message.type === 'text') {
            await handleMessageEvent(event);
        } else if (event.type === 'postback') {
            await handlePostbackEvent(event);
        }
    }

    res.status(200).send("OK");
});

// メッセージイベントの処理
async function handleMessageEvent(event) {
    const { replyToken, message } = event;

    if (message.text === "リッチメニュー") {
        await sendRichMenu(event.source.userId);
    }
}

// Postbackイベントの処理
async function handlePostbackEvent(event) {
    const { replyToken, postback } = event;

    let replyMessage = "選択肢が不明です。";
    if (postback.data === "統括安全衛生責任者") {
        replyMessage = "仮メッセージ１";
    } else if (postback.data === "安全衛生管理者") {
        replyMessage = "仮メッセージ２";
    } else if (postback.data === "衛生管理者") {
        replyMessage = "仮メッセージ３";
    }

    await replyText(replyToken, replyMessage);
}

// リッチメニューを送信
async function sendRichMenu(userId) {
    const richMenuData = {
        size: { width: 2500, height: 1686 },
        selected: true,
        name: "richmenu",
        chatBarText: "メニューを開く",
        areas: [
            {
                bounds: { x: 0, y: 0, width: 833, height: 843 },
                action: { type: "postback", data: "統括安全衛生責任者" }
            },
            {
                bounds: { x: 833, y: 0, width: 833, height: 843 },
                action: { type: "postback", data: "安全衛生管理者" }
            },
            {
                bounds: { x: 1666, y: 0, width: 833, height: 843 },
                action: { type: "postback", data: "衛生管理者" }
            },
            {
                bounds: { x: 0, y: 843, width: 833, height: 843 },
                action: { type: "message", text: "ボタンD" }
            },
            {
                bounds: { x: 833, y: 843, width: 833, height: 843 },
                action: { type: "message", text: "ボタンE" }
            },
            {
                bounds: { x: 1666, y: 843, width: 833, height: 843 },
                action: { type: "message", text: "ボタンF" }
            }
        ]
    };

    try {
        const richMenuResponse = await axios.post('https://api.line.me/v2/bot/richmenu', richMenuData, {
            headers: { 
                'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        const richMenuId = richMenuResponse.data.richMenuId;

        await axios.post(`https://api.line.me/v2/bot/user/${userId}/richmenu/${richMenuId}`, {}, {
            headers: { 
                'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
            }
        });

    } catch (error) {
        console.error("リッチメニュー送信エラー:", error.response ? error.response.data : error.message);
    }
}

// テキストメッセージを返信
async function replyText(replyToken, text) {
    try {
        await axios.post('https://api.line.me/v2/bot/message/reply', {
            replyToken: replyToken,
            messages: [{ type: "text", text: text }]
        }, {
            headers: { 
                'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error("メッセージ送信エラー:", error.response ? error.response.data : error.message);
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
