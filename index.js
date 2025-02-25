const express = require('express');
const crypto = require('crypto'); // 署名検証用
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN;
const CHANNEL_SECRET = process.env.CHANNEL_SECRET;
const RICHMENU_IMAGE_PATH = path.join(__dirname, 'richmenu.jpg'); // 画像のパス

// 署名の検証関数
function validateSignature(req) {
    const signature = req.headers['x-line-signature'];
    const body = JSON.stringify(req.body);
    const hash = crypto.createHmac('sha256', CHANNEL_SECRET).update(body).digest('base64');
    return hash === signature;
}

// リッチメニューを作成する関数
async function createRichMenu() {
    try {
        const richMenuConfig = {
            size: { width: 2500, height: 1686 },
            selected: true,
            name: "richmenu1",
            chatBarText: "メニューを開く",

            areas: [
                { bounds: { x: 0, y: 0, width: 833, height: 833 }, action: { type: "message", text: "A", data: "A" } },
                { bounds: { x: 833, y: 0, width: 833, height: 833 }, action: { type: "message", text: "B", data: "B" } },
                { bounds: { x: 1666, y: 0, width: 833, height: 833 }, action: { type: "message", text: "C", data: "C" } },
                { bounds: { x: 0, y: 833, width: 833, height: 833 }, action: { type: "message", text: "D", data: "D" } },
                { bounds: { x: 833, y: 833, width: 833, height: 833 }, action: { type: "message", text: "E", data: "E" } },
                { bounds: { x: 1666, y: 833, width: 833, height: 833 }, action: { type: "message", text: "F", data: "F" } }
            ]
            

        };

        // リッチメニュー作成
        const richMenuResponse = await axios.post(
            'https://api.line.me/v2/bot/richmenu',
            richMenuConfig,
            { headers: { 'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' } }
        );

        const richMenuId = richMenuResponse.data.richMenuId;
        console.log("リッチメニュー作成成功:", richMenuId);

        // 画像をアップロード
        const imageBuffer = fs.readFileSync(RICHMENU_IMAGE_PATH);
        await axios.post(
            `https://api.line.me/v2/bot/richmenu/${richMenuId}/content`,
            imageBuffer,
            { headers: { 'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'image/jpeg' } }
        );
        console.log("リッチメニュー画像アップロード成功");

        // リッチメニューを全ユーザーに適用
        await axios.post(
            `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
            {},
            { headers: { 'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}` } }
        );
        console.log("リッチメニュー適用成功");

    } catch (error) {
        console.error("リッチメニュー作成エラー:", error.response?.data || error.message);
    }
}

// Webhookエンドポイント（署名検証を追加）
app.post('/webhook', async (req, res) => {
    if (!validateSignature(req)) {
        return res.status(401).send("Invalid signature");
    }

    const events = req.body.events;
    if (!events || events.length === 0) {
        return res.status(200).send("No events");
    }

    for (const event of events) {
        if (event.type === 'message' && event.message.type === 'text') {
            let replyMessage = "選択肢が不明です。";
            let messages = [];
    
            switch (event.message.text) {
                case "A":
                    messages = [{
                        type: "text",
                        text: "役職を選択してください。",
                        quickReply: {
                            items: [
                                {
                                    type: "action",
                                    action: {
                                        type: "message",
                                        label: "総括安全衛生管理者",
                                        text: "総括安全衛生管理者"
                                    }
                                },
                                {
                                    type: "action",
                                    action: {
                                        type: "message",
                                        label: "安全責任者",
                                        text: "安全責任者"
                                    }
                                },
                                {
                                    type: "action",
                                    action: {
                                        type: "message",
                                        label: "衛生管理者",
                                        text: "衛生管理者"
                                    }
                                }
                            ]
                        }
                    }];
                    break;
    
                case "総括安全衛生管理者":
                    replyMessage = "総括用のテキストを表示しています";
                    messages = [{ type: "text", text: replyMessage }];
                    break;
                case "安全責任者":
                    replyMessage = "安全責任者用のテキストを表示しています";
                    messages = [{ type: "text", text: replyMessage }];
                    break;
                case "衛生管理者":
                    replyMessage = "衛生管理者用のテキストを表示しています";
                    messages = [{ type: "text", text: replyMessage }];
                    break;
    
                default:
                    replyMessage = "無効な選択肢です。";
                    messages = [{ type: "text", text: replyMessage }];
                    break;
            }
    
            await axios.post('https://api.line.me/v2/bot/message/reply', {
                replyToken: event.replyToken,
                messages: messages
            }, { headers: { 'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' } });
    
            console.log("返信:", replyMessage);
        }
    }
    
    
    res.status(200).send("OK");
});

// サーバー起動時にリッチメニュー作成
app.listen(3000, async () => {
    console.log("Server running on port 3000");
    await createRichMenu();
});
