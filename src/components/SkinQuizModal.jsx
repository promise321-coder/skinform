import React, { useState } from 'react';
import { X, Sparkles, ArrowRight, CheckCircle2, ShoppingBag, RotateCcw, MessageCircle, Loader2, Bot } from 'lucide-react';
import { QUIZ_QUESTIONS } from '../data/products';
import { requestGroq } from '../lib/groq';

export default function SkinQuizModal({
  isOpen,
  onClose,
  products,
  currency,
  onAddRoutineToCart
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiRecommendedIds, setAiRecommendedIds] = useState([]);
  const [isRoutineAdded, setIsRoutineAdded] = useState(false);

  if (!isOpen) return null;

  // Fallback rule-based recommendation logic
  const getFallbackRecommendations = (userAnswers) => {
    const concern = userAnswers.concern || 'hyperpigmentation';
    const isCompleteRoutine = userAnswers.routineLength === 'complete';

    let recs = [];

    // Cleanser
    recs.push(products.find(p => p.id === 'salises-purifying-cleanser'));

    // Exfoliant if complete routine
    if (isCompleteRoutine) {
      recs.push(products.find(p => p.id === 'lactic-glow-dermafoliant'));
    }

    // Target Serum
    if (concern === 'hyperpigmentation' || concern === 'glow') {
      recs.push(products.find(p => p.id === 'botanical-glow-drop-serum'));
    } else if (concern === 'acne') {
      recs.push(products.find(p => p.id === 'botanical-glow-drop-serum'));
    } else {
      recs.push(products.find(p => p.id === 'night-recovery-botanical-elixir'));
    }

    // Moisturizer
    recs.push(products.find(p => p.id === 'berry-refined-barrier-souffle'));

    // Daytime SPF
    recs.push(products.find(p => p.id === 'sol-shield-spf50'));

    return recs.filter(Boolean);
  };

  const fetchGroqAIRecommendation = async (userAnswers) => {
    const productCatalogSummary = products.map(p => ({
      id: p.id,
      name: p.name,
      tag: p.tag,
      description: p.description
    }));

    const systemPrompt = `You are Lumière Botanics' AI Melanin Skincare Dermatologist.
Analyze the user's skin profile and select 3 to 4 product IDs from the provided product catalog to create a custom routine.
Focus on safe, effective care for melanin-rich skin in warm, humid African climates.

Product Catalog:
${JSON.stringify(productCatalogSummary, null, 2)}

Respond strictly with valid JSON format only, no additional markdown wrapping or text:
{
  "recommendedProductIds": ["id1", "id2", "id3"],
  "analysis": "A concise 2-sentence expert skin analysis explaining why this combination targets their skin profile."
}`;

    const userPrompt = `User Profile:
- Skin Type: ${userAnswers.skinType || 'Combination'}
- Primary Concern: ${userAnswers.concern || 'Hyperpigmentation'}
- Routine Preference: ${userAnswers.routineLength || 'Essential'}
- Sun Exposure: ${userAnswers.sunExposure || 'High'}`;

    try {
      const content = await requestGroq('quiz', [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 'json');
      return JSON.parse(content);
    } catch (err) {
      console.warn('Groq skin quiz request failed:', err);
      return null;
    }
  };

  const handleSelectOption = async (questionId, value) => {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);

    if (currentStep < QUIZ_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsCompleted(true);
      setIsLoadingAI(true);

      const aiResult = await fetchGroqAIRecommendation(updated);

      if (aiResult && Array.isArray(aiResult.recommendedProductIds) && aiResult.recommendedProductIds.length > 0) {
        setAiRecommendedIds(aiResult.recommendedProductIds);
        setAiAnalysis(aiResult.analysis || '');
      } else {
        setAiRecommendedIds([]);
        setAiAnalysis('');
      }

      setIsLoadingAI(false);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setCurrentStep(0);
    setIsCompleted(false);
    setIsLoadingAI(false);
    setAiAnalysis('');
    setAiRecommendedIds([]);
    setIsRoutineAdded(false);
  };

  // Determine recommendations list
  const getActiveRecommendations = () => {
    if (aiRecommendedIds.length > 0) {
      const matched = aiRecommendedIds
        .map(id => products.find(p => p.id === id))
        .filter(Boolean);
      if (matched.length > 0) return matched;
    }
    return getFallbackRecommendations(answers);
  };

  const recommendations = getActiveRecommendations();
  const rawTotal = recommendations.reduce((sum, item) => sum + item.price, 0);
  const discountedTotal = Math.round(rawTotal * 0.9); // 10% bundle off

  const formatPrice = (amount) => {
    if (currency === 'USD') {
      return `$${(amount / 1500).toFixed(2)}`;
    }
    return `₦${amount.toLocaleString()}`;
  };

  const handleAddBundle = () => {
    onAddRoutineToCart(recommendations);
    setIsRoutineAdded(true);
    setTimeout(() => {
      onClose();
      setIsRoutineAdded(false);
    }, 1200);
  };

  const currentQ = QUIZ_QUESTIONS[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-botanic-950/75 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-cream-200 p-6 sm:p-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-botanic-950 rounded-full hover:bg-cream-100 transition z-10"
          aria-label="Close quiz"
        >
          <X className="w-5 h-5" />
        </button>

        {!isCompleted ? (
          /* Step-by-Step Questions */
          <div className="space-y-6">
            {/* Header / Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-gold-700">
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Melanin Routine Finder
                </span>
                <span>Question {currentStep + 1} of {QUIZ_QUESTIONS.length}</span>
              </div>
              <div className="w-full bg-cream-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-botanic-800 h-full rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / QUIZ_QUESTIONS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Title */}
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-botanic-950">
                {currentQ.question}
              </h3>
              <p className="text-xs text-charcoal-600">
                {currentQ.subtitle}
              </p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3 pt-2">
              {currentQ.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelectOption(currentQ.id, option.value)}
                  className="p-4 rounded-2xl border-2 border-cream-200 hover:border-gold-500 hover:bg-cream-50 transition text-left flex items-center justify-between group shadow-sm"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-botanic-950 group-hover:text-gold-800">
                      {option.label}
                    </p>
                    <p className="text-xs text-charcoal-600">
                      {option.desc}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-cream-400 group-hover:text-gold-600 group-hover:translate-x-1 transition" />
                </button>
              ))}
            </div>

            {/* Previous Step Button */}
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="text-xs font-semibold text-charcoal-600 hover:text-botanic-950 underline transition"
              >
                ← Back to previous question
              </button>
            )}
          </div>
        ) : isLoadingAI ? (
          /* AI Loading State */
          <div className="py-16 text-center space-y-5 animate-fade-in">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-gold-300/30 animate-ping" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-botanic-900 to-botanic-800 text-gold-400 flex items-center justify-center shadow-xl border border-gold-500/20">
                <Sparkles className="w-8 h-8 animate-pulse text-gold-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-serif text-2xl font-bold text-botanic-950 flex items-center justify-center gap-2">
                <span>Consulting Lumière AI Dermatologist</span>
                <Loader2 className="w-5 h-5 animate-spin text-gold-600" />
              </h3>
              <p className="text-xs text-charcoal-600 max-w-sm mx-auto">
                Analyzing your {answers.skinType || 'skin'} profile & {answers.concern || 'goals'} to synthesize a customized protocol for African weather...
              </p>
            </div>
          </div>
        ) : (
          /* Results View */
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-gold-100 via-cream-100 to-gold-100 text-gold-900 border border-gold-300/50 text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-gold-600" /> {aiAnalysis ? 'Groq AI Dermatologist Prescribed' : 'Your Custom Protocol Ready'}
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-botanic-950">
                Targeted Melanin Glow Routine
              </h3>
              <p className="text-xs text-charcoal-600 max-w-md mx-auto">
                Carefully matched for your {answers.skinType || 'skin'} profile, clearing {answers.concern || 'imperfections'} while providing invisible daily UV protection in Nigerian heat.
              </p>
            </div>

            {/* AI Analysis Rationale Card if available */}
            {aiAnalysis && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-botanic-900/5 to-cream-100 border border-gold-500/30 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-botanic-900">
                  <Bot className="w-4 h-4 text-gold-600" />
                  <span>AI Clinical Rationale</span>
                </div>
                <p className="text-xs text-botanic-950 italic leading-relaxed">
                  "{aiAnalysis}"
                </p>
              </div>
            )}

            {/* Recommended Products Carousel / List */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {recommendations.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-cream-100/80 border border-cream-200 gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-botanic-900 text-cream-50 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-lg shrink-0 border border-cream-200"
                    />
                    <div>
                      <p className="text-xs font-bold text-botanic-950 line-clamp-1">{item.name}</p>
                      <p className="text-[11px] text-gold-700 font-medium">{item.tag}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-botanic-950 shrink-0">
                    {formatPrice(item.price)}
                  </span>
                </div>
              ))}
            </div>

            {/* Bundle Price & Add to Bag CTA */}
            <div className="p-4 rounded-2xl bg-botanic-900 text-cream-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gold-300 font-medium">Routine Bundle (10% Off + Free Lagos Delivery)</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-cream-50">{formatPrice(discountedTotal)}</span>
                    <span className="text-xs text-gray-400 line-through">{formatPrice(rawTotal)}</span>
                  </div>
                </div>
                <button
                  onClick={handleAddBundle}
                  disabled={isRoutineAdded}
                  className="px-5 py-3 bg-gold-500 hover:bg-gold-600 text-botanic-950 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 shadow-lg"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isRoutineAdded ? 'Bundle Added!' : 'Add All to Bag'}</span>
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-charcoal-600 hover:text-botanic-950 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Quiz</span>
              </button>

              <a
                href={`https://wa.me/2348123456789?text=Hello%20Lumi%C3%A8re%20Botanics!%20I%20just%20took%20your%20skin%20quiz%20for%20${answers.skinType}%20skin%20and%20${answers.concern}.%20Can%20you%20review%20my%20routine?`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-bold transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Verify with WhatsApp Consultant</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
