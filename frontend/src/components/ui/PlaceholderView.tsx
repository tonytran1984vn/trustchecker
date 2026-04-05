import { AlertTriangle, HardHat, Lock } from "lucide-react";
import React from "react";

interface PlaceholderProps {
    title: string;
    description?: string;
    icon?: "construction" | "security" | "alert";
}

export function PlaceholderView({ title, description = "This interactive module is currently restricted or under construction for the current platform tier.", icon = "construction" }: PlaceholderProps) {
    const renderIcon = () => {
        switch(icon) {
            case "security": return <Lock className="w-16 h-16 text-slate-300 mb-4" strokeWidth={1} />;
            case "alert": return <AlertTriangle className="w-16 h-16 text-amber-300 mb-4" strokeWidth={1} />;
            default: return <HardHat className="w-16 h-16 text-slate-300 mb-4" strokeWidth={1} />;
        }
    };

    return (
        <div className="w-full h-full min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            {renderIcon()}
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">{title}</h2>
            <p className="text-slate-500 max-w-lg mb-8 leading-relaxed">
                {description}
            </p>
            <div className="flex gap-4">
                <div className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg opacity-80 cursor-not-allowed">
                    Request Alpha Access
                </div>
                <div className="px-4 py-2 bg-white text-slate-600 border border-slate-200 shadow-sm text-sm font-medium rounded-lg opacity-80 cursor-not-allowed">
                    View Documentation
                </div>
            </div>
        </div>
    );
}
