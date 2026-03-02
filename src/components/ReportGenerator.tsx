import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { useProject } from '../store/ProjectContext';
import { generatePDFReport } from '../lib/report';

export function ReportGenerator() {
    const { activeProject } = useProject();
    const [generating, setGenerating] = useState(false);

    const handleDownload = async () => {
        if (!activeProject) return;
        setGenerating(true);
        try {
            await generatePDFReport(activeProject);
        } catch (err) {
            console.error('Failed to generate PDF', err);
        } finally {
            // Small artificial delay for UX
            setTimeout(() => setGenerating(false), 500);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={generating || !activeProject}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${generating
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                }`}
        >
            {generating ? (
                <>
                    <FileText className="w-4 h-4 animate-pulse" />
                    <span>Generating...</span>
                </>
            ) : (
                <>
                    <Download className="w-4 h-4" />
                    <span>Export PDF</span>
                </>
            )}
        </button>
    );
}
