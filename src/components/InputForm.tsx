
import { useProject } from '../store/ProjectContext';
import { useLanguage } from '../store/LanguageContext';
import { SoilType, ModulusType } from '../lib/calc/types';

export function InputForm() {
    const { activeProject, updateActiveProject } = useProject();
    const { t } = useLanguage();

    if (!activeProject) return null;

    const { soil, pile, load } = activeProject;

    const handleChange = (section: 'soil' | 'pile' | 'load', field: string, value: any) => {
        updateActiveProject({
            [section]: {
                ...activeProject[section],
                [field]: value
            }
        });
    };

    return (
        <div className="space-y-6">

            {/* Soil Parameters */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">{t('Soil Parameters')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('Soil Type')}</label>
                        <select
                            value={soil.type}
                            onChange={e => handleChange('soil', 'type', e.target.value as SoilType)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm"
                        >
                            <option value="clay">{t('Clay')}</option>
                            <option value="sand">{t('Sand')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('Gamma (kN/m³)')}</label>
                        <input
                            type="number"
                            value={soil.gamma}
                            onChange={e => handleChange('soil', 'gamma', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm"
                        />
                    </div>

                    {soil.type === 'clay' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('Undrained Shear (Cu) (kPa)')}</label>
                            <input
                                type="number"
                                value={soil.cu || ''}
                                onChange={e => handleChange('soil', 'cu', parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm"
                            />
                        </div>
                    )}

                    {soil.type === 'sand' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('Friction Angle (φ) (deg)')}</label>
                            <input
                                type="number"
                                value={soil.phi || ''}
                                onChange={e => handleChange('soil', 'phi', parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('Modulus Model')}</label>
                        <select
                            value={soil.modulusType}
                            onChange={e => handleChange('soil', 'modulusType', e.target.value as ModulusType)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm"
                        >
                            <option value="constant">{t('Constant (k)')}</option>
                            <option value="linear">{t('Linearly Increasing (nh)')}</option>
                        </select>
                    </div>

                    {soil.modulusType === 'constant' ? (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('k (MN/m² or kPa)')}</label>
                            <input
                                type="number"
                                value={soil.k || ''}
                                onChange={e => handleChange('soil', 'k', parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm"
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('nh (MN/m³ or kN/m³)')}</label>
                            <input
                                type="number"
                                value={soil.nh || ''}
                                onChange={e => handleChange('soil', 'nh', parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Pile Details */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">{t('Pile & Load Details')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('Diameter (m)')}</label>
                        <input type="number" value={pile.diameter} onChange={e => handleChange('pile', 'diameter', parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('Length (m)')}</label>
                        <input type="number" value={pile.length} onChange={e => handleChange('pile', 'length', parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('Wall Thickness (m)')}</label>
                        <input type="number" value={pile.wallThickness || ''} onChange={e => handleChange('pile', 'wallThickness', parseFloat(e.target.value) || undefined)} className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('Yield Strength (MPa)')}</label>
                        <input type="number" value={pile.yieldStrength} onChange={e => handleChange('pile', 'yieldStrength', parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t("Young's Modulus (GPa)")}</label>
                        <input type="number" value={pile.youngsModulus} onChange={e => handleChange('pile', 'youngsModulus', parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('Load Height (e) (m)')}</label>
                        <input type="number" value={load.e} onChange={e => handleChange('load', 'e', parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm" />
                    </div>
                </div>
            </div>

        </div>
    );
}
