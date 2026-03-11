
import { GoogleGenAI } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? '';

export async function queryAssistant(query: string, context: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    const systemInstruction = `أنت مساعد ذكاء اصطناعي متخصص في تحليل بيانات نظام إدارة العقارات. مهمتك هي الإجابة على أسئلة المستخدم باللغة العربية بناءً على البيانات التي يتم تزويدك بها في صيغة JSON فقط.
قواعد صارمة:
1.  لا تستخدم أي معلومات خارج سياق البيانات المقدمة.
2.  إذا كان السؤال لا يمكن الإجابة عليه من البيانات، أجب بـ "المعلومات المطلوبة غير متوفرة في البيانات الحالية".
3.  قدم إجابات مختصرة ومباشرة.
4.  عند ذكر مبالغ مالية، اذكرها كما هي بدون إضافة رموز عملات.
5.  البيانات التي سأزودك بها الآن هي مصدر معلوماتك الوحيد.
البيانات:
${context}
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: query,
            config: {
                systemInstruction: systemInstruction,
            }
        });

        if (!response.text) {
             throw new Error("Received an empty response from the AI assistant.");
        }
        
        return response.text;

    } catch (error) {
        console.error("Gemini API Error:", error);
        if (error instanceof Error && error.message.includes('API key not valid')) {
             throw new Error("API key not valid. Please check your API environment configuration.");
        }
        throw new Error("Failed to get a response from the AI assistant.");
    }
}


export async function analyzeText(text: string, task: 'summarize' | 'improve'): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    const prompt = task === 'summarize' 
        ? `لخص النص التالي في نقاط رئيسية واضحة باللغة العربية. اجعل الملخص قصيرا ومباشرا:\n\n${text}`
        : `أعد صياغة النص التالي ليكون أكثر احترافية ووضوحاً باللغة العربية. حافظ على المعنى الأصلي تماما ولكن حسّن الأسلوب والتركيب اللغوي:\n\n${text}`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest', // Fast model for quick edits
            contents: prompt,
        });

        if (!response.text) {
             throw new Error("لم يتمكن الذكاء الاصطناعي من تحليل النص.");
        }
        return response.text.trim();
    } catch (error) {
        console.error("Gemini API Error in analyzeText:", error);
        throw new Error("فشل الاتصال بمساعد الذكاء الاصطناعي.");
    }
}
