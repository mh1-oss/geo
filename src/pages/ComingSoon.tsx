import { Link } from 'react-router-dom';

interface ComingSoonProps {
    title: string;
    icon: string;
}

export default function ComingSoon({ title, icon }: ComingSoonProps) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center h-full bg-background-dark bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] relative">
            <div className="absolute inset-0 bg-gradient-to-br from-background-dark via-transparent to-background-dark pointer-events-none"></div>
            <div className="z-10 flex flex-col items-center text-center max-w-md">
                <div className="w-24 h-24 rounded-2xl bg-surface-dark border border-slate-700/30 flex items-center justify-center mb-6 animate-pulse">
                    <span className="material-symbols-outlined text-5xl text-primary">{icon}</span>
                </div>
                <h2 className="text-white text-2xl font-bold mb-3">{title}</h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                    This module is currently under development. It will be available in a future update of GeoPile Pro.
                </p>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                    <span className="material-symbols-outlined text-[18px]">construction</span>
                    Coming Soon
                </div>
                <Link
                    to="/"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-dark border border-slate-700/30 text-slate-300 hover:text-white hover:bg-slate-700 text-sm font-medium transition-colors"
                >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}
