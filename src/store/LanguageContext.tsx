import { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ar';

type Translations = Record<string, Record<string, string>>;

const translations: Translations = {
    en: {
        // General
        'Deep Foundation Analysis': 'Deep Foundation Analysis',
        'Deep Foundation Lateral': 'Deep Foundation Lateral',
        'Projects': 'Projects',
        'New Project': 'New Project',
        'Rename': 'Rename',
        'Duplicate': 'Duplicate',
        'Delete': 'Delete',
        'v1.0.0 • LocalStorage AutoSave': 'v1.0.0 • LocalStorage AutoSave',
        'Last modified': 'Last modified',
        'Export PDF': 'Export PDF',
        'Generating...': 'Generating...',

        // Soil Form
        'Soil Parameters': 'Soil Parameters',
        'Soil Type': 'Soil Type',
        'Clay': 'Clay',
        'Sand': 'Sand',
        'Gamma (kN/m³)': 'Gamma (kN/m³)',
        'Undrained Shear (Cu) (kPa)': 'Undrained Shear (Cu) (kPa)',
        'Friction Angle (φ) (deg)': 'Friction Angle (φ) (deg)',
        'Modulus Model': 'Modulus Model',
        'Constant (k)': 'Constant (k)',
        'Linearly Increasing (nh)': 'Linearly Increasing (nh)',
        'k (MN/m² or kPa)': 'k (MN/m² or kPa)',
        'nh (MN/m³ or kN/m³)': 'nh (MN/m³ or kN/m³)',

        // Pile Form
        'Pile & Load Details': 'Pile & Load Details',
        'Diameter (m)': 'Diameter (m)',
        'Length (m)': 'Length (m)',
        'Wall Thickness (m)': 'Wall Thickness (m)',
        'Yield Strength (MPa)': 'Yield Strength (MPa)',
        "Young's Modulus (GPa)": "Young's Modulus (GPa)",
        'Load Height (e) (m)': 'Load Height (e) (m)',

        // Results
        'Pile Classification': 'Pile Classification',
        'stiffness factor': 'stiffness factor',
        'Rigid Pile': 'Rigid Pile',
        'Long Pile': 'Long Pile',
        'Intermediate Pile': 'Intermediate Pile',
        'Broms Method': 'Broms Method',
        'Max Moment': 'Max Moment',
        'Crit Depth': 'Crit Depth',
        'Mode': 'Mode',
        'Soil Failure (Rigid Pile)': 'Soil Failure (Rigid Pile)',
        'Pile Yield (Long Pile)': 'Pile Yield (Long Pile)',
        'Brinch Hansen (Simplified)': 'Brinch Hansen (Simplified)',
        'Rotation Depth': 'Rotation Depth',
        'Educational simplified implementation of Brinch Hansen.': 'Educational simplified implementation of Brinch Hansen.',
        'Capacity Difference between methods': 'Capacity Difference between methods',
        'Brinch Hansen Soil Reaction vs Depth': 'Brinch Hansen Soil Reaction vs Depth',
        'Incomplete or invalid parameters. Please check your inputs.': 'Incomplete or invalid parameters. Please check your inputs.',
        'No project selected. Create one from the sidebar.': 'No project selected. Create one from the sidebar.',

        // Seed Data
        'Typical Offshore Clay Site': 'Typical Offshore Clay Site',
        'Dense Sand Nearshore': 'Dense Sand Nearshore',
        'New Project (Copy)': 'New Project (Copy)'
    },
    ar: {
        // General
        'Deep Foundation Analysis': 'تحليل الأساسات العميقة',
        'Deep Foundation Lateral': 'الأحمال الجانبية للأساسات العميقة',
        'Projects': 'المشاريع',
        'New Project': 'مشروع جديد',
        'Rename': 'إعادة تسمية',
        'Duplicate': 'تكرار',
        'Delete': 'حذف',
        'v1.0.0 • LocalStorage AutoSave': 'الإصدار 1.0.0 • حفظ تلقائي محلي',
        'Last modified': 'آخر تعديل',
        'Export PDF': 'تصدير PDF',
        'Generating...': 'جاري الإنشاء...',

        // Soil Form
        'Soil Parameters': 'معاملات التربة',
        'Soil Type': 'نوع التربة',
        'Clay': 'طين (Clay)',
        'Sand': 'رمل (Sand)',
        'Gamma (kN/m³)': 'الكثافة (kN/m³)',
        'Undrained Shear (Cu) (kPa)': 'مقاومة القص (Cu) (kPa)',
        'Friction Angle (φ) (deg)': 'زاوية الاحتكاك (φ) (درجة)',
        'Modulus Model': 'نموذج المعامل (Modulus)',
        'Constant (k)': 'ثابت (k)',
        'Linearly Increasing (nh)': 'متزايد خطياً (nh)',
        'k (MN/m² or kPa)': 'k (MN/m² أو kPa)',
        'nh (MN/m³ or kN/m³)': 'nh (MN/m³ أو kN/m³)',

        // Pile Form
        'Pile & Load Details': 'تفاصيل الخازوق والأحمال',
        'Diameter (m)': 'القطر (m)',
        'Length (m)': 'الطول (m)',
        'Wall Thickness (m)': 'سمك الجدار (m)',
        'Yield Strength (MPa)': 'إجهاد الخضوع (MPa)',
        "Young's Modulus (GPa)": 'معامل يونغ(GPa)',
        'Load Height (e) (m)': 'ارتفاع الحمل (e) (m)',

        // Results
        'Pile Classification': 'تصنيف الخازوق',
        'stiffness factor': 'عامل الصلابة',
        'Rigid Pile': 'خازوق صلب (Rigid)',
        'Long Pile': 'خازوق طويل (Long)',
        'Intermediate Pile': 'خازوق متوسط (Intermediate)',
        'Broms Method': 'طريقة برومز (Broms)',
        'Max Moment': 'أقصى عزم',
        'Crit Depth': 'العمق الحرج',
        'Mode': 'نمط الانهيار',
        'Soil Failure (Rigid Pile)': 'انهيار التربة (خازوق صلب)',
        'Pile Yield (Long Pile)': 'خضوع الخازوق (خازوق طويل)',
        'Brinch Hansen (Simplified)': 'برينش هانسن (مبسطة)',
        'Rotation Depth': 'عمق الدوران',
        'Educational simplified implementation of Brinch Hansen.': 'تطبيق تعليمي مبسط لطريقة برينش هانسن.',
        'Capacity Difference between methods': 'نسبة الاختلاف في السعة بين الطريقتين',
        'Brinch Hansen Soil Reaction vs Depth': 'رد فعل التربة مع العمق (برينش هانسن)',
        'Incomplete or invalid parameters. Please check your inputs.': 'المدخلات غير كاملة أو غير صالحة. يرجى التحقق من البيانات.',
        'No project selected. Create one from the sidebar.': 'لم يتم تحديد مشروع. قم بإنشاء مشروع من القائمة الجانبية.',

        // Seed Data
        'Typical Offshore Clay Site': 'موقع طيني بحري نموذجي',
        'Dense Sand Nearshore': 'رمل كثيف قرب الشاطئ',
        'New Project (Copy)': 'مشروع جديد (نسخة)'
    }
};

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>(() => {
        // Check local storage for preference, default to 'en'
        const saved = localStorage.getItem('app-language');
        return (saved === 'ar' || saved === 'en') ? saved : 'en';
    });

    useEffect(() => {
        localStorage.setItem('app-language', language);
        if (language === 'ar') {
            document.documentElement.lang = 'ar';
        } else {
            document.documentElement.lang = 'en';
            // Explicitly remove the dir tag since standard LTR shouldn't need it, 
            // or just ensure it doesn't break the new layouts
            document.documentElement.removeAttribute('dir');
        }
    }, [language]);
    const t = (key: string): string => {
        // If translation is missing, fallback to English, then the key itself
        const dict = translations[language] || translations['en'];
        return dict[key] || translations['en'][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
    return ctx;
}
