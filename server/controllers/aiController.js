// No import needed — fetch is built into Node.js v18+

// ─── System prompt for Bito ───────────────────────────────────────────────────
const buildSystemPrompt = (context = {}) => {
  const { userName, timeSlot, mood, foods } = context;

  return `You are Bito, a witty, warm, and genuinely knowledgeable food AI companion for NearBites — an Indian food delivery app. You are NOT a generic assistant. You are specifically obsessed with food.

YOUR PERSONALITY:
- You speak like a food-loving friend, not a corporate chatbot
- You are enthusiastic, fun, occasionally funny, always helpful
- You use food emojis naturally — not excessively (max 2-3 per reply)
- You give SPECIFIC dish names, not vague suggestions
- You vary your answers every time — never repeat yourself
- You sound natural when spoken aloud — avoid symbols like *, #, or markdown formatting
- Use short sentences. Speak conversationally. Like a friend texting you food advice.

YOUR KNOWLEDGE BASE (use this):
- Indian cuisine: Biryani, Dal Makhani, Butter Chicken, Paneer Tikka, Chole Bhature, Masala Dosa, Vada Pav, Pav Bhaji, Samosa Chaat, Khichdi, Rajma, Idli, Uttapam, Roti, Naan, Paratha
- Global cuisine: Pizza, Pasta, Burger, Sushi, Ramen, Tacos, Shawarma, Hummus, Falafel, Pad Thai
- Street food: Pani Puri, Bhel Puri, Aloo Tikki, Kathi Roll, Frankie
- Desserts: Gulab Jamun, Rasgulla, Kheer, Halwa, Jalebi, Gajar Halwa, Kulfi

TIME-BASED SUGGESTIONS:
- breakfast (5-11am): Idli Sambar, Poha, Upma, Paratha, Eggs, Oats, Smoothie bowl
- lunch (11am-3pm): Full meals — Thali, Biryani, Dal Rice, Rajma Chawal, Chole
- snacks (3-6pm): Samosa, Chai, Vada Pav, Biscuits, Maggi, Sandwich
- dinner (6-10pm): Butter Chicken, Paneer dishes, Pasta, Pizza, Biryani, Dal Tadka
- latenight (10pm+): Maggi, Grilled Sandwich, Leftover rice, Quick noodles

CURRENT CONTEXT:
- User name: ${userName || "foodie"}
- Current time slot: ${timeSlot || "dinner"}
- User mood: ${mood || "not specified"}
- Foods they like: ${foods?.join(", ") || "not specified"}

RULES:
1. Keep responses under 80 words
2. Always be specific — name actual dishes
3. Never say you are Gemini, Claude, or mention Google or Anthropic
4. Never give the same suggestion twice in a conversation — rotate through options
5. If asked about deals/offers, say "Check the Flash Offers section on your home screen!"
6. If asked about delivery time, say "Check the restaurant card for live ETAs!"
7. Be conversational — ask follow-up questions sometimes
8. React to context: if mood is sad, suggest comfort food; if healthy, suggest light options
9. Occasionally add a food fun fact to make replies interesting
10. Use the rupee symbol for Indian prices if you mention them
11. IMPORTANT: Write in plain conversational text only. No bullet points, no bold, no markdown. Responses must sound great when read aloud.`;
};

// ─── Fallback reply pools ─────────────────────────────────────────────────────
const FALLBACK_POOL = {
  breakfast: [
    "Start your morning right with Masala Dosa — crispy, light, and absolutely hits different with coconut chutney! ☀️",
    "Poha with a cutting chai is the most underrated breakfast combo. Try it from a good spot near you! 🍵",
    "Egg Paratha with pickle — simple, filling, and gives you energy for the whole morning 🍳",
    "Idli with sambar and coconut chutney — South India's gift to mornings everywhere. Light but satisfying!",
  ],
  lunch: [
    "Dal Makhani with butter naan? Pure comfort on a plate. Your afternoon just got better 🍛",
    "A proper Thali covers all bases — dal, sabzi, roti, rice, pickle, and papad. Can't beat it for lunch!",
    "Rajma Chawal is the ultimate weekday lunch. Creamy rajma, steamed rice, a dollop of ghee... perfection 🍚",
    "Chole Bhature if you're feeling indulgent, or a simple Dal Rice if you want something lighter. Both win!",
  ],
  snacks: [
    "3pm calling for Samosa Chaat? That's your body being very smart 🥟",
    "Vada Pav plus cutting chai is the snack combo that carries millions of Indians through their afternoons!",
    "Maggi with extra veggies and a fried egg on top — the 4pm snack that hits different every time 🍜",
    "Pani Puri is the answer to every 4pm crisis. Spicy, tangy, and gone in 30 seconds!",
  ],
  dinner: [
    "Butter Chicken with Garlic Naan tonight — the combo that has never once disappointed anyone, ever 🍗",
    "Paneer Tikka Masala with jeera rice. Restaurant-quality dinner. Chef's kiss 🧀",
    "Biryani for dinner is always the right answer. Go for Dum Biryani if you can find it nearby! 🍛",
    "Dal Tadka with roti and a side of raita — simple, home-style, and genuinely soul-satisfying!",
  ],
  latenight: [
    "At this hour? Maggi is calling your name. 2 minutes to happiness 🍜",
    "Grilled Cheese Sandwich with ketchup — the midnight snack you didn't know you needed tonight",
    "Late night Biryani from a 24/7 place hits completely differently. Worth every extra rupee 🌙",
    "Instant noodles with a fried egg and hot sauce. The universal language of midnight hunger!",
  ],
  healthy: [
    "Grilled Paneer Salad — high protein, light on calories, actually delicious if done right 🥗",
    "Dal Soup with a small bowl of rice. Simple, nutritious, and your gut will thank you 💪",
    "Sprout Bhel or a fresh Fruit Bowl — snacking healthy doesn't have to be boring!",
    "Tandoori Chicken (no butter) with a green salad — the cleanest version of delicious!",
  ],
  comfort: [
    "Dal Khichdi with ghee is what your soul ordered 🍚",
    "Gulab Jamun or Kheer for dessert — Indian sweets have a special way of making everything okay 🍮",
    "Chole Bhature — indulgent, warm, and basically a hug in food form ❤️",
    "Gajar Halwa on a hard day hits differently than anything else. Try it!",
  ],
  general: [
    "When in doubt, Biryani. Always Biryani. It's never the wrong answer 🍛",
    "Your cravings are valid. Scroll the discover section — something will call out to you!",
    "Use the Spin Wheel on the home screen to let fate decide your next meal! 🎰",
    "Check out what's trending near you — the home screen shows real-time popular orders in your area!",
    "Have you tried the Mood Matcher on the home screen? It picks dishes based on exactly how you're feeling!",
  ],
};

const getRandomFallback = (timeSlot, mood) => {
  let pool;
  if (mood === "Healthy" || mood === "healthy") pool = FALLBACK_POOL.healthy;
  else if (mood === "Comfort" || mood === "sad") pool = FALLBACK_POOL.comfort;
  else pool = FALLBACK_POOL[timeSlot] || FALLBACK_POOL.general;
  return pool[Math.floor(Math.random() * pool.length)];
};

// ─── Intent detection ─────────────────────────────────────────────────────────
const detectIntent = (message) => {
  const msg = message.toLowerCase();
  if (msg.includes("healthy") || msg.includes("diet") || msg.includes("light") || msg.includes("calories") || msg.includes("weight")) return "healthy";
  if (msg.includes("comfort") || msg.includes("sad") || msg.includes("upset") || msg.includes("stressed")) return "comfort";
  if (msg.includes("hungry") || msg.includes("starving") || msg.includes("famished")) return "hungry";
  if (msg.includes("quick") || msg.includes("fast") || msg.includes("2 min") || msg.includes("instant")) return "quick";
  if (msg.includes("cheap") || msg.includes("budget") || msg.includes("affordable")) return "budget";
  if (msg.includes("spicy") || msg.includes("hot") || msg.includes("chilli")) return "spicy";
  if (msg.includes("sweet") || msg.includes("dessert") || msg.includes("mithai")) return "dessert";
  if (msg.includes(" veg") || msg.includes("vegetarian") || msg.includes("no meat")) return "veg";
  if (msg.includes("protein") || msg.includes("gym") || msg.includes("workout") || msg.includes("muscle")) return "protein";
  return null;
};

const INTENT_RESPONSES = {
  healthy: [
    "For healthy eating, try Moong Dal Soup with a side salad — protein-packed and under 250 calories 🥗",
    "Grilled Tandoori Chicken or Paneer Tikka (without extra butter) is the gym-friendly option! 💪",
    "Sprout Bhel or a fresh Fruit Bowl — snacking healthy doesn't have to be boring or bland!",
    "Dal Palak (spinach lentils) with 1 roti — under 300 calories, loaded with iron and protein 🌱",
  ],
  comfort: [
    "You need Dal Khichdi with a generous dollop of ghee. It's what your soul ordered today 🍚",
    "Gajar Halwa or Kheer — Indian sweets have a magical way of making everything feel okay again 🍮",
    "Butter Chicken with extra naan. Sometimes indulgence IS the self-care ❤️",
    "Chole Bhature — warm, hearty, indulgent. Basically a hug served on a plate!",
  ],
  hungry: [
    "You're HUNGRY? No messing around — Chicken Biryani, large portion, NOW. Nothing hits harder 🍛",
    "When seriously hungry: full Thali. Dal, sabzi, roti, rice, pickle, papad. The whole deal!",
    "Full stomach emergency? Rajma Chawal, large bowl, extra ghee. Filling and absolutely delicious!",
    "Chole Bhature — two massive bhature will sort out even the most intense hunger. Guaranteed!",
  ],
  quick: [
    "For speed: Maggi (2 min), or order a Dosa — they're made fresh and arrive faster than you think! 🍜",
    "Vada Pav is literally the fastest street food. Order it, it's ready before you decide anything else!",
    "Quick wrap or Kathi Roll — most places make these in under 8 minutes. Order it!",
    "Sandwich or a Frankie — fast, filling, and most delivery joints have them ready in minutes!",
  ],
  budget: [
    "Budget picks: Rajma Chawal (around ₹80-120), Egg Rice (₹60-80), or a Veg Thali (₹100-150) 💰",
    "Dosa variants are always great value — Masala Dosa fills you up for under ₹100 in most places!",
    "Chole Rice or Dal Makhani with roti — under ₹150 and genuinely satisfying. Check local spots!",
    "Poha or Upma from local places — delicious, filling, and usually under ₹60. Unbeatable value!",
  ],
  spicy: [
    "For spice lovers: Chicken Vindaloo or Andhra Chilli Chicken. Your mouth will be on fire but so happy! 🌶️",
    "Schezwan Fried Rice with extra Schezwan sauce — the Indo-Chinese spicy fix you need right now!",
    "Pani Puri with extra spicy pani — if you can handle it, it's the ultimate spice rush 🌶️",
    "Mirchi Ka Salan from a Hyderabadi place — green chillies in peanut gravy. Spice legends only!",
  ],
  dessert: [
    "Gulab Jamun is the GOAT of Indian sweets. Warm, syrupy, soft — order 2, trust the process 🍮",
    "Gajar Halwa in winters, Mango Kulfi in summers — seasonal desserts hit completely different!",
    "Rasmalai if you want something light, Jalebi if you want something indulgent. Both are correct!",
    "Chocolate Lava Cake from any good bakery nearby — sometimes you just need that molten centre!",
  ],
  veg: [
    "Paneer Butter Masala with Garlic Naan = perfect vegetarian dinner. Rich, creamy, satisfying 🧀",
    "Dal Makhani is technically veg but tastes like it shouldn't be — absolute masterpiece of Indian cooking!",
    "Aloo Gobi or Palak Paneer with roti — simple, home-style veg food at its absolute best 🥦",
    "Mushroom Masala with butter naan — criminally underrated veg option that beats most meat dishes!",
  ],
  protein: [
    "Egg Bhurji (spiced scrambled eggs) with multigrain roti — high protein, incredibly tasty 💪",
    "Tandoori Chicken with no sauce, plus a dal soup on the side — gym meal that actually tastes amazing!",
    "Paneer Tikka or Grilled Fish Tikka — protein-packed, low carb, restaurant quality fuel 🏋️",
    "Chole (chickpeas) are 15g protein per serving! Chole Rice or Chole Kulche for a post-workout meal!",
  ],
};

const getIntentResponse = (intent) => {
  if (!intent || !INTENT_RESPONSES[intent]) return null;
  const pool = INTENT_RESPONSES[intent];
  return pool[Math.floor(Math.random() * pool.length)];
};

// ─── Build Gemini conversation history ───────────────────────────────────────
const buildGeminiHistory = (history = []) => {
  const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
  const geminiHistory = [];

  for (const h of recentHistory) {
    const role = h.role === "user" ? "user" : h.role === "assistant" ? "model" : null;
    const content = String(h.content || h.text || "").trim();
    if (role && content) {
      geminiHistory.push({
        role,
        parts: [{ text: content }],
      });
    }
  }

  return geminiHistory;
};

// ─── POST /api/v1/ai/chat ─────────────────────────────────────────────────────
export const aiChat = async (req, res) => {
  try {
    const { message, context = {}, history = [] } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ success: false, message: "message is required" });
    }

    const { timeSlot, mood } = context;

    // ── Try Gemini API ──────────────────────────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;

    if (apiKey) {
      try {
        const systemPrompt = buildSystemPrompt(context);
        const geminiHistory = buildGeminiHistory(history);

        // Gemini API endpoint (gemini-1.5-flash is free tier)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const requestBody = {
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            ...geminiHistory,
            {
              role: "user",
              parts: [{ text: message.trim() }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 250,
            temperature: 0.9,       // Higher = more varied responses each time
            topP: 0.95,
            topK: 40,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          ],
        };

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const data = await response.json();

          // Extract text from Gemini response
          const reply = data?.candidates?.[0]?.content?.parts
            ?.filter((p) => p.text)
            ?.map((p) => p.text)
            ?.join("")
            ?.trim();

          if (reply) {
            // Clean up any markdown that slipped through (for clean voice output)
            const cleanReply = reply
              .replace(/\*\*(.*?)\*\*/g, "$1")   // remove bold
              .replace(/\*(.*?)\*/g, "$1")         // remove italic
              .replace(/#{1,6}\s/g, "")            // remove headings
              .replace(/^\s*[-•]\s/gm, "")         // remove bullet points
              .trim();

            return res.json({ success: true, data: { reply: cleanReply } });
          }
        } else {
          const errText = await response.text().catch(() => "");
          console.error(`Gemini API ${response.status}:`, errText);
        }
      } catch (apiErr) {
        console.error("Gemini fetch failed:", apiErr.message);
      }
    } else {
      console.warn("⚠️  GEMINI_API_KEY not found in environment variables.");
      console.warn("    Get your free key from: https://aistudio.google.com/app/apikey");
      console.warn("    Add to .env: GEMINI_API_KEY=AIzaSy...");
    }

    // ── Smart intent-based fallback ─────────────────────────────────────────
    const intent = detectIntent(message);
    const intentReply = getIntentResponse(intent);
    if (intentReply) {
      return res.json({ success: true, data: { reply: intentReply } });
    }

    // ── Time/mood-aware fallback ────────────────────────────────────────────
    const fallback = getRandomFallback(timeSlot || "general", mood);
    return res.json({ success: true, data: { reply: fallback } });

  } catch (error) {
    console.error("aiChat error:", error.message);
    return res.json({
      success: true,
      data: {
        reply: "Had a little glitch! But honestly — Biryani is always the right answer. Order that! 🍛",
      },
    });
  }
};