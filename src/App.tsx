import React, { useMemo, useEffect, useState } from "react";

// Trade Setup Quality Dashboard + HTF Story Tracker
// Tailwind via CDN in index.html
// Data is saved to localStorage

const APP_VERSION = "v 1.00.001";

// ---------- Types ----------
export type Pair =
  | "AUDCAD" | "AUDCHF" | "AUDJPY" | "AUDNZD" | "AUDUSD"
  | "CADCHF" | "CADJPY" | "CHFJPY"
  | "EURAUD" | "EURCAD" | "EURCHF" | "EURGBP" | "EURJPY" | "EURNZD" | "EURUSD"
  | "GBPAUD" | "GBPCAD" | "GBPCHF" | "GBPJPY" | "GBPNZD" | "GBPUSD"
  | "NZDCAD" | "NZDCHF" | "NZDJPY" | "NZDUSD"
  | "USDCAD" | "USDCHF" | "USDJPY";

export type AnchorTF = "M" | "W" | "D" | "4H" | "1H";
export type Story = "pullback" | "swoop" | "hold" | "fomo" | "dash" | "on";
export type Correlation = "full" | "partial" | "none";
export type Breach = "strong" | "ok";
export type VolumeOnBreach = "high" | "normal";
export type MAFlow = "full" | "mixed"; // "full" shown as Flow in UI
export type YesNo = "yes" | "no";
export type Discount = "deal" | "nodeal";
export type OppositeIn = "yes" | "maybe";
export type SwoopClarity = "clear" | "maybe";
export type Session = "Asia" | "London" | "New York";
export type NewsImpact = "High Impact" | "Medium Impact" | "None";

export interface Demand {
  breach: Breach;
  volume: VolumeOnBreach;
  correlation: Correlation;
  maFlow: MAFlow;
  htfStory: Story; // synced from tracker
  causedByNews: YesNo;
}

export interface Swoop {
  discount: Discount;
  oppositeIn: OppositeIn;
  swoop: SwoopClarity;
  correlation: Correlation;
  volume: YesNo;
}

export interface StoryEntry {
  pair: Pair;
  anchor: AnchorTF;
  story: Story;
  correlation: Correlation;
}

export interface DataModel {
  demand: Demand;
  swoop: Swoop;
  reminders: string;
  quotes: string;
  notes: string;
  demandNotes: string;
  swoopNotes: string;
  pair: Pair;
  date: string; // yyyy-mm-dd
  session: Session;
  news: NewsImpact;
  webhookUrl: string; // journal sheet endpoint
}

// ---------- Constants ----------
const PAIRS: Pair[] = [
  "AUDCAD","AUDCHF","AUDJPY","AUDNZD","AUDUSD",
  "CADCHF","CADJPY","CHFJPY",
  "EURAUD","EURCAD","EURCHF","EURGBP","EURJPY","EURNZD","EURUSD",
  "GBPAUD","GBPCAD","GBPCHF","GBPJPY","GBPNZD","GBPUSD",
  "NZDCAD","NZDCHF","NZDJPY","NZDUSD",
  "USDCAD","USDCHF","USDJPY",
];

const ANCHOR_TF: AnchorTF[] = ["M","W","D","4H","1H"];
const STORY_OPTIONS: { label: string; value: Story }[] = [
  { label: "Pullback", value: "pullback" },
  { label: "Swoop", value: "swoop" },
  { label: "Hold", value: "hold" },
  { label: "FOMO", value: "fomo" },
  { label: "Dash", value: "dash" },
  { label: "ON", value: "on" },
];
const CORR_OPTIONS: { label: string; value: Correlation }[] = [
  { label: "Full", value: "full" },
  { label: "Partial", value: "partial" },
  { label: "None", value: "none" },
];

// ---------- UI bits ----------
const Select = ({ label, value, onChange, options, hint, disabled }:{
  label:string; value:string; onChange:(v:string)=>void; options:{label:string; value:string}[];
  hint?:string; disabled?:boolean;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <select
      className={`rounded-xl border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${disabled ? "bg-gray-100 text-gray-500" : ""}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    {hint ? <p className="text-xs text-gray-500 mt-0.5">{hint}</p> : null}
  </div>
);

const NoteBox = ({ label, value, onChange, placeholder }:{
  label:string; value:string; onChange:(v:string)=>void; placeholder?:string;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <textarea
      className="rounded-xl border border-gray-300 p-3 text-sm min-h-[96px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

const SectionCard = ({ title, children, right }:{
  title:string; children:React.ReactNode; right?:React.ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
    <div className="flex items-center justify-between p-4 border-b">
      <h2 className="text-lg font-semibold">{title}</h2>
      {right}
    </div>
    <div className="p-4 grid gap-4">{children}</div>
  </div>
);

const Pill = ({ children, tone = "gray" }:{children:React.ReactNode; tone?: "gray"|"green"|"yellow"|"red"|"blue"|"indigo"}) => {
  const tones:Record<string,string> = {
    gray: "bg-gray-100 text-gray-800",
    green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
    indigo: "bg-indigo-100 text-indigo-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>
  );
};

// ---------- Storage keys ----------
const storeKey = "trade-setup-dashboard-v1";
const storyKey = "trade-setup-htf-stories-v1";

// ---------- Defaults ----------
const defaultStories: Record<Pair, StoryEntry> = PAIRS.reduce((acc, p) => {
  acc[p] = { pair: p, anchor: "D", story: "hold", correlation: "partial" };
  return acc;
}, {} as Record<Pair, StoryEntry>);

const defaultData: DataModel = {
  demand: {
    breach: "strong",
    volume: "high",
    correlation: "full",
    maFlow: "full",
    htfStory: "swoop",
    causedByNews: "no",
  },
  swoop: {
    discount: "deal",
    oppositeIn: "yes",
    swoop: "clear",
    correlation: "full",
    volume: "yes",
  },
  reminders: "",
  quotes: "Play the long game. Protect capital. Small wins stack.",
  notes: "",
  demandNotes: "",
  swoopNotes: "",
  pair: "AUDUSD",
  date: "",
  session: "Asia",
  news: "None",
  webhookUrl: "https://script.google.com/macros/s/AKfycbzzf9hUq6Tohm5n6ZKgxRxK9109oZRzzhUGcr4fMNzGxPqVRS_uhA30qyzH1sbRp00gNQ/exec",
};

// ---------- Scoring ----------
function mapDemandToScore(d: Demand){
  let s = 0;
  s += d.breach === "strong" ? 2 : 1;
  s += d.volume === "high" ? 1 : 0;
  s += d.correlation === "full" ? 3 : (d.correlation === "partial" ? 1 : 0);
  s += d.maFlow === "full" ? 2 : 1;
  const storyScore: Record<Story, number> = { pullback: 1, swoop: 2, hold: 0, fomo: 2, dash: 3, on: 2 };
  s += storyScore[d.htfStory];
  return { score: s, max: 11 };
}

function mapSwoopToScore(s: Swoop){
  let t = 0;
  t += s.discount === "deal" ? 2 : 1;
  t += s.oppositeIn === "yes" ? 2 : 1;
  t += s.swoop === "clear" ? 2 : 0;
  t += s.correlation === "full" ? 3 : (s.correlation === "partial" ? 1 : 0);
  t += s.volume === "yes" ? 1 : 0;
  return { score: t, max: 10 };
}

function scoreToClass(pct: number){ if (pct >= 75) return "A" as const; if (pct >= 50) return "B" as const; return "C" as const; }

function downgradeBySwoop(base: "A"|"B"|"C", swoopScore: number, swoopMax: number, s: Swoop){
  const pct = (swoopScore / swoopMax) * 100; let steps = 0;
  if (pct < 35) steps = 2; else if (pct < 55) steps = 1;
  if (s.swoop === "maybe" || s.discount === "nodeal") steps = Math.max(steps, 1);
  const order = ["A","B","C"] as const; const idx = order.indexOf(base); return order[Math.min(idx + steps, order.length - 1)];
}

function managementForClass(cls: "A"|"B"|"C"){ switch(cls){
  case "A": return { title:"A class plan", bullets:["Risk: higher than baseline if your plan allows","Let the winner run toward higher time frame levels","Scale partials only at key levels, avoid choking the move","Trail behind fresh structure after each pause"] };
  case "B": return { title:"B class plan", bullets:["Risk: standard","Book Book at logical targets","Allow some runner but keep expectations modest","Tighten if correlation fades or volume dries up"] };
  case "C": return { title:"C class plan", bullets:["Risk: reduced","Book Book early and often","Focus on precision entry and quick cleanup","Avoid adding unless conditions upgrade"] };
  default: return { title:"", bullets:[] };
}}

function classTone(c: "A"|"B"|"C"){ return c === "A" ? "green" : c === "B" ? "yellow" : "red"; }

function Tabs({tab,setTab}:{tab:"dashboard"|"tracker"; setTab:(t:"dashboard"|"tracker")=>void;}){
  const Item=({id,children}:{id:"dashboard"|"tracker"; children:React.ReactNode;})=>(
    <button onClick={()=>setTab(id)} className={`px-4 py-2 rounded-xl text-sm border ${tab===id?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}>{children}</button>
  );
  return (<div className="flex gap-2"><Item id="dashboard">Dashboard</Item><Item id="tracker">HTF Story Tracker</Item></div>);
}

export default function App(){
  const [tab,setTab] = useState<"dashboard"|"tracker">("dashboard");

  const [stories,setStories] = useState<Record<Pair, StoryEntry>>(()=>{
    try {
      const s = localStorage.getItem(storyKey);
      return s ? { ...defaultStories, ...JSON.parse(s) } : defaultStories;
    } catch { return defaultStories; }
  });

  const [data,setData] = useState<DataModel>(()=>{
    try {
      const s = localStorage.getItem(storeKey);
      return s ? { ...defaultData, ...JSON.parse(s) } : defaultData;
    } catch { return defaultData; }
  });

  useEffect(()=>{ localStorage.setItem(storeKey, JSON.stringify(data)); },[data]);
  useEffect(()=>{ localStorage.setItem(storyKey, JSON.stringify(stories)); },[stories]);

  // Dev-time sanity tests (non-blocking)
  useEffect(()=>{
    try {
      console.assert(mapDemandToScore({breach:"strong",volume:"high",correlation:"full",maFlow:"full",htfStory:"dash",causedByNews:"no"}).max === 11, "Demand max should be 11");
      const sw = mapSwoopToScore({discount:"deal",oppositeIn:"yes",swoop:"clear",correlation:"full",volume:"yes"});
      console.assert(sw.score === 10 && sw.max === 10, "Swoop perfect should be 10/10");
      const dg = downgradeBySwoop("A", 2, 10, {discount:"nodeal",oppositeIn:"maybe",swoop:"maybe",correlation:"none",volume:"no"});
      console.assert(["A","B","C"].includes(dg), "Downgrade returns a class");
    } catch(_) {}
  },[]);

  // Sync HTF Story for current pair from tracker
  useEffect(()=>{
    const st = stories[data.pair];
    if (st && data.demand.htfStory !== st.story) {
      setData((prev: DataModel)=>({ ...prev, demand: { ...prev.demand, htfStory: st.story } }));
    }
  },[data.pair, stories]);

  const currentStory = stories[data.pair] || { pair: data.pair, anchor:"D" as AnchorTF, story:"hold" as Story, correlation:"partial" as Correlation };

  const { demandScore, swoopScore, baseClass, adjustedClass, finalPct } = useMemo(()=>{
    const d = mapDemandToScore(data.demand);
    const s = mapSwoopToScore(data.swoop);
    const demandPct = (d.score/d.max)*100;
    const swoopPct = (s.score/s.max)*100;
    const blended = demandPct*0.6 + swoopPct*0.4;
    const base = scoreToClass(demandPct);
    const downgraded = downgradeBySwoop(base, s.score, s.max, data.swoop);
    return { demandScore:{...d,pct:demandPct}, swoopScore:{...s,pct:swoopPct}, baseClass:base, adjustedClass:downgraded, finalPct:Math.round(blended) };
  },[data]);

  const mgmt = managementForClass(adjustedClass as "A"|"B"|"C");

  const buildPayload = () => ({
    secret: "", // set if your Apps Script checks it
    timestamp: new Date().toISOString(),
    pair: data.pair,
    date: data.date,
    session: data.session,
    news: data.news,
    htfContext: currentStory,
    demand: data.demand,
    swoop: data.swoop,
    scores: { demand: demandScore, swoop: swoopScore, finalPct, baseClass, adjustedClass },
    reminders: data.reminders,
    quotes: data.quotes,
    notes: data.notes,
    demandNotes: data.demandNotes,
    swoopNotes: data.swoopNotes,
    // Flatten for journal
    anchor: currentStory.anchor,
    story: currentStory.story,
    story_corr: currentStory.correlation,
    d_breach: data.demand.breach,
    d_volume: data.demand.volume,
    d_corr: data.demand.correlation,
    d_ma: data.demand.maFlow,
    d_htf: data.demand.htfStory,
    d_news_caused: data.demand.causedByNews,
    s_discount: data.swoop.discount,
    s_oppIn: data.swoop.oppositeIn,
    s_swoop: data.swoop.swoop,
    s_corr: data.swoop.correlation,
    s_vol: data.swoop.volume,
    d_score: demandScore.score,
    d_max: demandScore.max,
    s_score: swoopScore.score,
    s_max: swoopScore.max,
    finalPct,
    baseClass,
    adjustedClass,
  });

  const exportJSON = () => {
    const payload = buildPayload();
    const blob = new Blob([JSON.stringify(payload,null,2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `trade-setup-${data.pair||"unnamed"}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const p: any = buildPayload();
    const hdr = [
      "timestamp","pair","date","session","news",
      "anchor","story","story_corr",
      "d_breach","d_volume","d_corr","d_ma","d_htf","d_news_caused",
      "s_discount","s_oppIn","s_swoop","s_corr","s_vol",
      "d_score","d_max","s_score","s_max","finalPct","baseClass","adjustedClass",
      "reminders","quotes","notes","demandNotes","swoopNotes"
    ];
    const row = [
      p.timestamp, p.pair, p.date, p.session, p.news,
      p.anchor, p.story, p.story_corr,
      p.d_breach, p.d_volume, p.d_corr, p.d_ma, p.d_htf, p.d_news_caused,
      p.s_discount, p.s_oppIn, p.s_swoop, p.s_corr, p.s_vol,
      p.d_score, p.d_max, p.s_score, p.s_max, p.finalPct, p.baseClass, p.adjustedClass,
      JSON.stringify(p.reminders).replaceAll("\"","'"), JSON.stringify(p.quotes).replaceAll("\"","'"), JSON.stringify(p.notes).replaceAll("\"","'"), JSON.stringify(p.demandNotes).replaceAll("\"","'"), JSON.stringify(p.swoopNotes).replaceAll("\"","'")
    ];
    const csv = `${hdr.join(",")}\n${row.map((v:any)=>`${v}`).join(",")}`;
    const blob = new Blob([csv], { type:"text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `trade-setup-${data.pair||"unnamed"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportToGoogleSheet = async () => {
    if (!data.webhookUrl) { alert("Add your Google Sheet webhook URL in Settings"); return; }
    try {
      const payload = buildPayload();
      payload.secret = ""; // set if your Apps Script checks it
      const res = await fetch(data.webhookUrl, {
        method: "POST",
        // Important: no custom headers to avoid preflight
        body: JSON.stringify(payload), // Apps Script will read postData.contents
      });
      // In no-cors mode you cannot read response; we are not using that here
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("Sent to Google Sheet");
    } catch (e: any) {
      alert(`Failed to send: ${e.message}`);
    }
  };

  const StoryTracker = () => (
    <div className="grid gap-4">
      <SectionCard title="HTF Story Book" right={<Pill tone="blue">{Object.keys(stories).length} pairs</Pill>}>
        <div className="grid gap-3">
          {PAIRS.map((p) => {
            const s = stories[p];
            return (
              <div key={p} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end border rounded-xl p-3">
                <div>
                  <label className="text-xs text-gray-500">Pair</label>
                  <div className="text-sm font-medium">{p}</div>
                </div>
                <Select label="Anchor TF" value={s.anchor} onChange={(v)=>setStories((prev: Record<Pair, StoryEntry>)=>({ ...prev, [p]:{...prev[p], anchor: v as AnchorTF} }))} options={ANCHOR_TF.map(v=>({label:v,value:v}))}/>
                <Select label="Story" value={s.story} onChange={(v)=>setStories((prev: Record<Pair, StoryEntry>)=>({ ...prev, [p]:{...prev[p], story: v as Story} }))} options={STORY_OPTIONS}/>
                <Select label="Correlation" value={s.correlation} onChange={(v)=>setStories((prev: Record<Pair, StoryEntry>)=>({ ...prev, [p]:{...prev[p], correlation: v as Correlation} }))} options={CORR_OPTIONS}/>
                <div className="text-xs text-gray-500">Saved</div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );

  if(tab === "tracker"){
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-8">
        <div className="mx-auto max-w-6xl grid gap-6">
          <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">HTF Story Tracker</h1>
              <p className="text-sm text-gray-600 mt-1">Record Anchor TF, Story, and Correlation for each pair. These sync to the Dashboard.</p>
              <div className="text-[10px] text-gray-400 mt-1">{APP_VERSION}</div>
            </div>
            <Tabs tab={tab} setTab={setTab} />
          </header>
          <StoryTracker />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-8">
      <div className="mx-auto max-w-6xl grid gap-6">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Trade Setup Quality Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Rank the quality of your setup using your edge. Scores and notes are saved locally.</p>
              <div className="text-[10px] text-gray-400 mt-1">{APP_VERSION}</div>
          </div>
          <div className="flex items-center gap-3">
            <Tabs tab={tab} setTab={setTab} />
            <button onClick={exportCSV} className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50">Export CSV</button>
            <button onClick={exportJSON} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Export JSON</button>
            <button onClick={exportToGoogleSheet} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Send to Google Sheet</button>
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          <SectionCard title="Overall Ranking" right={<Pill tone={classTone(adjustedClass as "A"|"B"|"C")}>Final: {adjustedClass} class</Pill>}>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Blended score</p>
                <p className="text-3xl font-bold">{finalPct}<span className="text-base font-semibold">/100</span></p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Base class from Demand</p>
                <p className="text-3xl font-bold">{baseClass}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border p-4">
                <p className="text-sm font-medium">Demand score</p>
                <p className="text-lg">{demandScore.score} / {demandScore.max} ({Math.round(demandScore.pct)}%)</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-sm font-medium">Swoop score</p>
                <p className="text-lg">{swoopScore.score} / {swoopScore.max} ({Math.round(swoopScore.pct)}%)</p>
              </div>
            </div>
            <div className="pt-2 text-xs text-gray-500">If Swoop confidence is low, final class auto downgrades from the base class.</div>
          </SectionCard>

          <SectionCard title="Entry & Management" right={<Pill tone={classTone(adjustedClass as "A"|"B"|"C")}>{mgmt.title}</Pill>}>
            <ul className="list-disc ml-5 text-sm grid gap-1">
              {mgmt.bullets.map((b, i) => (<li key={i}>{b}</li>))}
            </ul>
            <NoteBox label="Custom reminders" value={data.reminders} onChange={(v)=>setData((prev: DataModel)=>({...prev,reminders:v}))} placeholder="Write specific steps you will follow for this trade" />
          </SectionCard>

          <SectionCard title="Mindset & Notes">
            <NoteBox label="Quotes or anchors" value={data.quotes} onChange={(v)=>setData((prev: DataModel)=>({...prev,quotes:v}))} placeholder="Short lines that keep you grounded. Example: Small wins stack." />
            <NoteBox label="General notes" value={data.notes} onChange={(v)=>setData((prev: DataModel)=>({...prev,notes:v}))} placeholder="Anything else to remember for this setup" />
          </SectionCard>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <SectionCard title="Pair" right={<Pill tone="blue">Session prep</Pill>}>
            <div className="grid md:grid-cols-2 gap-4">
              <Select label="Pair" value={data.pair} onChange={(v)=>setData((prev: DataModel)=>({...prev,pair:v as Pair}))} options={PAIRS.map(p=>({label:p,value:p}))} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Date</label>
                <input type="date" className="rounded-xl border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={data.date} onChange={(e)=>setData((prev: DataModel)=>({...prev,date:e.target.value}))}/>
              </div>
              <Select label="Session" value={data.session} onChange={(v)=>setData((prev: DataModel)=>({...prev,session:v as Session}))} options={[{label:"Asia",value:"Asia"},{label:"London",value:"London"},{label:"New York",value:"New York"}]} />
              <Select label="News" value={data.news} onChange={(v)=>setData((prev: DataModel)=>({...prev,news:v as NewsImpact}))} options={[{label:"High Impact",value:"High Impact"},{label:"Medium Impact",value:"Medium Impact"},{label:"None",value:"None"}]} />
            </div>
          </SectionCard>

          <SectionCard title="Quality of Demand" right={<Pill tone="indigo">Overall setup</Pill>}>
            <div className="grid md:grid-cols-2 gap-4">
              <Select label="Breach" value={data.demand.breach} onChange={(v)=>setData((prev: DataModel)=>({...prev,demand:{...prev.demand, breach: v as Breach}}))} options={[{label:"Strong",value:"strong"},{label:"OK",value:"ok"}]} hint="Strength of the break that created demand" />
              <Select label="Volume" value={data.demand.volume} onChange={(v)=>setData((prev: DataModel)=>({...prev,demand:{...prev.demand, volume: v as VolumeOnBreach}}))} options={[{label:"High volume breach",value:"high"},{label:"Normal volume",value:"normal"}]} hint="Presence of activity on the break" />
              <Select label="Correlation" value={data.demand.correlation} onChange={(v)=>setData((prev: DataModel)=>({...prev,demand:{...prev.demand, correlation: v as Correlation}}))} options={CORR_OPTIONS} />
              <Select label="MA Flow" value={data.demand.maFlow} onChange={(v)=>setData((prev: DataModel)=>({...prev,demand:{...prev.demand, maFlow: v as MAFlow}}))} options={[{label:"Flow",value:"full"},{label:"Mixed",value:"mixed"}]} />
              <Select label="HTF Story (synced)" value={data.demand.htfStory} onChange={()=>{}} options={STORY_OPTIONS} disabled hint={`From tracker: ${currentStory.anchor} • ${currentStory.story} • ${currentStory.correlation}`} />
              <Select label="Caused by News" value={data.demand.causedByNews} onChange={(v)=>setData((prev: DataModel)=>({...prev,demand:{...prev.demand, causedByNews: v as YesNo}}))} options={[{label:"Yes",value:"yes"},{label:"No",value:"no"}]} />
            </div>
            <NoteBox label="Demand notes" value={data.demandNotes} onChange={(v)=>setData((prev: DataModel)=>({...prev,demandNotes:v}))} placeholder="Notes about demand quality, context, or caveats" />
          </SectionCard>

          <SectionCard title="Quality of Swoop" right={<Pill tone="indigo">Ready to trade</Pill>}>
            <div className="grid md:grid-cols-2 gap-4">
              <Select label="Discount" value={data.swoop.discount} onChange={(v)=>setData((prev: DataModel)=>({...prev,swoop:{...prev.swoop, discount: v as Discount}}))} options={[{label:"Deal",value:"deal"},{label:"No deal",value:"nodeal"}]} />
              <Select label="Opposite party in" value={data.swoop.oppositeIn} onChange={(v)=>setData((prev: DataModel)=>({...prev,swoop:{...prev.swoop, oppositeIn: v as OppositeIn}}))} options={[{label:"Yes",value:"yes"},{label:"Maybe",value:"maybe"}]} />
              <Select label="Swoop" value={data.swoop.swoop} onChange={(v)=>setData((prev: DataModel)=>({...prev,swoop:{...prev.swoop, swoop: v as SwoopClarity}}))} options={[{label:"Clear",value:"clear"},{label:"Maybe",value:"maybe"}]} />
              <Select label="Correlation" value={data.swoop.correlation} onChange={(v)=>setData((prev: DataModel)=>({...prev,swoop:{...prev.swoop, correlation: v as Correlation}}))} options={CORR_OPTIONS} />
              <Select label="Volume" value={data.swoop.volume} onChange={(v)=>setData((prev: DataModel)=>({...prev,swoop:{...prev.swoop, volume: v as YesNo}}))} options={[{label:"Yes",value:"yes"},{label:"No",value:"no"}]} />
            </div>
            <NoteBox label="Swoop notes" value={data.swoopNotes} onChange={(v)=>setData((prev: DataModel)=>({...prev,swoopNotes:v}))} placeholder="Notes about discount, opposite party, clarity, or risks" />
          </SectionCard>
        </div>

        <SectionCard title="HTF Context" right={<Pill tone="blue">Tracker synced</Pill>}>
          <div className="flex flex-wrap gap-2">
            <Pill tone="gray">Pair: {data.pair}</Pill>
            <Pill tone="gray">Anchor TF: {currentStory.anchor}</Pill>
            <Pill tone="gray">Story: {currentStory.story}</Pill>
            <Pill tone="gray">Correlation: {currentStory.correlation}</Pill>
          </div>
          <p className="text-xs text-gray-500">Edit these in the HTF Story Tracker tab. HTF Story feeds Demand scoring automatically.</p>
        </SectionCard>

        <SectionCard title="How the score is built" right={<Pill tone="gray">Transparent rules</Pill>}>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="font-medium mb-1">Demand scoring</p>
              <ul className="list-disc ml-5 space-y-1 text-gray-700">
                <li>Breach: Strong 2, OK 1</li>
                <li>Volume on breach: High 1, Normal 0</li>
                <li>Correlation: Full 3, Partial 1, None 0</li>
                <li>MA Flow: Flow 2, Mixed 1</li>
                <li>HTF Story: Pullback 1, Swoop 2, Hold 0, FOMO 2, Dash 3, ON 2</li>
                <li>Caused by News: informational only</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">Swoop scoring</p>
              <ul className="list-disc ml-5 space-y-1 text-gray-700">
                <li>Discount: Deal 2, No deal 1</li>
                <li>Opposite party in: Yes 2, Maybe 1</li>
                <li>Swoop clarity: Clear 2, Maybe 0</li>
                <li>Correlation: Full 3, Partial 1, None 0</li>
                <li>Volume: Yes 1, No 0</li>
              </ul>
              <p className="mt-2 text-xs text-gray-500">Final class starts from Demand class and auto downgrades if Swoop confidence is low. Blend: Demand 60, Swoop 40.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Settings" right={<Pill tone="gray">Integrations</Pill>}>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Google Sheet webhook URL</label>
              <input className="rounded-xl border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Paste your Google Apps Script Web App URL" value={data.webhookUrl} onChange={(e)=>setData((prev: DataModel)=>({...prev,webhookUrl:e.target.value}))}/>
              <p className="text-xs text-gray-500 mt-1">Create an Apps Script doPost that appends JSON to a row, deploy as Web App with Anyone access. Paste the URL here and click Send to Google Sheet.</p>
            </div>
          </div>
        </SectionCard>

        <footer className="py-6 text-center text-xs text-gray-500">Built for quick session prep. Adjust weights in code if you prefer a different model.</footer>
      </div>
    </div>
  );
}
