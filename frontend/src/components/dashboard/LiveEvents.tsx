"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio } from "lucide-react";

export default function LiveEvents() {
  const [isOn, setIsOn] = useState(false);

  return (
    <Card className="flex flex-col h-full min-h-[300px] shadow-sm border-border">
      <CardHeader className="px-5 py-4 border-b bg-slate-50/50 rounded-t-xl flex flex-row justify-between items-center space-y-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Radio className="w-4 h-4 text-indigo-600" />
          Live Events
        </CardTitle>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground select-none m-0">
          <span>{isOn ? 'On' : 'Off'}</span>
          <button 
            type="button" 
            onClick={() => setIsOn(!isOn)}
            className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none ${isOn ? 'bg-indigo-600' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${isOn ? 'translate-x-4' : 'translate-x-0'}`}></span>
          </button>
        </label>
      </CardHeader>
      
      <CardContent className="flex-1 p-5 overflow-auto flex flex-col items-center justify-center text-muted-foreground">
        {isOn ? (
          <>
            <Radio className="w-8 h-8 mb-2 animate-pulse text-indigo-400" />
            <div className="text-sm">Connecting to event stream...</div>
          </>
        ) : (
          <div className="text-sm text-center">Live event feed is off.<br/>Toggle on to monitor real-time activity.</div>
        )}
      </CardContent>
    </Card>
  );
}
