"use client"

import React, { useState, useEffect } from "react"
import { Play, Square, RotateCcw, Coffee, Sliders, Sparkles, Scale, Gauge, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export function EspressoDialApp() {
  // Extraction parameters
  const [grindSetting, setGrindSetting] = useState<number>(14.5)
  const [dose, setDose] = useState<number>(18.0)
  const [yieldGrams, setYieldGrams] = useState<number>(36.0)
  const [temp, setTemp] = useState<number>(93)
  
  // Timer State
  const [seconds, setSeconds] = useState<number>(0)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  
  // Sensory notes
  const [tasteBalance, setTasteBalance] = useState<number>(50) // 0: Sour, 100: Bitter, 50: Balanced
  const [rating, setRating] = useState<number>(4)
  const [savedLogs, setSavedLogs] = useState<Array<{
    id: string
    date: string
    grind: number
    dose: number
    yield: number
    time: number
    rating: number
  }>>([
    {
      id: "1",
      date: "Today, 08:30",
      grind: 14.5,
      dose: 18.0,
      yield: 36.5,
      time: 27.5,
      rating: 5,
    }
  ])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 0.1)
      }, 100)
    } else if (!isRunning && seconds !== 0) {
      if (interval) clearInterval(interval)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, seconds])

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setSeconds(0)
  }

  const handleSaveShot = () => {
    const newLog = {
      id: Date.now().toString(),
      date: "Just now",
      grind: grindSetting,
      dose: dose,
      yield: yieldGrams,
      time: parseFloat(seconds.toFixed(1)) || 27.0,
      rating: rating,
    }
    setSavedLogs([newLog, ...savedLogs])
    resetTimer()
  }

  const getDialInRecommendation = () => {
    const time = parseFloat(seconds.toFixed(1))
    if (time > 0 && time < 24) {
      return "Extraction was fast (<24s). Likely under-extracted or sour. Consider grinding finer (e.g. -0.5 to -1.0 steps)."
    }
    if (time > 34) {
      return "Extraction was slow (>34s). Likely over-extracted or bitter/astringent. Consider grinding coarser."
    }
    return "Extraction is in the golden zone (25s - 32s). Adjust grind in micro-steps for sweetness."
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 pb-24 text-neutral-100">
      {/* Top Header */}
      <header className="flex items-center justify-between pt-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-neutral-950 shadow-md">
              <Coffee className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Espresso Studio</h1>
              <p className="text-xs text-neutral-400">Precision Dial-In & Setup</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900/80 px-3 py-1 text-xs text-amber-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Online
        </div>
      </header>

      {/* Active Setup & Bean Card */}
      <Card className="border-amber-900/30 bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/20">
        <CardContent className="pt-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                Active Setup
              </span>
              <h3 className="mt-1 font-semibold text-neutral-100">DF64 Gen 2 + Profitec GO</h3>
              <p className="text-xs text-neutral-400">93°C PID • 9.0 Bar • 18g VST Basket</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-neutral-800/80 pt-3 text-xs">
            <span className="text-neutral-400">Bean: <strong className="text-neutral-200">Ethiopia Yirgacheffe (Natural)</strong></span>
            <span className="text-neutral-400">Rest: <strong className="text-amber-400">12d</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Extraction Variable Steppers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sliders className="h-4 w-4 text-amber-500" />
            Extraction Parameters
          </CardTitle>
          <CardDescription>Adjust your machine and grinder settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Grind Setting */}
          <div className="flex items-center justify-between rounded-xl bg-neutral-950/60 p-3 border border-neutral-800/60">
            <div>
              <div className="text-xs font-medium text-neutral-400">Grind Size</div>
              <div className="text-lg font-bold text-amber-400">{grindSetting.toFixed(1)} <span className="text-xs font-normal text-neutral-500">clicks</span></div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={() => setGrindSetting(prev => Math.max(0, +(prev - 0.5).toFixed(1)))}>-</Button>
              <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={() => setGrindSetting(prev => +(prev + 0.5).toFixed(1))}>+</Button>
            </div>
          </div>

          {/* Dose & Yield Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col justify-between rounded-xl bg-neutral-950/60 p-3 border border-neutral-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400">Dose (In)</span>
                <Scale className="h-3.5 w-3.5 text-neutral-500" />
              </div>
              <div className="my-1 text-lg font-bold text-neutral-100">{dose.toFixed(1)} <span className="text-xs text-neutral-500 font-normal">g</span></div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" className="h-7 w-full p-0 text-xs" onClick={() => setDose(prev => Math.max(1, +(prev - 0.5).toFixed(1)))}>-0.5</Button>
                <Button size="sm" variant="outline" className="h-7 w-full p-0 text-xs" onClick={() => setDose(prev => +(prev + 0.5).toFixed(1))}>+0.5</Button>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-xl bg-neutral-950/60 p-3 border border-neutral-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400">Yield (Out)</span>
                <Gauge className="h-3.5 w-3.5 text-neutral-500" />
              </div>
              <div className="my-1 text-lg font-bold text-neutral-100">{yieldGrams.toFixed(1)} <span className="text-xs text-neutral-500 font-normal">g</span></div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" className="h-7 w-full p-0 text-xs" onClick={() => setYieldGrams(prev => Math.max(1, +(prev - 1).toFixed(1)))}>-1</Button>
                <Button size="sm" variant="outline" className="h-7 w-full p-0 text-xs" onClick={() => setYieldGrams(prev => +(prev + 1).toFixed(1))}>+1</Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs px-1 text-neutral-400">
            <span>Brew Ratio: <strong className="text-amber-400 font-semibold">1:{(yieldGrams / (dose || 1)).toFixed(1)}</strong></span>
            <span>Temperature: <strong className="text-neutral-200">{temp}°C</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Live Shot Timer Card */}
      <Card className="border-amber-500/20 bg-gradient-to-b from-neutral-900 to-neutral-950">
        <CardContent className="pt-6 text-center">
          <div className="text-xs font-medium uppercase tracking-wider text-neutral-400">Extraction Timer</div>
          <div className="my-3 font-mono text-5xl font-black tracking-tight text-amber-400">
            {seconds.toFixed(1)}<span className="text-2xl text-amber-600 font-normal">s</span>
          </div>

          <div className="flex items-center justify-center gap-3 mt-4">
            <Button
              size="lg"
              variant={isRunning ? "destructive" : "default"}
              className="w-36 font-semibold"
              onClick={toggleTimer}
            >
              {isRunning ? (
                <>
                  <Square className="mr-2 h-4 w-4 fill-white" /> Stop
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4 fill-white" /> Start
                </>
              )}
            </Button>
            <Button size="lg" variant="outline" onClick={resetTimer}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sensory & Dial Feedback */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Taste & Dial-In Rating</CardTitle>
          <CardDescription>Evaluate sensory balance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Balance Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-neutral-400">
              <span className={tasteBalance < 40 ? "font-bold text-yellow-400" : ""}>Sour / Under</span>
              <span className={tasteBalance >= 40 && tasteBalance <= 60 ? "font-bold text-emerald-400" : ""}>Balanced & Sweet</span>
              <span className={tasteBalance > 60 ? "font-bold text-red-400" : ""}>Bitter / Over</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={tasteBalance}
              onChange={(e) => setTasteBalance(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral-800 accent-amber-500"
            />
          </div>

          {/* Star Rating */}
          <div className="flex items-center justify-between border-t border-neutral-800/80 pt-3">
            <span className="text-xs font-medium text-neutral-400">Overall Score:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 focus:outline-none"
                >
                  <Star
                    className={`h-5 w-5 ${
                      star <= rating ? "fill-amber-400 text-amber-400" : "text-neutral-600"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Smart AI / Dial Tip */}
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-300 border border-amber-500/20">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <p className="leading-relaxed">{getDialInRecommendation()}</p>
          </div>

          <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold h-11" onClick={handleSaveShot}>
            Log Shot to History
          </Button>
        </CardContent>
      </Card>

      {/* Recent History Preview */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 px-1">Recent Dial History</h3>
        {savedLogs.map((log) => (
          <div key={log.id} className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-xs">
            <div>
              <div className="font-semibold text-neutral-200">
                Grind {log.grind} • {log.dose}g in ➔ {log.yield}g out
              </div>
              <div className="text-[11px] text-neutral-400">{log.date} • {log.time}s</div>
            </div>
            <div className="flex items-center text-amber-400 font-bold">
              ★ {log.rating}.0
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur-md px-6 py-2.5 flex justify-around text-xs max-w-md mx-auto">
        <button className="flex flex-col items-center gap-1 text-amber-500 font-semibold">
          <Coffee className="h-5 w-5" />
          <span>Dial In</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-neutral-400 hover:text-neutral-200">
          <Sliders className="h-5 w-5" />
          <span>My Gear</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-neutral-400 hover:text-neutral-200">
          <Scale className="h-5 w-5" />
          <span>Beans</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-neutral-400 hover:text-neutral-200">
          <Gauge className="h-5 w-5" />
          <span>History</span>
        </button>
      </nav>
    </div>
  )
}
