import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  ArrowLeft,
  Bot,
  User,
  ShoppingBag,
  RotateCcw,
  Loader2,
  Package
} from 'lucide-react';
import { requestGroq } from '../lib/groq';

const STARTER_PROMPTS = [
  "What is the price of Sol Shield SPF 50?",
  "Recommend a routine for hyperpigmentation & dark spots",
  "What cleansers are best for oily, acne-prone skin?",
  "How fast is delivery to Lagos & other Nigerian states?"
];

export default function AIChatbotEnquiry({
  products,
  currency,
  onAddToCart,
  onNavigateToStore
}) {
  const [messages, setMessages] = useState(() => {
    return [
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: "Hey, welcome! I’m **Titi** 😊 How are you doing? I can help with your skincare questions, product prices, or finding a routine that fits your skin. What’s on your mind?",
        suggestedProductIds: [] // No product cards by default until requested
      }
    ];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const formatPrice = (amount) => {
    if (currency === 'USD') {
      return `$${(amount / 1500).toFixed(2)}`;
    }
    return `₦${amount.toLocaleString()}`;
  };

  const renderFormattedContent = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={index} className="font-bold text-gold-700 bg-gold-50/60 px-1 py-0.5 rounded border border-gold-300/30">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Smart local response generator if API network is offline
  const generateLocalResponse = (query) => {
    const q = query.toLowerCase();
    const normalizedQuery = q.replace(/[^\w\s']/g, '').trim();

    if (/^(hi|hello|hey|heya|hiya|good morning|good afternoon|good evening|how are you|how far|sup)\b/.test(normalizedQuery)) {
      return {
        content: "Hey, welcome! 😊 I’m good, thanks for asking—ready to gist skincare whenever you are. How are you, and what’s on your mind?",
        suggestedProductIds: []
      };
    }

    // Check specific product match
    const matchedProducts = products.filter(p =>
      q.includes(p.name.toLowerCase()) ||
      q.includes(p.id.toLowerCase()) ||
      (p.tag && q.includes(p.tag.toLowerCase()))
    );

    // 1. Price Inquiry
    if (q.includes('price') || q.includes('cost') || q.includes('how much')) {
      if (matchedProducts.length > 0) {
        const prod = matchedProducts[0];
        return {
          content: `Good choice 😊 **${prod.name}** is **${formatPrice(prod.price)}**. Your wallet can relax; no surprise maths here!`,
          suggestedProductIds: [prod.id]
        };
      }
      return {
        content: "Which product are you eyeing? Tell me its name and I’ll get you the exact price—no need for guesswork 😊",
        suggestedProductIds: []
      };
    }

    // 2. Delivery & Shipping
    if (q.includes('delivery') || q.includes('ship') || q.includes('lagos') || q.includes('location')) {
      return {
        content: "Let’s get your goodies to you 🚚 We offer **Same-Day Lagos Delivery** (₦2,500) and **2–3 day interstate delivery** (₦3,500).",
        suggestedProductIds: []
      };
    }

    // 3. Hyperpigmentation / Dark Spots
    if (q.includes('hyperpigmentation') || q.includes('dark spot') || q.includes('discoloration') || q.includes('glow')) {
      const serum = products.find(p => p.id === 'botanical-glow-drop-serum');
      const spf = products.find(p => p.id === 'sol-shield-spf50');
      return {
        content: "Dark spots can be stubborn, but we can build a gentle routine 😊 **Botanical Glow Serum** and daily **Sol Shield SPF 50** are a good place to start; sunscreen helps stop spots from getting darker.",
        suggestedProductIds: [serum?.id, spf?.id].filter(Boolean)
      };
    }

    // 4. Cleansers / Acne / Oily Skin
    if (q.includes('cleanser') || q.includes('acne') || q.includes('oily') || q.includes('pimple') || q.includes('wash')) {
      const cleanser = products.find(p => p.id === 'salises-purifying-cleanser');
      return {
        content: "Oily-skin shine in this Naija heat? We understand 😅 **Salises Purifying Cleanser** is a lovely option for oily, acne-prone skin.",
        suggestedProductIds: [cleanser?.id].filter(Boolean)
      };
    }

    // 5. Explicit request for image / show product
    if (q.includes('image') || q.includes('picture') || q.includes('photo') || q.includes('show me') || q.includes('catalogue') || q.includes('catalog')) {
      return {
        content: "Coming right up—here are a few of our skincare favourites ✨",
        suggestedProductIds: products.slice(0, 3).map(p => p.id)
      };
    }

    // Default general answer
    if (matchedProducts.length > 0) {
      const prod = matchedProducts[0];
      return {
        content: `Ooh, **${prod.name}** 😊 It’s **${formatPrice(prod.price)}**${prod.tag ? ` and ${prod.tag.toLowerCase()}` : ''}.`,
        suggestedProductIds: [prod.id]
      };
    }

    return {
      content: "I’m listening 😊 Tell me what’s on your mind—your skin concern, a product you’re curious about, or even just a quick question. No skincare exam, I promise!",
      suggestedProductIds: []
    };
  };

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || isGenerating) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query.trim()
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputQuery('');
    setIsGenerating(true);

    const productCatalogSummary = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      category: p.category,
      tag: p.tag,
      description: p.description,
      inStock: p.inStock !== false
    }));

    const systemPrompt = `You are Titi, a warm, witty, knowledgeable skincare concierge for Lumière Botanics, a Nigerian skincare brand. Talk like a real, friendly Nigerian person—not a call-centre script, medical textbook, or sales bot. Your customer may be anywhere in Nigeria, so keep the tone welcoming and easy to understand.

Conversation style:
You are "Glow-Buddy," a witty, warm, and highly expressive Nigerian skincare expert and hype-person. 

CRITICAL BEHAVIOR RULES:
- TONALITY: Speak like a fashionable, tech-savvy Nigerian bestie. Use correct English mixed with light, popular Nigerian phrasing/slang (e.g., "my dear," "premium," "soft life," "enter eye," "chills"). Be highly empathetic but full of humor and playful banter. Use emojis organically.
- BREVITY: Keep your responses short, punchy, and conversational. Never generate long, structured corporate paragraphs or bulleted lists unless explicitly asked for a routine.
- GREETINGS: If the user says "hello" or "hi", respond with a short, high-energy, witty greeting (e.g., "Hey gorgeous! Welcome to the soft life headquarters. What are we glowing up today?"). 
- MISSING PRODUCT FALLBACK: If a user asks for a product, brand, or ingredient that is NOT in your database (like a specific lip gloss), NEVER say "I am an AI assistant" or give a dry error. Instead, playfully tease the request, tell them it's not in the vault yet, and suggest a relatable alternative or ask what skin goal they want to achieve.
- Respond to what the person actually said. If they say "hello", greet them warmly and ask how they are or what is on their mind. Never answer a greeting with a list of things they can ask.
- Be personable, relaxed, kind, and naturally funny. Use light, affectionate humour when it fits (for example, a playful nod to Nigerian heat or harmattan), but never force a joke or make fun of someone's skin, appearance, budget, identity, or concern.
- Nigerian expressions such as "How far?", "no wahala", or "this Naija heat" are welcome occasionally and only when they sound natural. Don't overdo slang, assume a particular dialect, or imitate a caricature. Plain, warm English is always fine.
- Match the user's energy and message length. A greeting or casual chat deserves a casual reply; a worried skin concern deserves empathy; a direct factual question deserves a clear answer. Don't make every reply a pitch or tack on a question unnecessarily.
- Keep most replies to 1–3 short, natural sentences. Avoid canned openers, repeated phrases, excessive exclamation marks, and robotic labels such as "Product Suggestion" or "Price".

Skincare and product guidance:
- Use only the product information in the catalog below. Never invent products, ingredients, stock, prices, delivery promises, or medical claims. Prices in the catalog are in naira; quote the exact listed price when asked.
- For oily/acne-prone skin, Salises Purifying Cleanser may be relevant. For dark spots/hyperpigmentation, Botanical Glow Drop Serum and Sol Shield SPF 50 may be relevant. Explain benefits cautiously; don't promise a cure or diagnose.
- Be thoughtful and reassuring about skin concerns. Avoid implying that natural skin tones or normal skin texture need fixing.
- Only when the user asks for a product recommendation, a specific product, or product images, add this JSON block at the very end, using real product IDs from the catalog. Do not add it to greetings or general questions:
\`\`\`json
{ "suggestedProductIds": ["product-id-1"] }
\`\`\`

Product Catalog:
${JSON.stringify(productCatalogSummary, null, 2)}`





    const chatHistory = messages
      .filter(m => m.id !== 'welcome-msg')
      .map((m) => ({
        role: m.role,
        content: m.content
      }))
      .slice(-20);

    let apiSuccess = false;

    try {
      const assistantContent = await requestGroq('chat', [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: query.trim() }
      ]);
      let assistantText = assistantContent;
      let suggestedIds = [];

      // Extract JSON suggestedProductIds if present
      const jsonMatch = assistantText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (Array.isArray(parsed.suggestedProductIds)) {
            suggestedIds = parsed.suggestedProductIds;
          }
        } catch {
          // Ignore malformed optional product recommendations.
        }
        assistantText = assistantText.replace(/```json\s*\{[\s\S]*?\}\s*```/g, '').trim();
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: assistantText,
          suggestedProductIds: suggestedIds
        }
      ]);
      apiSuccess = true;
    } catch (err) {
      console.warn('Groq chat request failed:', err);
    }

    // Fallback if API fails or network offline
    if (!apiSuccess) {
      const localResult = generateLocalResponse(query);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-local-${Date.now()}`,
          role: 'assistant',
          content: localResult.content,
          suggestedProductIds: localResult.suggestedProductIds
        }
      ]);
    }

    setIsGenerating(false);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: "Fresh start! 😊 What’s on your mind today—skincare, products, or just a little gist?",
        suggestedProductIds: []
      }
    ]);
  };

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col selection:bg-gold-400">

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-botanic-950 text-cream-50 shadow-xl border-b border-gold-500/20 px-4 py-3.5 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToStore}
              className="p-2 bg-botanic-900 hover:bg-botanic-800 text-gold-400 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold border border-gold-500/20 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Store</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-botanic-950 flex items-center justify-center font-bold shadow-md shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-serif text-base sm:text-lg font-bold text-cream-50">
                    Lumière AI Concierge
                  </h1>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[11px] text-gray-400">
                  Melanin Skincare Expert & Product Enquiries
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleClearChat}
            className="p-2 text-xs text-gray-400 hover:text-cream-50 hover:bg-botanic-900 rounded-xl transition flex items-center gap-1.5 border border-transparent hover:border-gold-500/20"
            title="Clear Chat History"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Chat</span>
          </button>
        </div>
      </header>

      {/* Chat Conversation Scroll Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 overflow-y-auto space-y-6 pb-40">

        {/* Intro Announcement Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-botanic-900/10 via-cream-100 to-gold-100/50 border border-gold-400/30 flex items-center gap-3 shadow-xs">
          <Sparkles className="w-5 h-5 text-gold-600 shrink-0" />
          <div className="text-xs text-botanic-950 space-y-0.5">
            <p className="font-bold">Ask about product prices, ingredients, or customized routine advice</p>
            <p className="text-charcoal-600 text-[11px]">
              Trained on Lumière Botanics NAFDAC-certified formulations.
            </p>
          </div>
        </div>

        {/* Messages Stream */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const suggestedProducts = msg.suggestedProductIds
            ?.map((id) => products.find((p) => p.id === id))
            .filter(Boolean);

          const shouldShowProducts = suggestedProducts && suggestedProducts.length > 0;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'
                }`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-botanic-900 text-gold-400 flex items-center justify-center shrink-0 shadow-sm border border-gold-500/20">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`space-y-3 max-w-lg sm:max-w-xl ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Bubble Text */}
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${isUser
                    ? 'bg-botanic-900 text-cream-50 rounded-tr-xs font-medium'
                    : 'bg-white text-botanic-950 border border-cream-200 rounded-tl-xs'
                    }`}
                >
                  <p className="whitespace-pre-line">{renderFormattedContent(msg.content)}</p>
                </div>

                {/* Embedded Suggested Product Cards (ONLY if explicitly requested or suggested) */}
                {shouldShowProducts && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 w-full">
                    {suggestedProducts.map((prod) => (
                      <div
                        key={prod.id}
                        className="p-3 bg-white rounded-2xl border border-gold-400/40 shadow-sm flex items-center justify-between gap-3 group hover:border-gold-500 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-12 h-12 object-cover rounded-xl border border-cream-200 shrink-0 bg-cream-50"
                          />
                          <div className="min-w-0">
                            <h5 className="font-bold text-xs text-botanic-950 truncate">
                              {prod.name}
                            </h5>
                            <p className="text-[11px] text-gold-700 font-bold">
                              {formatPrice(prod.price)}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => onAddToCart(prod)}
                          className="p-2 bg-botanic-900 hover:bg-gold-500 text-cream-50 hover:text-botanic-950 rounded-xl transition shrink-0 shadow-xs"
                          title="Add to Cart"
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-gold-500 text-botanic-950 flex items-center justify-center shrink-0 shadow-sm font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Generator State */}
        {isGenerating && (
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-botanic-900 text-gold-400 flex items-center justify-center shrink-0 border border-gold-500/20">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 bg-white border border-cream-200 rounded-2xl rounded-tl-xs text-xs text-charcoal-600 flex items-center gap-2 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-gold-600" />
              <span>Lumière AI is analyzing skincare catalog...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Fixed Mobile Bottom Input & Quick Prompts Area */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-cream-200 p-4 sm:p-5 shadow-2xl">
        <div className="max-w-4xl mx-auto space-y-3">

          {/* Starter Quick Prompts Scrollable Bar */}
          {messages.length < 5 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {STARTER_PROMPTS.map((promptText, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(promptText)}
                  disabled={isGenerating}
                  className="px-3 py-1.5 bg-cream-100 hover:bg-gold-100 text-botanic-950 border border-cream-300 rounded-full text-xs font-medium whitespace-nowrap transition shrink-0 hover:border-gold-400"
                >
                  {promptText}
                </button>
              ))}
            </div>
          )}

          {/* Form Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask about skincare products, prices, hyperpigmentation..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={isGenerating}
              className="flex-1 bg-cream-50 border border-cream-300 rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium text-botanic-950 placeholder:text-gray-400 focus:outline-none focus:border-botanic-800 focus:bg-white transition"
            />

            <button
              type="submit"
              disabled={!inputQuery.trim() || isGenerating}
              className="p-3 bg-botanic-900 hover:bg-botanic-800 disabled:opacity-50 text-cream-50 font-bold rounded-2xl transition shadow-md shrink-0"
            >
              <Send className="w-4 h-4 text-gold-400" />
            </button>
          </form>
        </div>
      </footer>

    </div>
  );
}
