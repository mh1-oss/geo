import { Lightbulb, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useLanguage } from '../store/LanguageContext';

interface EngineeringInsightProps {
    classification: {
        stiffnessFactor: number;
        factorName: string;
        L_over_factor: number;
        classification: 'short' | 'rigid' | 'long' | 'intermediate';
    };
    bromsRes: any;
    bhRes: any;
    percentDiff: number;
}

export function EngineeringInsight({ classification, bromsRes, bhRes, percentDiff }: EngineeringInsightProps) {
    const { t } = useLanguage();

    // Determine pile type flavor text
    let typeText = '';
    if (classification.classification === 'rigid' || classification.classification === 'short') {
        typeText = t('The pile behaves as a Rigid/Short pile. It will likely fail by rotation through the soil rather than yielding of the pile section.');
    } else {
        typeText = t('The pile behaves as a Long/Flexible pile. It is governed by the structural yield moment (My) and will form a plastic hinge before soil failure occurs along the full depth.');
    }

    // Recommended allowable load (FS=2.5 or 3 for lateral loads)
    const factorOfSafety = 3.0; // Typical for lateral loads on piles without extensive testing
    const recommendedUltimate = Math.min(bromsRes.Hu, bhRes.Hu);
    const allowableLoad = recommendedUltimate / factorOfSafety;

    return (
        <div className="bg-slate-800 text-white rounded-xl shadow-lg border border-slate-700 overflow-hidden mt-6 relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Lightbulb className="w-24 h-24" />
            </div>

            <div className="p-6 relative z-10">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                    <div className="bg-blue-500/20 p-2 rounded-lg">
                        <Lightbulb className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold tracking-wide">{t('Engineering Insights')}</h3>
                </div>

                <div className="space-y-6">
                    {/* Classification Insight */}
                    <div className="flex gap-4 items-start">
                        <div className="bg-slate-700/50 p-1.5 rounded-full mt-1">
                            <Info className="w-4 h-4 text-slate-300" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-blue-300 mb-1">{t('Pile Classification')}</h4>
                            <p className="text-sm text-slate-300 leading-relaxed font-light">
                                {typeText}
                            </p>
                        </div>
                    </div>

                    {/* Governing Failure Mode */}
                    <div className="flex gap-4 items-start">
                        <div className="bg-slate-700/50 p-1.5 rounded-full mt-1">
                            <AlertTriangle className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-emerald-400 mb-1">{t('Governing Failure Mode')}</h4>
                            <p className="text-sm text-slate-300 leading-relaxed font-light">
                                {t('Based on Broms theory, the failure mode is')} <strong>{t(bromsRes.failureMode)}</strong>.
                                {t(' Maximum moment occurs at a depth of')} {bromsRes.criticalDepth.toFixed(2)}m.
                            </p>
                        </div>
                    </div>

                    {/* Method Comparison */}
                    <div className="flex gap-4 items-start">
                        <div className="bg-slate-700/50 p-1.5 rounded-full mt-1">
                            <Info className="w-4 h-4 text-slate-300" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-indigo-300 mb-1">{t('Methodological Comparison')}</h4>
                            <p className="text-sm text-slate-300 leading-relaxed font-light">
                                {t('The difference between Broms and Brinch Hansen capacities is')} <span className="font-medium text-white">{percentDiff.toFixed(1)}%</span>.
                                {percentDiff > 20
                                    ? t(' This is a significant variance, suggesting distinct modeling assumptions in soil reaction mechanisms.')
                                    : t(' The models are in strong agreement.')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Final Recommendation */}
                <div className="mt-8 bg-blue-600/20 border border-blue-500/30 rounded-lg p-5 flex items-center justify-between">
                    <div>
                        <h4 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-blue-400" />
                            {t('Recommended Allowable Load')}
                        </h4>
                        <p className="text-xs text-blue-200">
                            {t('Derived from minimum ultimate capacity with Factor of Safety =')} {factorOfSafety}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-white tracking-tight">
                            {allowableLoad.toFixed(1)} <span className="text-lg font-medium text-blue-300">kN</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
