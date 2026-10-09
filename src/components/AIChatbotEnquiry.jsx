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

const CHATBOT_INSTRUCTIONS = `You are Titi, the friendly skincare concierge for Lumière Botanics, a Nigerian skincare brand.

Your first job is to understand and answer the customer's latest message. Read the whole message and the recent conversation; do not match one keyword and jump to a canned skincare answer. A question about lip gloss is about lip gloss, not dark spots. A greeting is just a greeting. Keep the conversation coherent and use earlier messages when the customer refers to something they mentioned.

Be warm, natural, and lightly witty when it fits. Nigerian phrasing is welcome occasionally, but don't force slang, jokes, pet names, or emojis. Match the customer's tone. Be especially kind and non-judgmental about skin, appearance, and budget. Keep ordinary replies concise; use clear steps only when someone asks for a routine or detailed explanation.

The product catalog below is the current catalog supplied by the store. It may have been edited in the browser's admin page. Use only products and facts in this catalog. If someone asks about something not listed (for example, lip gloss), say plainly and warmly that you don't see it in the current catalog. Do not pivot to an unrelated skincare concern or recommend a random product. Offer an alternative only when the customer asks for one and the catalog contains a genuinely relevant option.

For product questions, recommendations, availability, ingredients, usage, and prices, rely on the catalog. Never invent prices, products, ingredients, delivery terms, medical claims, or stock. Do not diagnose or promise results. Answer general conversation and unrelated questions naturally without turning everything into a sales pitch.

Return only a valid JSON object with this exact shape:
{"reply":"A natural response to the latest message","suggestedProductIds":[]}

Set suggestedProductIds to one or more real catalog IDs only when the customer asks to see, buy, or get a recommendation for relevant products. Otherwise use an empty array. Never put JSON, markdown fences, or IDs inside the reply string.`;

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
    const normalizedQuery = query.toLowerCase().replace(/[^\w\s']/g, '').trim();

    if (/^(hi|hello|hey|heya|hiya|good morning|good afternoon|good evening|how are you|how far|sup)[\s!?.,]*$/.test(normalizedQuery)) {
      return {
        content: "Hey, welcome 😊 How are you doing? What’s on your mind?",
        suggestedProductIds: []
      };
    }

    const matchedProduct = products.find((product) => {
      const name = product.name.toLowerCase();
      return normalizedQuery.includes(name) || normalizedQuery.includes(product.id.toLowerCase());
    });

    if (matchedProduct && /\b(price|cost|how much|available|in stock|buy|purchase)\b/.test(normalizedQuery)) {
      return {
        content: `**${matchedProduct.name}** is ${formatPrice(matchedProduct.price)}.${matchedProduct.inStock === false ? ' It is currently marked out of stock.' : ''}`,
        suggestedProductIds: /\b(buy|purchase|show|recommend)\b/.test(normalizedQuery) ? [matchedProduct.id] : []
      };
    }

    if (matchedProduct) {
      return {
        content: `**${matchedProduct.name}** — ${matchedProduct.shortDesc || matchedProduct.description || 'I can help with its details.'}`,
        suggestedProductIds: /\b(show|picture|photo|image|buy|purchase|recommend)\b/.test(normalizedQuery)
          ? [matchedProduct.id]
          : []
      };
    }

    const requestedProduct = /\b(lip gloss|lipstick|makeup|product|products|catalog|catalogue)\b/.test(normalizedQuery);
    if (requestedProduct) {
      return {
        content: `I don’t see that in the current product list, so I don’t want to point you to something unrelated 😊 Is there another item you’d like me to check?`,
        suggestedProductIds: []
      };
    }

    return {
      content: "I’m having trouble reaching my AI helper right now, so I don’t want to guess and give you the wrong answer. Please try again in a little while 😊",
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
      shortDesc: p.shortDesc || p.description?.slice(0, 240),
      keyActives: p.keyActives?.map(({ name, role }) => ({ name, role })),
      concerns: p.concerns,
      skinTypes: p.skinTypes,
      inStock: p.inStock !== false
    }));

    const systemPrompt = `${CHATBOT_INSTRUCTIONS}\n\nCurrent product catalog:\n${JSON.stringify(productCatalogSummary)}`;

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
      const result = JSON.parse(assistantContent);
      if (typeof result.reply !== 'string' || !Array.isArray(result.suggestedProductIds)) {
        throw new Error('AI returned an invalid chat response.');
      }
      const suggestedIds = result.suggestedProductIds
        .filter((id) => typeof id === 'string' && products.some((product) => product.id === id))
        .slice(0, 4);

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: result.reply,
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
            <p className="font-bold">Ask Titi anything—skincare, products, or just have a chat 😊</p>
            <p className="text-charcoal-600 text-[11px]">She’ll use the latest product list available in this store.</p>
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
              <span>Titi is thinking...</span>
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
              placeholder="Message Titi..."
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
