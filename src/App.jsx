import React from "react";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// ─── Supabase ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://rkjgnczsfqmkhrkmckot.supabase.co";
const SUPABASE_KEY = "sb_publishable_KM1Bj1wCZlhnkNgRACo_fQ_Lahnz14Q";

async function sbFetch(path, options={}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...(options.headers||{}),
    }
  });
  if(!res.ok) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function loadFromSupabase() {
  try {
    const data = await sbFetch("/planner_data?id=eq.main&select=*");
    if(data && data[0]) return data[0];
  } catch(e) { console.error("Load error:", e); }
  return null;
}

async function saveToSupabase(payload) {
  try {
    await sbFetch("/planner_data?id=eq.main", {
      method: "PATCH",
      body: JSON.stringify({...payload, updated_at: new Date().toISOString()}),
    });
  } catch(e) { console.error("Save error:", e); }
}


// ─── Responsive scale ────────────────────────────────────────────────────────
function useScale(){ return 1; }

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS_SHORT   = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
const DAYS_FULL    = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];
const MONTHS_RU    = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const MONTHS_NOM   = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const MONTHS_SHORT = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];

const PRIORITY_KEYS = ["a","b","c","d","e","f","g","h","i","j"];

// Default priority config
const DEFAULT_PRIORITIES = {
  a: { name:"", maxPerWeek:1, color:"#f87171", canBeCommercial:true, dueAfterDays:7, dueLabel:"Сдать", hasDue:true , saveStorage:false},
  b: { name:"", maxPerWeek:1, color:"#fb923c", canBeCommercial:true , dueAfterDays:7, dueLabel:"Сдать", hasDue:true, saveStorage:false},
  c: { name:"", maxPerWeek:2, color:"#facc15" , canBeCommercial:true, dueAfterDays:7, dueLabel:"Сдать", hasDue:true, saveStorage:false},
  d: { name:"", maxPerWeek:3, color:"#a3e635" , canBeCommercial:true, dueAfterDays:7, dueLabel:"Сдать", hasDue:true, saveStorage:false},
  e: { name:"", maxPerWeek:3, color:"#4ade80" , canBeCommercial:true, dueAfterDays:7, dueLabel:"Сдать", hasDue:true, saveStorage:false},
  f: { name:"", maxPerWeek:3, color:"#34d399" , canBeCommercial:true, dueAfterDays:7, dueLabel:"Сдать", hasDue:true, saveStorage:false},
  g: { name:"", maxPerWeek:3, color:"#22d3ee" , canBeCommercial:true, dueAfterDays:7, dueLabel:"Сдать", hasDue:true, saveStorage:false},
  h: { name:"", maxPerWeek:3, color:"#60a5fa" , canBeCommercial:true, dueAfterDays:7, dueLabel:"Сдать", hasDue:true, saveStorage:false},
  i: { name:"", maxPerWeek:3, color:"#a78bfa" , canBeCommercial:true, dueAfterDays:7, dueLabel:"Сдать", hasDue:true, saveStorage:false},
  j: { name:"", maxPerWeek:3, color:"#e879f9" , canBeCommercial:true, dueAfterDays:7, dueLabel:"Сдать", hasDue:true, saveStorage:false},
};

const BT = { COMMERCIAL:"commercial", NONCOMMERCIAL:"noncommercial" };
const BT_STYLE = {
  [BT.COMMERCIAL]:    { color:"#ef4444", bg:"#1f0000", label:"Коммерческая" },
  [BT.NONCOMMERCIAL]: { color:"#60a5fa", bg:"#0d1120", label:"Некоммерческая" },
};

const S  = { CLOSED:"closed", OPEN:"open", HIDDEN:"hidden", PERSONAL:"personal" };
const WR = { NONE:"none", PERSONAL:"personal", HYPE:"hype" };
const WR_STYLE = {
  [WR.PERSONAL]: { border:"#a78bfa", bg:"#100d1f", label:"🔒 Личная бронь",     labelColor:"#a78bfa" },
  [WR.HYPE]:     { border:"#facc15", bg:"#1a1800", label:"✦ Резерв (ажиотаж)", labelColor:"#facc15" },
};

// ─── Date helpers ─────────────────────────────────────────────────────────────
function getMonday(d){ const r=new Date(d); r.setHours(0,0,0,0); const w=r.getDay(); r.setDate(r.getDate()+(w===0?-6:1-w)); return r; }
function addDays(d,n){ const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function addWeeks(d,n){ return addDays(d,n*7); }
function dateKey(d){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function weekKey(m){ return dateKey(m); }
function parseLocalDate(dk){
  // Parse YYYY-MM-DD as local date (not UTC)
  const [y,m,d]=dk.split("-").map(Number);
  return new Date(y,m-1,d);
}
function fmtShort(d){ return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`; }
function fmtFull(d){ return `${DAYS_FULL[(d.getDay()+6)%7]}, ${d.getDate()} ${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`; }
function parseWK(wk){ return getMonday(parseLocalDate(wk)); }
function weeksAgo(wk){ const now=new Date(); now.setHours(0,0,0,0); return Math.floor((now-addDays(parseWK(wk),6))/(7*24*3600*1000)); }

function randomDaysForWeek(wk){
  let seed=0; for(let i=0;i<wk.length;i++) seed=(seed*31+wk.charCodeAt(i))>>>0;
  const pool=[0,1,2,3,4,5];
  function next(){ seed=(seed*1664525+1013904223)>>>0; return seed; }
  for(let i=pool.length-1;i>0;i--){ const j=next()%(i+1); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  return pool.slice(0,3).sort((a,b)=>a-b);
}

function initWeeks(){
  const today=new Date(); today.setHours(0,0,0,0);
  const start=getMonday(today); const w={};
  for(let i=0;i<13;i++){
    const m=addWeeks(start,i); const wk=weekKey(m);
    w[wk]={ availDays:randomDaysForWeek(wk), reserve:WR.NONE, reserveNote:"", collapsed:false };
  }
  return w;
}

// ─── Priority helpers ─────────────────────────────────────────────────────────
// Count how many bookings of a given priority exist in a week
function countPriorityInWeek(wk, priorityKey, days){
  const monday=parseWK(wk); let count=0;
  for(let i=0;i<7;i++){
    const dk=dateKey(addDays(monday,i));
    const bookings=days[dk]?.bookings||[];
    bookings.forEach(b=>{ if(b.priority===priorityKey) count++; });
  }
  return count;
}

// For a given week, which priorities still have capacity?
function availablePriorities(wk, days, priorities){
  return PRIORITY_KEYS.filter(pk=>{
    const p=priorities[pk];
    if(!p || !p.name) return false;
    const used=countPriorityInWeek(wk,pk,days);
    return used < p.maxPerWeek;
  });
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function buildCSV(weeks, days, priorities){
  const rows=[["Неделя","Дата","День","Приоритет","Тип","Клиент","Оплачено","Заметка"]];
  Object.keys(weeks).sort().forEach(wk=>{
    const w=weeks[wk]; const m=parseWK(wk);
    const wlabel=`${fmtShort(m)} – ${fmtShort(addDays(m,6))} ${m.getFullYear()}`;
    for(let i=0;i<7;i++){
      const d=addDays(m,i); const dk=dateKey(d);
      const bookings=days[dk]?.bookings||[];
      if(!bookings.length) continue;
      bookings.forEach(b=>{
        const pname=priorities[b.priority]?.name||b.priority||"";
        const note=w.reserve===WR.PERSONAL?(w.reserveNote||"Личная бронь"):w.reserve===WR.HYPE?(w.reserveNote||"Резерв"):"";
        rows.push([wlabel,`${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()}`,DAYS_FULL[i],
          pname, BT_STYLE[b.type]?.label||b.type, b.client||"",
          b.type===BT.COMMERCIAL?(b.paid?"Да":"Нет"):"—", note]);
      });
    }
  });
  return rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
}

const REMINDER_KEY="schedule_last_export";
const CHECK_KEY="schedule_last_check";
const GCAL_KEY="schedule_last_gcal_sync";
const DEADLINES_KEY="schedule_deadlines_v1";
const STORAGE_REMIND_KEY="schedule_storage_reminders_v1";
const PRIORITIES_KEY="schedule_priorities_v2";
const WEEKS_KEY="schedule_weeks_v1";
const DAYS_KEY="schedule_days_v1";
const WRITTEN_OFF_KEY="schedule_written_off_v1";
function getLS(k){ try{return localStorage.getItem(k);}catch{return null;} }
function setLS(k,v){ try{localStorage.setItem(k,v);}catch{} }
function daysSince(k){ const l=getLS(k); if(!l) return Infinity; return Math.floor((Date.now()-new Date(l).getTime())/(24*3600*1000)); }

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App(){
  const [weeks,setWeeks] = useState(initWeeks);
  const [days,setDays] = useState({});
  const [priorities,setPriorities] = useState(()=>{
    try{ const s=getLS(PRIORITIES_KEY); if(s) return JSON.parse(s); }catch{}
    return DEFAULT_PRIORITIES;
  });
  const [view,setView]         = useState("schedule");
  const [modal,setModal]       = useState(null);
  const [addOpen,setAddOpen]   = useState(false);
  const [showReminder,setShowReminder]     = useState(false);
  const [showCheckReminder,setShowCheckReminder] = useState(false);
  const [showGcalReminder,setShowGcalReminder] = useState(false);
  // storageReminders: { [bookingId]: { bookingId, dk, client, label, createdAt, done } }
  const [storageReminders,setStorageReminders] = useState(()=>{
    try{ const s=getLS(STORAGE_REMIND_KEY); if(s) return JSON.parse(s); }catch{}
    return {};
  });
  // deadlines: auto-generated + manual { id, bookingId?, label, date, color, progress, done, manual? }
  const [deadlines,setDeadlines] = useState(()=>{
    try{ const s=getLS(DEADLINES_KEY); if(s) return JSON.parse(s); }catch{}
    return [];
  });
  const [writtenOff,setWrittenOff] = useState({});
  const [showAmounts,setShowAmounts] = useState(true);
  const [clientPriority,setClientPriority] = useState(null); // null = show picker
  const [showBooked,setShowBooked] = useState(false);
  const [selPeriod,setSelPeriod] = useState(0);

  const today=new Date(); today.setHours(0,0,0,0);
  const todayKey=dateKey(today);

  // Persist priorities
  useEffect(()=>{ setLS(PRIORITIES_KEY, JSON.stringify(priorities)); },[priorities]);

  // Deadline reminder — check twice: on load and after 12h
  useEffect(()=>{
    const checkDeadlines=()=>{
      const today=new Date(); today.setHours(0,0,0,0);
      const urgent=deadlines.filter(d=>{
        if(d.done) return false;
        const dt=parseLocalDate(d.date);
        const daysLeft=Math.round((dt-today)/(24*3600*1000));
        return daysLeft>=0&&daysLeft<=3;
      });
      if(urgent.length>0&&"Notification" in window){
        if(Notification.permission==="granted"){
          urgent.forEach(d=>{
            const dt=parseLocalDate(d.date);
            const daysLeft=Math.round((dt-today)/(24*3600*1000));
            new Notification("⏰ Дедлайн приближается",{
              body:`${d.label} — ${daysLeft===0?"сегодня":daysLeft===1?"завтра":`через ${daysLeft} дн.`}`,
              icon:"/favicon.ico",
            });
          });
        } else if(Notification.permission!=="denied"){
          Notification.requestPermission().then(perm=>{
            if(perm==="granted") checkDeadlines();
          });
        }
      }
    };
    checkDeadlines();
    const timer=setInterval(checkDeadlines,12*60*60*1000); // every 12 hours
    return()=>clearInterval(timer);
  },[deadlines]);

  // Storage reminders — check every 24h after shooting day
  useEffect(()=>{
    const checkStorage=()=>{
      const now=new Date(); const today=new Date(); today.setHours(0,0,0,0);
      Object.values(storageReminders).forEach(r=>{
        if(r.done) return;
        const shootDay=parseLocalDate(r.dk);
        if(today<=shootDay) return; // shooting day not passed yet
        if("Notification" in window&&Notification.permission==="granted"){
          new Notification("💾 Не забудь сбросить материал!",{
            body:r.label,
            icon:"/favicon.ico",
          });
        }
      });
    };
    if(Object.values(storageReminders).some(r=>!r.done)){
      checkStorage();
      const timer=setInterval(checkStorage,24*60*60*1000);
      return()=>clearInterval(timer);
    }
  },[storageReminders]);
  useEffect(()=>{ setLS(DEADLINES_KEY, JSON.stringify(deadlines)); },[deadlines]);
  useEffect(()=>{ setLS(STORAGE_REMIND_KEY, JSON.stringify(storageReminders)); },[storageReminders]);

  // Load from Supabase on mount
  useEffect(()=>{
    loadFromSupabase().then(data=>{
      if(!data) return;
      if(data.weeks && Object.keys(data.weeks).length>0) setWeeks(data.weeks);
      if(data.days && Object.keys(data.days).length>0) setDays(data.days);
      if(data.written_off) setWrittenOff(data.written_off);
      if(data.show_amounts !== undefined) setShowAmounts(data.show_amounts);
      if(data.deadlines && data.deadlines.length>0) setDeadlines(data.deadlines);
      if(data.storage_reminders && Object.keys(data.storage_reminders).length>0) setStorageReminders(data.storage_reminders);
      if(data.priorities && Object.keys(data.priorities).length>0) setPriorities(data.priorities);
    });
  },[]);

  // Save to Supabase (debounced 2s)
  const saveTimer = useRef(null);
  useEffect(()=>{
    if(saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(()=>{
      saveToSupabase({
        weeks, days,
        priorities,
        written_off: writtenOff,
        show_amounts: showAmounts,
        deadlines: deadlines,
        storage_reminders: storageReminders,
      });
      setLS(DEADLINES_KEY, JSON.stringify(deadlines));
      setLS(WEEKS_KEY, JSON.stringify(weeks));
      setLS(DAYS_KEY, JSON.stringify(days));
    }, 2000);
    return ()=>{ if(saveTimer.current) clearTimeout(saveTimer.current); };
  },[weeks, days, priorities, writtenOff, showAmounts, deadlines, storageReminders]);

  useEffect(()=>{
    const now=new Date(); now.setHours(0,0,0,0);
    const start=getMonday(now);
    setWeeks(prev=>{
      const next={};
      // Deduplicate: re-key all weeks using local dateKey to fix any UTC-shifted keys
      Object.entries(prev).forEach(([wk,data])=>{
        try{
          const m=getMonday(parseLocalDate(wk));
          const newWk=dateKey(m); // re-generate key with local date
          if(!next[newWk]) next[newWk]=data; // keep first occurrence
        }catch{ next[wk]=prev[wk]; }
      });
      // Add 13 future weeks
      for(let i=0;i<13;i++){
        const m=addWeeks(start,i); const wk=weekKey(m);
        if(!next[wk]) next[wk]={availDays:randomDaysForWeek(wk),reserve:WR.NONE,reserveNote:"",collapsed:false};
      }
      // Always ensure last 4 past weeks exist
      for(let i=1;i<=4;i++){
        const m=addWeeks(start,-i); const wk=weekKey(m);
        if(!next[wk]) next[wk]={availDays:randomDaysForWeek(wk),reserve:WR.NONE,reserveNote:"",collapsed:true};
      }
      Object.keys(next).forEach(wk=>{
        const end=addDays(parseWK(wk),6);
        if(end<now){
          const ago=Math.floor((now-end)/(7*24*3600*1000));
          if(ago>104) delete next[wk];
          else if(!next[wk].collapsed) next[wk]={...next[wk],collapsed:true};
        }
      });
      return next;
    });
    if(daysSince(REMINDER_KEY)>=60) setShowReminder(true);
    if(daysSince(CHECK_KEY)>=14)    setShowCheckReminder(true);
    if(daysSince(GCAL_KEY)>=7)      setShowGcalReminder(true);
  },[]);

  const sortedWKs = Object.keys(weeks).sort();
  const isPast    = wk => addDays(parseWK(wk),6)<today;
  const futureWKs = sortedWKs.filter(wk=>!isPast(wk));
  const pastWKs   = sortedWKs.filter(wk=>isPast(wk)).reverse();
  const pastByYear= {};
  pastWKs.forEach(wk=>{ const yr=wk.slice(0,4); if(!pastByYear[yr]) pastByYear[yr]=[]; pastByYear[yr].push(wk); });

  const getDayInfo=useCallback((dk,wk,idx)=>{
    const w=weeks[wk]; if(!w) return{status:S.CLOSED,bookings:[]};
    const d=days[dk]||{};
    const bookings=d.bookings||[];
    if(bookings.length>0) return{status:"booked",bookings};
    if(d.status) return{status:d.status,bookings:[]};
    if(w.reserve===WR.PERSONAL) return{status:S.PERSONAL,bookings:[]};
    if(w.reserve===WR.HYPE)     return{status:S.HIDDEN,bookings:[]};
    return{status:w.availDays.includes(idx)?S.OPEN:S.CLOSED,bookings:[]};
  },[days,weeks]);

  const toggleCollapse = wk=>setWeeks(p=>({...p,[wk]:{...p[wk],collapsed:!p[wk].collapsed}}));
  const removeWeek     = wk=>setWeeks(p=>{const n={...p};delete n[wk];return n;});
  const setWeekReserve = (wk,r,note)=>setWeeks(p=>({...p,[wk]:{...p[wk],reserve:r,reserveNote:note}}));
  const toggleAvailDay = (wk,i)=>setWeeks(p=>{
    const cur=p[wk].availDays;
    return{...p,[wk]:{...p[wk],availDays:cur.includes(i)?cur.filter(d=>d!==i):[...cur,i].sort()}};
  });

  const onDayClick=(dk,wk,idx)=>{
    const{status}=getDayInfo(dk,wk,idx);
    setModal({type:"dayDetail",dk,wk,dayIdx:idx});
  };
  const onLongPress=(dk,wk,idx)=>{
    const{status}=getDayInfo(dk,wk,idx);
    if(status===S.OPEN)   setDays(p=>({...p,[dk]:{...(p[dk]||{}),status:S.HIDDEN}}));
    else if(status===S.HIDDEN) setDays(p=>{const n={...p};delete n[dk];return n;});
  };

  const addDeadlineForBooking=(dk,booking,customDays=null)=>{
    const p=priorities[booking.priority];
    if(!p||!p.name||p.hasDue===false) return null;
    // customDueDate takes priority, then dueOffset, then default days
    let dueDate;
    if(booking._customDueDate){
      dueDate=parseLocalDate(booking._customDueDate);
    } else {
      const baseDays=customDays!==null?customDays:(p.dueAfterDays||7);
      const extra=booking.type===BT.NONCOMMERCIAL?5:0;
      const offset=booking._dueOffset||0;
      const days=baseDays+extra+offset;
      const bookDate=parseLocalDate(dk);
      dueDate=new Date(bookDate); dueDate.setDate(dueDate.getDate()+days);
    }
    const label=`${p.dueLabel||"Сдать"}: ${p.name}${booking.client?" ("+booking.client+")":""}`;
    const newDl={
      id:`dl_${booking.id}`,
      bookingId:booking.id,
      bookingDk:dk,
      label,
      date:dateKey(dueDate),
      color:p.color||"#4ade80",
      progress:0,
      done:false,
      manual:false,
    };
    setDeadlines(prev=>[...prev.filter(d=>d.bookingId!==booking.id),newDl]);
    return newDl;
  };

  const addBooking=(dk,booking,wk)=>{
    // 1. Add the booking to days state
    setDays(p=>({...p,[dk]:{...(p[dk]||{}),status:undefined,bookings:[...(p[dk]?.bookings||[]),booking]}}));
    // Auto-create deadline
    addDeadlineForBooking(dk,booking);
    // Auto-create storage reminder if requested
    if(priorities[booking.priority]?.saveStorage){
      setStorageReminders(prev=>({...prev,[booking.id]:{
        bookingId:booking.id, dk,
        label:`Сбросить материал: ${booking.client||priorities[booking.priority]?.name||"съёмка"}`,
        createdAt:new Date().toISOString(), done:false,
      }}));
    }

    // 2. After booking: count booked days + open days in this week, close one open day if booked>=3
    if(!wk) return;
    const currentDays = days; // snapshot from closure — always fresh since called after render
    const currentWeek = weeks[wk];
    if(!currentWeek) return;

    const monday=parseWK(wk);

    // count booked days AFTER adding this booking (dk is now booked)
    let bookedCount=0;
    const openDayIndices=[];
    for(let i=0;i<7;i++){
      const d2=addDays(monday,i); const dk2=dateKey(d2);
      const bk2= dk2===dk ? [booking] : (currentDays[dk2]?.bookings||[]);
      if(bk2.length>0){ bookedCount++; continue; }
      // check if day is open
      const st2=currentDays[dk2]?.status;
      if(dk2===dk) continue; // just booked, skip
      const isOpen = st2===S.OPEN || (!st2 && currentWeek.availDays?.includes(i));
      if(isOpen) openDayIndices.push(i);
    }

    if(bookedCount>=3 && openDayIndices.length>0){
      // pick a random open day index and remove it from availDays
      const randIdx=openDayIndices[Math.floor(Math.random()*openDayIndices.length)];
      const victimDk=dateKey(addDays(monday,randIdx));

      // If day has explicit OPEN status in days state — set to CLOSED there
      setDays(p=>{
        const cur=p[victimDk]||{};
        if(cur.status===S.OPEN) return{...p,[victimDk]:{...cur,status:S.CLOSED}};
        return p;
      });

      // Also remove from week's availDays
      setWeeks(p=>{
        const w=p[wk]; if(!w) return p;
        return{...p,[wk]:{...w,availDays:w.availDays.filter(d=>d!==randIdx)}};
      });
    }
  };
  const updateBooking=(dk,id,changes)=>setDays(p=>{
    const cur=p[dk]||{};
    return{...p,[dk]:{...cur,bookings:(cur.bookings||[]).map(b=>b.id===id?{...b,...changes}:b)}};
  });
  const removeBooking=(dk,id)=>{
    setDays(p=>{
      const cur=p[dk]||{};
      return{...p,[dk]:{...cur,bookings:(cur.bookings||[]).filter(b=>b.id!==id)}};
    });
    // Auto-delete associated deadline
    setDeadlines(p=>p.filter(d=>d.bookingId!==id));
    // Auto-delete storage reminder
    setStorageReminders(prev=>{ const n={...prev}; delete n[id]; return n; });
  };


  const [backupMsg,setBackupMsg]=useState(""); // "saved" | "restored" | "error"
  const importRef = useRef(null);
  // Collect all known client names for autocomplete
  const knownClients=useMemo(()=>{
    const names=new Set();
    Object.values(days).forEach(d=>(d.bookings||[]).forEach(b=>{ if(b.client?.trim()) names.add(b.client.trim()); }));
    return [...names].sort();
  },[days]);
  // ── Backup / Restore ──
  const handleBackup=()=>{
    const data={weeks,days,priorities,writtenOff,showAmounts,_version:1,_date:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`planner_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupMsg("saved"); setTimeout(()=>setBackupMsg(""),2500);
  };

  const handleRestore=(e)=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(data.weeks) setWeeks(data.weeks);
        if(data.days) setDays(data.days);
        if(data.priorities) setPriorities(data.priorities);
        if(data.writtenOff) setWrittenOff(data.writtenOff);
        if(data.showAmounts!==undefined) setShowAmounts(data.showAmounts);
        setBackupMsg("restored"); setTimeout(()=>setBackupMsg(""),3000);
      }catch{
        setBackupMsg("error"); setTimeout(()=>setBackupMsg(""),3000);
      }
    };
    reader.readAsText(file);
    e.target.value="";
  };

  // ── Export to Google Calendar (.ics) ──
  const handleICS=()=>{
    const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//LPlan//RU","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
    Object.entries(days).forEach(([dk,d])=>{
      (d.bookings||[]).forEach(b=>{
        const date=parseLocalDate(dk);
        const pname=priorities[b.priority]?.name||"";
        const type=b.type===BT.COMMERCIAL?"Коммерческая":"Некоммерческая";
        const summary=[pname,type,b.client].filter(Boolean).join(" · ");
        const dtStamp=new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z";
        const y=date.getFullYear();
        const m=String(date.getMonth()+1).padStart(2,"0");
        const day=String(date.getDate()).padStart(2,"0");

        lines.push("BEGIN:VEVENT");
        lines.push(`UID:lplan-${b.id}@lplan`);
        lines.push(`DTSTAMP:${dtStamp}`);
        lines.push(`SUMMARY:${summary}`);

        if(b.allDay){
          lines.push(`DTSTART;VALUE=DATE:${y}${m}${day}`);
          // End = next day for all-day
          const nextDay=new Date(date); nextDay.setDate(nextDay.getDate()+1);
          const ny=nextDay.getFullYear();
          const nm=String(nextDay.getMonth()+1).padStart(2,"0");
          const nd=String(nextDay.getDate()).padStart(2,"0");
          lines.push(`DTEND;VALUE=DATE:${ny}${nm}${nd}`);
        } else if(b.timeStart){
          const [sh,sm]=b.timeStart.split(":"); 
          lines.push(`DTSTART:${y}${m}${day}T${sh}${sm}00`);
          if(b.timeEnd){
            const [eh,em]=b.timeEnd.split(":");
            lines.push(`DTEND:${y}${m}${day}T${eh}${em}00`);
          } else {
            // Default 1 hour
            const endH=String(parseInt(sh)+1).padStart(2,"0");
            lines.push(`DTEND:${y}${m}${day}T${endH}${sm}00`);
          }
        } else {
          lines.push(`DTSTART;VALUE=DATE:${y}${m}${day}`);
          const nextDay=new Date(date); nextDay.setDate(nextDay.getDate()+1);
          lines.push(`DTEND;VALUE=DATE:${nextDay.getFullYear()}${String(nextDay.getMonth()+1).padStart(2,"0")}${String(nextDay.getDate()).padStart(2,"0")}`);
        }

        if(b.location) lines.push(`LOCATION:${b.location}`);
        const desc=[b.note, b.amount?`Стоимость: ${b.amount} €`:"", b.paid?"Оплачено":""].filter(Boolean).join("\n");
        if(desc) lines.push(`DESCRIPTION:${desc}`);
        // Add VALARM reminders
        (b.reminders||[]).forEach(mins=>{
          lines.push("BEGIN:VALARM");
          lines.push("ACTION:DISPLAY");
          lines.push(`DESCRIPTION:Напоминание: ${summary}`);
          lines.push(`TRIGGER:-PT${mins}M`);
          lines.push("END:VALARM");
        });
        lines.push("END:VEVENT");
      });
    });
    lines.push("END:VCALENDAR");
    const blob=new Blob([lines.join("\r\n")],{type:"text/calendar;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=`lplan_${new Date().toISOString().slice(0,10)}.ics`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setLS(GCAL_KEY,new Date().toISOString());
    setShowGcalReminder(false);
  };

  const handleExport=()=>{
    const csv=buildCSV(weeks,days,priorities);
    navigator.clipboard?.writeText(csv).then(()=>{
      setCsvCopied(true); setTimeout(()=>setCsvCopied(false),2500);
    });
    setLS(REMINDER_KEY,new Date().toISOString()); setShowReminder(false);
  };

  // Client text: group by priority name, skip days with bookings
  // Build client text for a specific priority key
  // Client dates limited to next 12 weeks from today
  const CLIENT_WEEKS_LIMIT=12;
  const clientTextForPriority=(pk)=>{
    const p=priorities[pk]; if(!p||!p.name) return "";
    // Collect available dates for this priority
    const datelist=[]; // [{date, dayIdx}]
    futureWKs.forEach(wk=>{
      const w=weeks[wk]; if(w.reserve!==WR.NONE) return;
      const avP=availablePriorities(wk,days,priorities);
      if(!avP.includes(pk)) return;
      const m=parseWK(wk);
      for(let i=0;i<7;i++){
        const d=addDays(m,i); const dk=dateKey(d);
        const{status,bookings}=getDayInfo(dk,wk,i);
        if(status===S.OPEN && bookings.length===0) datelist.push({d,i});
      }
    });
    if(!datelist.length) return `${p.name}\nСвободных дат нет`;
    // Group by month
    const byMonth={};
    datelist.forEach(({d,i})=>{
      const mk=`${d.getFullYear()}-${String(d.getMonth()).padStart(2,"0")}`;
      if(!byMonth[mk]) byMonth[mk]={label:`${MONTHS_NOM[d.getMonth()]} ${d.getFullYear()}`,dates:[]};
      byMonth[mk].dates.push(`${d.getDate()} (${DAYS_SHORT[i]})`);
    });
    const lines=[p.name,"Свободные даты:"];
    Object.values(byMonth).forEach(({label,dates})=>{
      lines.push(label);
      lines.push(dates.join(", "));
    });
    return lines.join("\n");
  };

  // Build booked dates text
  const bookedText=(daysBack=null, futureOnly=false)=>{
    const now=new Date(); now.setHours(0,0,0,0);
    const cutoff=daysBack ? new Date(now.getTime()-daysBack*24*3600*1000) : null;
    const lines=[];
    const byMonth={};
    sortedWKs.forEach(wk=>{
      const m=parseWK(wk);
      for(let i=0;i<7;i++){
        const d=addDays(m,i); const dk=dateKey(d);
        if(futureOnly){ if(d <= now) return; }
        else {
          if(cutoff && d < cutoff) return;
          if(d > now) return; // only past/today
        }
        const bookings=days[dk]?.bookings||[];
        if(!bookings.length) return;
        const mk=`${d.getFullYear()}-${String(d.getMonth()).padStart(2,"0")}`;
        if(!byMonth[mk]) byMonth[mk]={label:`${MONTHS_NOM[d.getMonth()]} ${d.getFullYear()}`,entries:[]};
        bookings.forEach(b=>{
          const pname=priorities[b.priority]?.name||"";
          const type=BT_STYLE[b.type]?.label||"";
          const paid=b.type===BT.COMMERCIAL?(b.paid?"  [Оплачено]":"  [Не оплачено]"):"";
          const client=b.client?` — ${b.client}`:"";
          byMonth[mk].entries.push(`${d.getDate()} (${DAYS_SHORT[i]})  ${pname?pname+", ":""}${type}${paid}${client}`);
        });
      }
    });
    Object.values(byMonth).forEach(({label,entries})=>{
      lines.push(label);
      entries.forEach(e=>lines.push("  "+e));
      lines.push("");
    });
    return lines.length?(futureOnly?"Предстоящие задания":"Выполненные задания")+":\n\n"+lines.join("\n").trimEnd():(futureOnly?"Предстоящих заданий нет.":"Выполненных заданий за этот период нет.");
  };

  const clientText=()=>{
    if(clientPriority) return clientTextForPriority(clientPriority);
    // fallback: all priorities
    const lines=[];
    PRIORITY_KEYS.forEach(pk=>{
      const txt=clientTextForPriority(pk); if(txt) lines.push(txt);
    });
    return lines.length?lines.join("\n\n"):"Свободных дат пока нет.";
  };

  const weekStats=wk=>{
    const m=parseWK(wk); let open=0,comm=0,nonc=0,unpaid=0;
    for(let i=0;i<7;i++){
      const dk=dateKey(addDays(m,i));
      const{status,bookings}=getDayInfo(dk,wk,i);
      if(status===S.OPEN) open++;
      bookings.forEach(b=>{
        if(b.type===BT.COMMERCIAL){comm++;if(!b.paid)unpaid++;}
        else nonc++;
      });
    }
    return{open,comm,nonc,unpaid};
  };

  const renderWeek=(wk,readOnly=false)=>{
    const w=weeks[wk]; const m=parseWK(wk);
    const stats=weekStats(wk);
    const hasR=w.reserve!==WR.NONE; const rs=hasR?WR_STYLE[w.reserve]:null;
    const booked=stats.comm+stats.nonc>0;
    const ago=weeksAgo(wk);
    return(
      <div key={wk} style={{marginBottom:8,borderRadius:10,overflow:"hidden",
        border:`1px solid ${hasR?rs.border:booked?"#2a1800":stats.open>0?"#1a2e1a":"#1e1e1e"}`,
        background:hasR?rs.bg:booked?"#110900":stats.open>0?"#0d130d":"#0f0f0f",
        opacity:readOnly?0.45:1}}>

        <div style={{display:"flex",alignItems:"center",padding:"8px 11px",
          borderBottom:w.collapsed?"none":"1px solid #1a1a1a",gap:7,cursor:"pointer"}}
          onClick={()=>toggleCollapse(wk)}>
          <div style={{fontSize:11,color:"#e8e8e0"}}>{w.collapsed?"▶":"▼"}</div>
          <div style={{flex:1}}>
            <span style={{fontSize:13,fontWeight:700,color:"#f4f4f0"}}>{fmtShort(m)} – {fmtShort(addDays(m,6))}</span>
            <span style={{marginLeft:7,fontSize:11,color:"#e8e8e0"}}>{m.toLocaleDateString("ru-RU",{month:"long"})} {m.getFullYear()}</span>
            {readOnly&&<span style={{marginLeft:7,fontSize:11,color:"#ddd"}}>{ago<52?`${ago} нед. назад`:`${Math.round(ago/52)} г. назад`}</span>}
          </div>
          <div style={{display:"flex",gap:5,alignItems:"center"}}>
            {stats.comm>0&&<Badge color="#ef4444">{stats.comm} ком{stats.unpaid>0&&<span style={{color:"#ef4444"}}> ·{stats.unpaid}€</span>}</Badge>}
            {stats.nonc>0&&<Badge color="#60a5fa">{stats.nonc} нек</Badge>}
            {stats.open>0&&!booked&&<Badge color="#4ade80">{stats.open} св</Badge>}
            {hasR&&<span style={{fontSize:10,color:rs.labelColor}}>{rs.label}</span>}
            {!booked&&!hasR&&stats.open===0&&<span style={{fontSize:11,color:"#e8e8e0"}}>○</span>}
          </div>
          <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
            {!readOnly&&<button onClick={()=>setModal({type:"weekMenu",wk})} style={bSty("#ccc","#222")}>⋯</button>}
            <button onClick={()=>removeWeek(wk)} style={bSty("#aaa","#1a1a1a")}>✕</button>
          </div>
        </div>

        {w.collapsed&&w.reserveNote&&<div style={{padding:"4px 13px",fontSize:11,color:"#999",fontStyle:"italic",borderTop:"1px solid #1a1a1a"}}>{w.reserveNote}</div>}

        {!w.collapsed&&(
          <>
            {!hasR&&!readOnly&&(
              <div style={{padding:"6px 11px",borderBottom:"1px solid #1a1a1a",display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:11,color:"#e8e8e0",letterSpacing:1,textTransform:"uppercase",marginRight:3}}>Дни:</span>
                {DAYS_SHORT.map((d,i)=>{
                  const a=w.availDays.includes(i);
                  return <button key={i} onClick={()=>toggleAvailDay(wk,i)} style={{
                    padding:"3px 8px",borderRadius:5,border:`1px solid ${a?"#4ade80":"#222"}`,
                    background:a?"#0d1f14":"transparent",color:a?"#4ade80":"#ccc",
                    fontSize:11,cursor:"pointer",fontFamily:"inherit",
                  }}>{d}</button>;
                })}
              </div>
            )}
            {hasR&&w.reserveNote&&<div style={{padding:"4px 13px 0",fontSize:11,color:"#999",fontStyle:"italic"}}>{w.reserveNote}</div>}
            <DayRow monday={m} wk={wk} getDayInfo={getDayInfo} todayKey={todayKey}
              days={days} priorities={priorities}
              onDayClick={onDayClick} onLongPress={onLongPress} readOnly={readOnly}/>
          </>
        )}
      </div>
    );
  };

  return(
    <div style={{minHeight:"100vh",background:"#0a0a0a",color:"#f0f0ec",fontFamily:"'DM Mono','Courier New',monospace",userSelect:"none"}}>

      {/* HEADER */}
      <div style={{borderBottom:"1px solid #1e1e1e",padding:"13px 14px 10px",position:"sticky",top:0,
        background:"#0a0a0a",zIndex:20,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{fontSize:11,letterSpacing:2,color:"#ddd",textTransform:"uppercase"}}>ЗАДАНИЯ</div>
            <button onClick={()=>window.location.reload(true)} title="Обновить приложение"
              style={{fontSize:10,color:"#555",background:"transparent",border:"1px solid #222",
                borderRadius:4,padding:"1px 6px",cursor:"pointer",fontFamily:"inherit"}}>↻</button>
          </div>
          <div style={{fontSize:14,fontWeight:700,letterSpacing:-0.5}}>{futureWKs.length} нед. вперёд · архив {pastWKs.length}</div>
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center",justifyContent:"flex-end"}}>
          {/* 5 main tabs */}
          {[
            ["schedule","🗓","#4ade80","График"],
            ["deadlines","⏰","#f97316","Дедлайны"],
            ["progress","📊","#34d399","Прогресс"],
            ["reports","📨","#60a5fa","Отчёты"],
            ["settings","⚙️","#e0e0d8","Настройки"],
          ].map(([v,icon,c,tip])=>(
            <button key={v} title={tip}
              onClick={()=>setView(prev=>prev===v?"schedule":v)}
              style={{
                width:40,height:40,borderRadius:9,
                border:`2px solid ${view===v?c:"#444"}`,
                background:view===v?c:"#1a1a1a",
                color:view===v?"#0a0a0a":"#ccc",
                fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                transition:"all .15s",
                boxShadow:view===v?`0 0 12px ${c}88`:"none",
              }}>{icon}</button>
          ))}
          <input ref={importRef} type="file" accept=".json" onChange={handleRestore} style={{display:"none"}}/>
        </div>
      </div>

      {/* REMINDERS */}
      {showReminder&&(
        <div style={{background:"#1a1500",borderBottom:"1px solid #3a3000",padding:"9px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div style={{fontSize:12,color:"#facc15"}}>⏰ 2 месяца без резервной копии — рекомендуем сохранить CSV</div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={handleExport} style={{padding:"4px 10px",borderRadius:5,border:"1px solid #facc15",background:"#2a2000",color:"#facc15",fontSize:9,cursor:"pointer",fontFamily:"inherit"}}>Сохранить</button>
            <button onClick={()=>setShowReminder(false)} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #333",background:"transparent",color:"#999",fontSize:9,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
          </div>
        </div>
      )}
      {showCheckReminder&&(
        <div style={{background:"#0e1a0e",borderBottom:"1px solid #1a3a1a",padding:"9px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div style={{fontSize:12,color:"#4ade80"}}>📅 Прошло 2 недели — проверь свободные дни на новых неделях</div>
          <button onClick={()=>{setLS(CHECK_KEY,new Date().toISOString());setShowCheckReminder(false);}} style={{padding:"4px 14px",borderRadius:5,border:"1px solid #4ade80",background:"#0d1f14",color:"#4ade80",fontSize:9,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>Проверил ✓</button>
        </div>
      )}

      {/* STORAGE REMINDERS BANNER */}
      {Object.values(storageReminders).filter(r=>!r.done).map(r=>{
        const shootDay=parseLocalDate(r.dk);
        const today=new Date(); today.setHours(0,0,0,0);
        if(shootDay>=today) return null; // not yet
        const hoursAgo=Math.round((Date.now()-new Date(r.createdAt).getTime())/(3600*1000));
        return(
          <div key={r.bookingId} style={{background:"#0a1020",borderBottom:"1px solid #1a3060",
            padding:"9px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
            <div style={{fontSize:12,color:"#60a5fa"}}>
              💾 {r.label}
              <span style={{fontSize:10,color:"#555",marginLeft:8}}>({hoursAgo}ч назад)</span>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setStorageReminders(p=>({...p,[r.bookingId]:{...p[r.bookingId],done:true}}))} style={{
                padding:"4px 12px",borderRadius:5,border:"1px solid #4ade80",
                background:"#0d1f14",color:"#4ade80",fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:700,
              }}>✓ Сброшено</button>
              <button onClick={()=>setStorageReminders(p=>{ const n={...p}; delete n[r.bookingId]; return n; })} style={{
                padding:"4px 8px",borderRadius:5,border:"1px solid #222",
                background:"transparent",color:"#555",fontSize:10,cursor:"pointer",fontFamily:"inherit",
              }}>✕</button>
            </div>
          </div>
        );
      })}

      {/* GCAL REMINDER */}
      {showGcalReminder&&(
        <div style={{background:"#0a1520",borderBottom:"1px solid #1a3a5a",padding:"9px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
          <div style={{fontSize:12,color:"#4fc3f7"}}>📆 Прошла неделя — синхронизируй данные с Google Календарём</div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>{handleICS();}} style={{padding:"4px 12px",borderRadius:5,border:"1px solid #4fc3f7",background:"#0d1f2a",color:"#4fc3f7",fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>
              Скачать .ics
            </button>
            <button onClick={()=>{setLS(GCAL_KEY,new Date().toISOString());setShowGcalReminder(false);}} style={{padding:"4px 10px",borderRadius:5,border:"1px solid #333",background:"transparent",color:"#888",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>
              Уже сделал ✓
            </button>
            <button onClick={()=>{setLS(GCAL_KEY,new Date().toISOString());setShowGcalReminder(false);}} style={{padding:"4px 8px",borderRadius:5,border:"1px solid #222",background:"transparent",color:"#555",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
          </div>
        </div>
      )}

      {/* LEGEND */}
      {view==="schedule"&&(
        <div style={{padding:"7px 14px",borderBottom:"1px solid #111",display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          {[["#ef4444","Коммерч."],[BT_STYLE.noncommercial.color,"Некоммерч."],["#4ade80","Свободен"],["#facc15","Скрыт"],["#a78bfa","Личн. бронь"]].map(([c,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#e8e8e0"}}>
              <div style={{width:7,height:7,borderRadius:2,background:c}}/>{l}
            </div>
          ))}
          <div style={{fontSize:11,color:"#e8e8e0",marginLeft:"auto"}}>Клик = детали · удержание = скрыть</div>
        </div>
      )}

      {/* ── VIEWS ── */}
      {view==="reports"&&(
        <ReportsView
          priorities={priorities}
          clientPriority={clientPriority}
          setClientPriority={setClientPriority}
          showBooked={showBooked}
          setShowBooked={setShowBooked}
          selPeriod={selPeriod}
          setSelPeriod={setSelPeriod}
          clientTextForPriority={clientTextForPriority}
          bookedText={bookedText}
          days={days}
          showAmounts={showAmounts}
          writtenOff={writtenOff}
          onWriteOff={setWrittenOff}
          weeks={weeks}
          pastWKs={pastWKs}
          renderWeek={renderWeek}
          weeksAgo={weeksAgo}
          handleBackup={handleBackup}
          handleICS={handleICS}
          importRef={importRef}
          backupMsg={backupMsg}
          setView={setView}
        />
      )}



      {view==="settings"&&(
        <SettingsView
          priorities={priorities} onChange={setPriorities}
          days={days} deadlines={deadlines} setDeadlines={setDeadlines}
          pastWKs={pastWKs} renderWeek={renderWeek} weeksAgo={weeksAgo} parseWK={parseWK}
          onClose={()=>setView("schedule")}
          onAddWeek={m=>{
            const wk=weekKey(m);
            if(!weeks[wk]) setWeeks(p=>({...p,[wk]:{availDays:randomDaysForWeek(wk),reserve:WR.NONE,reserveNote:"",collapsed:false}}));
          }}
          existingWKs={new Set(sortedWKs)}
          handleBackup={handleBackup}
          handleICS={handleICS}
          importRef={importRef}
          backupMsg={backupMsg}
        />
      )}

      {view==="schedule"&&(
        <ScheduleView
          futureWKs={futureWKs}
          renderWeek={renderWeek}
        />
      )}

      {view==="deadlines"&&(
        <DeadlinesView deadlines={deadlines} setDeadlines={setDeadlines} priorities={priorities} days={days}/>
      )}
      {view==="progress"&&(
        <ProgressView deadlines={deadlines} setDeadlines={setDeadlines} days={days}/>
      )}
      {/* Finance moved to Reports tab */}

      {/* MODALS */}
      {modal?.type==="dayDetail"&&(
        <DayDetailModal dk={modal.dk} wk={modal.wk} dayIdx={modal.dayIdx||0} knownClients={knownClients}
          days={days} weeks={weeks} priorities={priorities}
          getDayInfo={getDayInfo}
          onAddBooking={(dk,b,wk)=>addBooking(dk,b,wk)} onUpdateBooking={updateBooking} onRemoveBooking={removeBooking}
          onClearDay={()=>{
            const idx=modal.dayIdx||0;
            // Remove all bookings and set day to HIDDEN, remove from availDays
            setDays(p=>({...p,[modal.dk]:{status:S.HIDDEN,bookings:[]}}));
            setWeeks(p=>({...p,[modal.wk]:{...p[modal.wk],availDays:(p[modal.wk]?.availDays||[]).filter(d=>d!==idx)}}));
          }}
          onToggleOpen={()=>{
            const idx=modal.dayIdx||0;
            const{status}=getDayInfo(modal.dk,modal.wk,idx);
            const isCurrentlyOpen=status===S.OPEN||(status===S.CLOSED&&weeks[modal.wk]?.availDays?.includes(idx)&&!days[modal.dk]?.status);
            if(isCurrentlyOpen){
              // Hide: set HIDDEN in days AND remove from availDays
              setDays(p=>({...p,[modal.dk]:{...(p[modal.dk]||{}),status:S.HIDDEN}}));
              setWeeks(p=>({...p,[modal.wk]:{...p[modal.wk],availDays:(p[modal.wk]?.availDays||[]).filter(d=>d!==idx)}}));
            } else {
              // Open: set OPEN in days AND add to availDays
              setDays(p=>({...p,[modal.dk]:{...(p[modal.dk]||{}),status:S.OPEN}}));
              setWeeks(p=>{
                const cur=p[modal.wk]?.availDays||[];
                return{...p,[modal.wk]:{...p[modal.wk],availDays:[...new Set([...cur,idx])].sort()}};
              });
            }
          }}
          onClose={()=>setModal(null)}/>
      )}
      {modal?.type==="weekMenu"&&(
        <WeekMenuModal wk={modal.wk} current={weeks[modal.wk]?.reserve} note={weeks[modal.wk]?.reserveNote}
          onSet={(r,n)=>{setWeekReserve(modal.wk,r,n);setModal(null);}} onClose={()=>setModal(null)}/>
      )}
      {addOpen&&(
        <AddWeekModal existingWKs={new Set(sortedWKs)} onAdd={m=>{
          const wk=weekKey(m);
          if(!weeks[wk]) setWeeks(p=>({...p,[wk]:{availDays:randomDaysForWeek(wk),reserve:WR.NONE,reserveNote:"",collapsed:false}}));
          // don't close — user may want to add more
        }} onClose={()=>setAddOpen(false)}/>
      )}
    </div>
  );
}

// ─── SettingsView ────────────────────────────────────────────────────────────
function SettingsView({priorities, onChange, days, deadlines, setDeadlines, pastWKs, renderWeek, weeksAgo, parseWK, onClose, onAddWeek, existingWKs, handleBackup, handleICS, importRef, backupMsg}){
  const [tab,setTab]=useState("priorities");
  const TABS=[["priorities","⚙️ Приоритеты"],["addweek","➕ Недели"],["backup","💾 Данные"]];
  return(
    <div>
      <div style={{display:"flex",gap:4,padding:"12px 14px 0",borderBottom:"1px solid #1e1e1e",flexWrap:"wrap"}}>
        {TABS.map(([t,lbl])=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:"7px 12px",borderRadius:"7px 7px 0 0",fontSize:11,cursor:"pointer",
            fontFamily:"inherit",fontWeight:tab===t?700:400,
            border:`1px solid ${tab===t?"#e0e0d8":"#222"}`,borderBottom:"none",
            background:tab===t?"#1a1a1a":"transparent",
            color:tab===t?"#e0e0d8":"#666",
          }}>{lbl}</button>
        ))}
      </div>
      {tab==="priorities"&&(
        <PrioritySettings priorities={priorities} onChange={onChange}
          onClose={onClose} days={days} deadlines={deadlines} setDeadlines={setDeadlines}/>
      )}
      {tab==="addweek"&&(
        <div style={{padding:14}}>
          <AddWeekModal existingWKs={existingWKs} onAdd={onAddWeek} onClose={()=>setTab("priorities")} inline={true}/>
        </div>
      )}
      {tab==="backup"&&(
        <div style={{padding:14}}>
          <div style={{fontSize:11,color:"#aaa",marginBottom:14}}>Резервные копии и экспорт данных</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button onClick={handleBackup} style={{padding:"12px",borderRadius:8,border:"1px solid #a78bfa",
              background:"#100a1f",color:"#a78bfa",fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:700,textAlign:"left"}}>
              💾 Сохранить резервную копию (JSON)
            </button>
            <button onClick={()=>importRef.current?.click()} style={{padding:"12px",borderRadius:8,border:"1px solid #60a5fa",
              background:"#0a1020",color:"#60a5fa",fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:700,textAlign:"left"}}>
              ⬆️ Восстановить из файла (JSON)
            </button>
            <button onClick={handleICS} style={{padding:"12px",borderRadius:8,border:"1px solid #4fc3f7",
              background:"#091418",color:"#4fc3f7",fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:700,textAlign:"left"}}>
              📆 Экспорт в Google Calendar (.ics)
            </button>
          </div>
          <div style={{marginTop:16,padding:"10px 12px",background:"#0d0d0d",borderRadius:8,border:"1px solid #222",fontSize:10,color:"#555",lineHeight:1.7}}>
            В будущем здесь появится вход через Google аккаунт для синхронизации данных между устройствами.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PrioritySettings ─────────────────────────────────────────────────────────
function PrioritySettings({priorities, onChange, onClose, days, deadlines, setDeadlines}){
  const [local,setLocal] = useState(()=>JSON.parse(JSON.stringify(priorities)));
  const [saved,setSaved] = useState(false);

  const update=(pk,field,val)=>{
    setLocal(p=>({...p,[pk]:{...p[pk],[field]:val}}));
    setSaved(false);
  };
  const save=()=>{ onChange(local); setSaved(true); setTimeout(()=>{ setSaved(false); onClose(); },800); };

  const [visibleCount,setVisibleCount]=useState(6);

  return(
    <div style={{padding:"14px 14px"}}>
      <div style={{fontSize:11,color:"#e8e8e0",letterSpacing:3,textTransform:"uppercase",marginBottom:16}}>
        НАСТРОЙКИ ПРИОРИТЕТОВ
      </div>
      <div style={{fontSize:11,color:"#aaa",marginBottom:12,lineHeight:1.6}}>
        Задай название, лимит, коммерция и срок сдачи. Пустое название — приоритет скрыт.
      </div>
      {/* Generate missing deadlines for existing bookings */}
      {days&&setDeadlines&&(
        <button onClick={()=>{
          const today=new Date(); today.setHours(0,0,0,0);
          let added=0;
          const newDls=[...deadlines];
          Object.entries(days).forEach(([dk,d])=>{
            (d.bookings||[]).forEach(b=>{
              const p=priorities[b.priority];
              if(!p||!p.name||p.hasDue===false) return;
              // Skip if deadline already exists
              if(newDls.some(dl=>dl.bookingId===b.id)) return;
              const baseDays=p.dueAfterDays||7;
              const extra=b.type===BT.NONCOMMERCIAL?5:0;
              const days2=baseDays+extra;
              const bookDate=parseLocalDate(dk);
              const dueDate=new Date(bookDate); dueDate.setDate(dueDate.getDate()+days2);
              newDls.push({
                id:`dl_${b.id}`,bookingId:b.id,bookingDk:dk,
                label:`${p.dueLabel||"Сдать"}: ${p.name}${b.client?" ("+b.client+")":""}`,
                date:dateKey(dueDate),color:p.color||"#4ade80",
                progress:0,done:false,manual:false,
              });
              added++;
            });
          });
          setDeadlines(newDls);
          alert(`Создано ${added} дедлайнов для существующих заданий`);
        }} style={{
          width:"100%",padding:"9px",borderRadius:7,marginBottom:14,
          border:"1px solid #f97316",background:"#1a0900",
          color:"#f97316",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:700,
        }}>⚡ Создать дедлайны для существующих заданий</button>
      )}

      {PRIORITY_KEYS.slice(0,visibleCount).map(pk=>{
        const p=local[pk];
        return(
          <div key={pk} style={{marginBottom:12,padding:"12px 14px",borderRadius:9,
            border:`1px solid ${p.color}55`,background:`${p.color}08`}}>
            {/* Header: dot + key + name */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:12,height:12,borderRadius:"50%",background:p.color,flexShrink:0}}/>
              <span style={{fontSize:12,color:p.color,fontWeight:700,textTransform:"uppercase",minWidth:16}}>{pk}</span>
              <input
                value={p.name}
                onChange={e=>update(pk,"name",e.target.value)}
                placeholder={`Приоритет ${pk.toUpperCase()} — название`}
                style={{...inp,marginBottom:0,fontSize:12,borderColor:`${p.color}44`,flex:1}}
              />
            </div>
            {/* Controls row */}
            <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start"}}>
            {/* Max per week */}
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              <div style={{fontSize:9,color:"#ddd",letterSpacing:1,textTransform:"uppercase"}}>макс/нед</div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <button onClick={()=>update(pk,"maxPerWeek",Math.max(1,p.maxPerWeek-1))}
                  style={{...bSty("#ccc","#bbb"),padding:"2px 7px",fontSize:13}}>−</button>
                <span style={{fontSize:13,color:p.color,fontWeight:700,minWidth:14,textAlign:"center"}}>{p.maxPerWeek}</span>
                <button onClick={()=>update(pk,"maxPerWeek",Math.min(7,p.maxPerWeek+1))}
                  style={{...bSty("#ccc","#bbb"),padding:"2px 7px",fontSize:13}}>+</button>
              </div>
            </div>
            {/* Color picker */}
            <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"center"}}>
              <div style={{fontSize:9,color:"#ddd",letterSpacing:1,textTransform:"uppercase"}}>цвет</div>
              <input type="color" value={p.color} onChange={e=>update(pk,"color",e.target.value)}
                style={{width:32,height:24,border:"none",background:"none",cursor:"pointer",padding:0,borderRadius:4}}/>
            </div>
            {/* Can be commercial toggle */}
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <div style={{fontSize:8,color:"#ddd",letterSpacing:1,textTransform:"uppercase",textAlign:"center"}}>коммерц.</div>
              <div onClick={()=>update(pk,"canBeCommercial",!p.canBeCommercial)} style={{
                width:34,height:19,borderRadius:10,cursor:"pointer",transition:"all .2s",
                background:p.canBeCommercial?"#ef4444":"#333",position:"relative",flexShrink:0,
              }}>
                <div style={{position:"absolute",top:3,left:p.canBeCommercial?17:3,width:13,height:13,
                  borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
              </div>
            </div>
            {/* Due after days + label */}
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              {/* hasDue toggle */}
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3,cursor:"pointer"}}
                onClick={()=>update(pk,"hasDue",!p.hasDue)}>
                <div style={{width:28,height:16,borderRadius:8,transition:"all .2s",flexShrink:0,
                  background:p.hasDue?"#f97316":"#333",position:"relative"}}>
                  <div style={{position:"absolute",top:2,left:p.hasDue?13:2,width:12,height:12,
                    borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
                </div>
                <span style={{fontSize:8,color:p.hasDue?"#f97316":"#555",letterSpacing:1,textTransform:"uppercase"}}>
                  {p.hasDue?"дедлайн":"без дедлайна"}
                </span>
              </div>
              {/* saveStorage toggle */}
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3,cursor:"pointer"}}
                onClick={()=>update(pk,"saveStorage",!p.saveStorage)}>
                <div style={{width:28,height:16,borderRadius:8,transition:"all .2s",flexShrink:0,
                  background:p.saveStorage?"#60a5fa":"#333",position:"relative"}}>
                  <div style={{position:"absolute",top:2,left:p.saveStorage?13:2,width:12,height:12,
                    borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
                </div>
                <span style={{fontSize:8,color:p.saveStorage?"#60a5fa":"#555",letterSpacing:1,textTransform:"uppercase"}}>
                  {p.saveStorage?"💾 хранилище":"без хранилища"}
                </span>
              </div>
              {p.hasDue&&<>
              <div style={{fontSize:9,color:"#ddd",letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>сдать через</div>
              <div style={{display:"flex",alignItems:"center",gap:3}}>
                <button onClick={()=>update(pk,"dueAfterDays",Math.max(1,(p.dueAfterDays||7)-1))}
                  style={{...bSty("#ccc","#555"),padding:"1px 5px",fontSize:12}}>−</button>
                <span style={{fontSize:12,color:p.color,fontWeight:700,minWidth:20,textAlign:"center"}}>{p.dueAfterDays||7}</span>
                <button onClick={()=>update(pk,"dueAfterDays",(p.dueAfterDays||7)+1)}
                  style={{...bSty("#ccc","#555"),padding:"1px 5px",fontSize:12}}>+</button>
                <span style={{fontSize:9,color:"#888"}}>дн.</span>
              </div>
              <input value={p.dueLabel||"Сдать"} onChange={e=>update(pk,"dueLabel",e.target.value)}
                placeholder="Сдать" style={{...inp,marginBottom:0,fontSize:10,padding:"3px 6px",
                borderColor:"#333",width:"100%"}}/>
              </>}
            </div>
            </div>{/* end controls row */}
          </div>
        );
      })}

      {visibleCount<PRIORITY_KEYS.length&&(
        <button onClick={()=>setVisibleCount(v=>Math.min(v+1,PRIORITY_KEYS.length))} style={{
          width:"100%",padding:"8px",borderRadius:7,marginBottom:10,
          border:"1px dashed #444",background:"transparent",
          color:"#888",fontSize:12,cursor:"pointer",fontFamily:"inherit",
        }}>+ Добавить приоритет ({visibleCount}/{PRIORITY_KEYS.length})</button>
      )}

      <button onClick={save} style={{
        marginTop:4,width:"100%",padding:"10px",borderRadius:8,
        border:`1px solid ${saved?"#4ade80":"#bbb"}`,
        background:saved?"#0d1f14":"#1a1a1a",
        color:saved?"#4ade80":"#e0e0d8",
        fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:700,
        transition:"all .2s",
      }}>{saved?"✓ Сохранено":"Сохранить"}</button>
    </div>
  );
}

// ─── PersonalReport ──────────────────────────────────────────────────────────
function PersonalReport({days, priorities, clientTextForPriority, showAmounts}){
  const [mode,setMode]=useState("upcoming"); // upcoming | past | free
  const [upPeriod,setUpPeriod]=useState("month");
  const [pastPeriod,setPastPeriod]=useState("month1");
  const [customFrom,setCustomFrom]=useState("");
  const [customTo,setCustomTo]=useState("");

  const now=new Date(); now.setHours(23,59,59,999);
  const today=new Date(); today.setHours(0,0,0,0);
  const y=today.getFullYear(), m=today.getMonth();

  const UP_PERIODS=[
    {key:"month",   label:"Этот месяц",    from:new Date(y,m,1),          to:new Date(y,m+1,0,23,59,59)},
    {key:"3months", label:"3 месяца",      from:today,                    to:new Date(y,m+3,0,23,59,59)},
    {key:"halfyear",label:"Полгода",        from:today,                    to:new Date(y,m+6,0,23,59,59)},
    {key:"all",     label:"Все",            from:today,                    to:new Date(y+5,0,1)},
  ];
  const PAST_PERIODS=[
    {key:"month1",  label:"Месяц",         from:new Date(y,m-1,today.getDate()), to:now},
    {key:"month2",  label:"2 месяца",      from:new Date(y,m-2,today.getDate()), to:now},
    {key:"month3",  label:"3 месяца",      from:new Date(y,m-3,today.getDate()), to:now},
    {key:"half",    label:"Полгода",        from:new Date(y,m-6,today.getDate()), to:now},
    {key:"all",     label:"Всё время",      from:new Date(0),                    to:now},
    {key:"custom",  label:"Выбрать даты",   from:null,                           to:null},
  ];

  const getRange=()=>{
    if(mode==="upcoming") return UP_PERIODS.find(p=>p.key===upPeriod)||UP_PERIODS[0];
    if(mode==="past"){
      const pp=PAST_PERIODS.find(p=>p.key===pastPeriod)||PAST_PERIODS[0];
      if(pastPeriod==="custom"){
        return{from:customFrom?new Date(customFrom):new Date(0), to:customTo?(()=>{const d=new Date(customTo);d.setHours(23,59,59);return d;})():now};
      }
      return pp;
    }
    return null;
  };

  // Collect bookings in range
  const getBookings=()=>{
    const range=getRange(); if(!range) return [];
    const {from,to}=range;
    const result=[];
    Object.entries(days).forEach(([dk,d])=>{
      const date=parseLocalDate(dk);
      if(date<from||date>to) return;
      (d.bookings||[]).forEach(b=>{
        result.push({...b, date, dk});
      });
    });
    return result.sort((a,b)=>a.date-b.date);
  };

  const bookings=mode==="free"?[]:getBookings();

  const fmt=(n)=>Number(n).toLocaleString("ru-RU")+" €";

  const copyText=()=>{
    if(mode==="free"){
      const lines=[];
      PRIORITY_KEYS.forEach(pk=>{ const t=clientTextForPriority(pk); if(t) lines.push(t); });
      return lines.join("\n\n")||"Нет дат";
    }
    const lines=bookings.map(b=>{
      const dateStr=b.date.toLocaleDateString("ru-RU",{day:"numeric",month:"long"});
      const type=b.type==="commercial"?"Коммерческая":"Некоммерческая";
      const client=b.client||"—";
      const pname=priorities[b.priority]?.name||"";
      const paid=b.type==="commercial"?(b.paid?"Оплачено":"Не оплачено"):"";
      const amount=(showAmounts&&b.type==="commercial"&&b.amount)?fmt(b.amount):"";
      const note=b.note||"";
      return [dateStr, type, client, pname, paid, amount, note].filter(Boolean).join(" · ");
    });
    return lines.join("\n")||"Нет заданий за период";
  };

  const BtnGroup=({items,active,setActive})=>(
    <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
      {items.map(({key,label})=>(
        <button key={key} onClick={()=>setActive(key)} style={{
          padding:"5px 10px",borderRadius:6,fontSize:10,cursor:"pointer",fontFamily:"inherit",
          border:`1px solid ${active===key?"#a78bfa":"#222"}`,
          background:active===key?"#10091f":"#111",
          color:active===key?"#a78bfa":"#aaa",fontWeight:active===key?700:400,
        }}>{label}</button>
      ))}
    </div>
  );

  return(
    <div>
      {/* Mode tabs */}
      <div style={{display:"flex",gap:5,marginBottom:14}}>
        {[["upcoming","⏭ Запланированные"],["past","✅ Прошедшие"],["free","🟢 Свободные"]].map(([k,lbl])=>(
          <button key={k} onClick={()=>setMode(k)} style={{
            flex:1,padding:"7px 4px",borderRadius:7,fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:700,
            border:`1px solid ${mode===k?"#a78bfa":"#222"}`,
            background:mode===k?"#10091f":"#111",
            color:mode===k?"#a78bfa":"#aaa",
          }}>{lbl}</button>
        ))}
      </div>

      {/* Period selectors */}
      {mode==="upcoming"&&<BtnGroup items={UP_PERIODS} active={upPeriod} setActive={setUpPeriod}/>}
      {mode==="past"&&<BtnGroup items={PAST_PERIODS} active={pastPeriod} setActive={setPastPeriod}/>}
      {mode==="past"&&pastPeriod==="custom"&&(
        <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
          <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)}
            style={{...inp,marginBottom:0,flex:1,fontSize:11,colorScheme:"dark"}}/>
          <span style={{color:"#999"}}>—</span>
          <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)}
            style={{...inp,marginBottom:0,flex:1,fontSize:11,colorScheme:"dark"}}/>
        </div>
      )}



      {/* Free dates */}
      {mode==="free"&&(()=>{
        const lines=[];
        PRIORITY_KEYS.forEach(pk=>{ const t=clientTextForPriority(pk); if(t) lines.push(t); });
        const txt=lines.join("\n\n")||"Свободных дат нет.";
        return(
          <>
            <div style={{background:"#111",border:"1px solid #4ade8033",borderRadius:10,padding:14,
              fontSize:12,lineHeight:1.9,whiteSpace:"pre-line",color:"#eee",maxHeight:320,overflowY:"auto"}}>
              {txt}
            </div>
            <button onClick={()=>navigator.clipboard?.writeText(txt)} style={{
              marginTop:10,padding:"8px 16px",background:"#0d1f14",border:"1px solid #4ade80",
              color:"#4ade80",borderRadius:6,fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:700,
            }}>Скопировать</button>
          </>
        );
      })()}

      {/* Bookings table */}
      {mode!=="free"&&(
        <div>
          {/* Summary counters */}
          {bookings.length>0&&(()=>{
            const commCount=bookings.filter(b=>b.type==="commercial").length;
            const nonCCount=bookings.filter(b=>b.type!=="commercial").length;
            return(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                <div style={{background:"#1a0000",border:"1px solid #ef444444",borderRadius:9,padding:"10px 12px",textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#ef4444",marginBottom:4,letterSpacing:1,textTransform:"uppercase"}}>Коммерческих</div>
                  <div style={{fontSize:26,fontWeight:700,color:"#ef4444"}}>{commCount}</div>
                </div>
                <div style={{background:"#0d1120",border:"1px solid #60a5fa44",borderRadius:9,padding:"10px 12px",textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#60a5fa",marginBottom:4,letterSpacing:1,textTransform:"uppercase"}}>Некоммерческих</div>
                  <div style={{fontSize:26,fontWeight:700,color:"#60a5fa"}}>{nonCCount}</div>
                </div>
              </div>
            );
          })()}
          {bookings.length===0?(
            <div style={{fontSize:12,color:"#999",textAlign:"center",padding:"20px 0"}}>
              Заданий за период нет
            </div>
          ):(
            <>
              {bookings.map((b,bi)=>{
                const pname=priorities[b.priority]?.name||"";
                const isComm=b.type==="commercial";
                const pc=priorities[b.priority]?.color||"#ccc";
                return(
                  <div key={bi} style={{
                    padding:"9px 12px",borderRadius:8,marginBottom:6,
                    border:`1px solid ${pc}33`,background:`${pc}08`,
                  }}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:700,color:"#f0f0ec"}}>
                        {b.date.toLocaleDateString("ru-RU",{day:"numeric",month:"long",weekday:"short"})}
                      </span>
                      <span style={{fontSize:10,color:isComm?"#ef4444":"#60a5fa",fontWeight:600}}>
                        {isComm?"Коммерческая":"Некоммерческая"}
                      </span>
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,fontSize:11,color:"#e8e8e0"}}>
                      {b.client&&<span>👤 {b.client}</span>}
                      {pname&&<span style={{color:pc}}>◆ {pname}</span>}
                      {isComm&&<span style={{color:b.paid?"#4ade80":"#ef4444"}}>{b.paid?"✓ Оплачено":"✗ Не оплачено"}</span>}
                      {showAmounts&&isComm&&b.amount&&<span style={{color:"#fbbf24",fontWeight:700}}>{fmt(b.amount)}</span>}
                    </div>
                    {(b.timeStart||b.allDay)&&(
                      <div style={{fontSize:10,color:"#ccc",marginTop:3}}>
                        🕐 {b.allDay?"Весь день":b.timeStart+(b.timeEnd?" – "+b.timeEnd:"")}
                      </div>
                    )}
                    {b.location&&<div style={{fontSize:10,color:"#ccc",marginTop:2}}>📍 {b.location}</div>}
                    {b.note&&<div style={{fontSize:10,color:"#999",marginTop:3,fontStyle:"italic"}}>{b.note}</div>}
                  </div>
                );
              })}
              <button onClick={()=>navigator.clipboard?.writeText(copyText())} style={{
                marginTop:8,padding:"8px 16px",background:"#10091f",border:"1px solid #a78bfa",
                color:"#a78bfa",borderRadius:6,fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:700,
              }}>Скопировать список</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ReportsView ─────────────────────────────────────────────────────────────
function ReportsView({priorities,clientPriority,setClientPriority,showBooked,setShowBooked,selPeriod,setSelPeriod,clientTextForPriority,bookedText,days,showAmounts,writtenOff,onWriteOff,weeks,pastWKs,renderWeek,weeksAgo,handleBackup,handleICS,importRef,backupMsg,setView}){
  const [section,setSection]=useState("client"); // "client" | "personal"

  const BOOKED_PERIODS=[
    {label:"Предстоящие", days:null, future:true},
    {label:"4 недели",    days:28},
    {label:"Полгода",     days:182},
    {label:"2 года",      days:730},
  ];

  const CopyBtn=({txt,color="#60a5fa"})=>(
    <button onClick={()=>navigator.clipboard?.writeText(txt)} style={{
      marginTop:10,padding:"8px 16px",background:`${color}15`,border:`1px solid ${color}`,
      color,borderRadius:6,fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:700,
    }}>Скопировать</button>
  );

  const TextBox=({txt,color="#bbb"})=>(
    <div style={{background:"#111",border:`1px solid ${color}`,borderRadius:10,padding:14,
      fontSize:12,lineHeight:1.9,whiteSpace:"pre-line",color:"#eee",
      fontFamily:"'DM Mono','Courier New',monospace",maxHeight:300,overflowY:"auto"}}>
      {txt}
    </div>
  );

  return(
    <div style={{padding:16}}>
      {/* Header */}
      <div style={{fontSize:14,fontWeight:700,color:"#f0f0ec",marginBottom:4}}>Отчёты / Прогнозы</div>

      {/* Section tabs */}
      <div style={{display:"flex",gap:5,marginBottom:16,flexWrap:"wrap"}}>
        {[["client","👤 Клиенту","#60a5fa"],["personal","🔒 Личное","#a78bfa"],["finance","💶 Финансы","#fbbf24"],["archive","🗄 Архив","#a78bfa"]].map(([s,lbl,clr])=>(
          <button key={s} onClick={()=>setSection(s)} style={{
            flex:1,padding:"9px",borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:700,
            border:`2px solid ${section===s?clr:"#222"}`,
            background:section===s?clr:"#111",
            color:section===s?"#0a0a0a":clr,
            transition:"all .15s",
          }}>{lbl}</button>
        ))}
      </div>

      {/* ── FOR CLIENT ── */}
      {section==="client"&&(
        <div>
          <div style={{fontSize:10,color:"#999",letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>
            Свободные даты для отправки клиенту
          </div>
          {/* Priority picker */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
            {PRIORITY_KEYS.filter(pk=>priorities[pk]?.name).map(pk=>{
              const p=priorities[pk]; const sel=clientPriority===pk;
              return(
                <button key={pk} onClick={()=>setClientPriority(sel?null:pk)} style={{
                  padding:"6px 12px",borderRadius:7,border:`1px solid ${sel?p.color:"#e8e8e0"}`,
                  background:sel?`${p.color}20`:"#111",color:sel?p.color:"#e8e8e0",
                  fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:sel?700:400,
                  display:"flex",alignItems:"center",gap:5,
                }}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:p.color,flexShrink:0}}/>
                  {p.name}
                </button>
              );
            })}
            {PRIORITY_KEYS.filter(pk=>priorities[pk]?.name).length===0&&(
              <div style={{fontSize:11,color:"#999"}}>Настрой приоритеты в ⚙️</div>
            )}
          </div>
          {clientPriority&&(()=>{
            const txt=clientTextForPriority(clientPriority);
            const p=priorities[clientPriority];
            return <>
              <TextBox txt={txt} color={`${p.color}33`}/>
              <CopyBtn txt={txt} color={p.color}/>
            </>;
          })()}
        </div>
      )}

      {/* ── PERSONAL ── */}
      {section==="personal"&&(
        <PersonalReport days={days} priorities={priorities} clientTextForPriority={clientTextForPriority} showAmounts={showAmounts}/>
      )}

      {/* ── FINANCE ── */}
      {section==="finance"&&(
        <FinanceView days={days} priorities={priorities} writtenOff={writtenOff||{}} onWriteOff={()=>{}} showAmounts={showAmounts} setShowAmounts={()=>{}}/>
      )}

      {/* ── ARCHIVE ── */}
      {section==="archive"&&weeks&&(
        <ArchiveView pastWKs={pastWKs} renderWeek={renderWeek} weeksAgo={weeksAgo} parseWK={parseWK}/>
      )}
    </div>
  );
}

function FinanceViewInner({days, priorities}){
  // Lightweight finance summary inside Reports
  const today=new Date(); today.setHours(0,0,0,0);
  const allBookings=[];
  Object.entries(days).forEach(([dk,d])=>{
    (d.bookings||[]).forEach(b=>{
      if(b.type!=="commercial") return;
      allBookings.push({...b,date:parseLocalDate(dk)});
    });
  });
  const unpaid=allBookings.filter(b=>!b.paid);
  const overdue=unpaid.filter(b=>b.date<today);
  const upcoming=unpaid.filter(b=>b.date>=today);
  const fmt=n=>Number(n).toLocaleString("ru-RU")+" €";
  const sum=arr=>arr.reduce((s,b)=>s+parseFloat(b.amount||0),0);
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div style={{background:"#1a0000",border:"1px solid #ef444455",borderRadius:9,padding:"10px 12px"}}>
          <div style={{fontSize:9,color:"#ef4444",marginBottom:3,textTransform:"uppercase"}}>⚠ Просрочено</div>
          <div style={{fontSize:20,fontWeight:700,color:"#ef4444"}}>{fmt(sum(overdue))}</div>
          <div style={{fontSize:9,color:"#666",marginTop:2}}>{overdue.length} заданий</div>
        </div>
        <div style={{background:"#001a0a",border:"1px solid #4ade8055",borderRadius:9,padding:"10px 12px"}}>
          <div style={{fontSize:9,color:"#4ade80",marginBottom:3,textTransform:"uppercase"}}>📅 Предстоит</div>
          <div style={{fontSize:20,fontWeight:700,color:"#4ade80"}}>{fmt(sum(upcoming))}</div>
          <div style={{fontSize:9,color:"#666",marginTop:2}}>{upcoming.length} заданий</div>
        </div>
      </div>
      <div style={{fontSize:10,color:"#555",textAlign:"center"}}>Полная финансовая статистика — в ⚙️ → Финансы</div>
    </div>
  );
}

// ─── ArchiveView ─────────────────────────────────────────────────────────────
function ArchiveView({pastWKs, renderWeek, weeksAgo, parseWK}){
  const [openSections,setOpenSections]=useState({});
  const toggle=k=>setOpenSections(p=>({...p,[k]:!p[k]}));

  const recentWKs=pastWKs.filter(wk=>weeksAgo(wk)<=4).slice().reverse();
  const olderWKs=pastWKs.filter(wk=>weeksAgo(wk)>4);

  // Group older by year
  const byYear={};
  olderWKs.forEach(wk=>{
    const yr=parseWK(wk).getFullYear();
    if(!byYear[yr]) byYear[yr]=[];
    byYear[yr].push(wk);
  });

  return(
    <div style={{padding:"11px 13px"}}>
      <div style={{fontSize:11,color:"#e8e8e0",letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>
        Архив — {pastWKs.length} нед.
      </div>

      {/* Last 4 weeks — always expanded, always editable */}
      {recentWKs.length>0&&(
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:"#4ade80",marginBottom:6,
            display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:8,height:8,borderRadius:2,background:"#4ade80",display:"inline-block"}}/>
            Последние 4 недели — можно редактировать
          </div>
          {recentWKs.map(wk=>renderWeek(wk,false))}
        </div>
      )}

      {/* Older weeks grouped by year — all editable */}
      {Object.keys(byYear).sort().reverse().map(yr=>{
        const yrKey=`yr-${yr}`;
        const isOpen=openSections[yrKey];
        return(
          <div key={yr} style={{marginBottom:6}}>
            <div onClick={()=>toggle(yrKey)} style={{
              display:"flex",alignItems:"center",gap:8,padding:"8px 10px",
              cursor:"pointer",borderRadius:7,
              border:"1px solid #1e1e1e",background:"#0f0f0f",
            }}>
              <span style={{fontSize:10,color:"#999"}}>{isOpen?"▼":"▶"}</span>
              <span style={{fontSize:12,fontWeight:700,color:"#e8e8e0",flex:1}}>{yr}</span>
              <span style={{fontSize:10,color:"#999"}}>{byYear[yr].length} нед.</span>
            </div>
            {isOpen&&(
              <div style={{marginTop:4}}>
                {byYear[yr].slice().reverse().map(wk=>renderWeek(wk,false))}
              </div>
            )}
          </div>
        );
      })}

      {pastWKs.length===0&&(
        <div style={{fontSize:12,color:"#999",textAlign:"center",paddingTop:40}}>
          Прошедших недель пока нет.<br/>
          Добавь через кнопку + → ◀ Назад
        </div>
      )}
    </div>
  );
}

// ─── ScheduleView ────────────────────────────────────────────────────────────
function ScheduleView({futureWKs, renderWeek}){
  return(
    <div style={{padding:"10px 12px"}}>
      {futureWKs.map(wk=>renderWeek(wk,false))}
      {futureWKs.length===0&&(
        <div style={{fontSize:12,color:"#999",textAlign:"center",paddingTop:40}}>
          Нет недель. Нажми + чтобы добавить
        </div>
      )}
    </div>
  );
}

// ─── DayRow ───────────────────────────────────────────────────────────────────
function DayRow({monday,wk,getDayInfo,todayKey,days,priorities,onDayClick,onLongPress,readOnly}){
  const timers=useRef({});
  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
      {Array.from({length:7},(_,i)=>{
        const d=addDays(monday,i); const dk=dateKey(d);
        const{status,bookings}=getDayInfo(dk,wk,i);
        const isToday=dk===todayKey;
        const booked=bookings.length>0;

        let bg="#141414", textColor="#2e2e2e";
        if(booked){
          // Use color of first booking's priority
          const firstPk=bookings[0]?.priority;
          const pc=firstPk?priorities[firstPk]?.color:"#fb923c";
          bg=`${pc}18`; textColor=pc||"#fb923c";
        } else if(status===S.OPEN)    { bg="#0d1f14"; textColor="#4ade80"; }
          else if(status===S.HIDDEN)  { bg="#1a1800"; textColor="#facc15"; }
          else if(status===S.PERSONAL){ bg="#100d1f"; textColor="#a78bfa"; }

        const start=()=>{ if(readOnly)return; timers.current[dk]=setTimeout(()=>{onLongPress(dk,wk,i);timers.current[dk]=null;},480); };
        const end=()=>{ if(readOnly)return; if(timers.current[dk]){clearTimeout(timers.current[dk]);timers.current[dk]=null;onDayClick(dk,wk,i);} };

        // Bottom stripe: mixed = left half orange, right half blue stripes; pure = solid color
        // Top stripe: red only if unpaid commercial exists
        let bottomMixed=false;
        let stripeColor=null;
        let topStripe=false;
        if(booked){
          const hasComm=bookings.some(b=>b.type===BT.COMMERCIAL);
          const hasNonC=bookings.some(b=>b.type===BT.NONCOMMERCIAL);
          const hasUnpaid=bookings.some(b=>b.type===BT.COMMERCIAL&&!b.paid);
          if(hasComm&&hasNonC){ bottomMixed=true; stripeColor="#ef4444"; }
          else if(hasComm)     stripeColor="#ef4444";
          else                 stripeColor="#60a5fa";
          if(hasUnpaid) topStripe=true;
        }

        // Priority center square — highest priority among bookings (a > b > c ...)
        let centerColor=null;
        if(booked){
          const pKeys=["a","b","c","d","e","f","g","h","i","j"];
          for(const pk of pKeys){
            if(bookings.some(b=>b.priority===pk)){
              centerColor=priorities[pk]?.color||null;
              break;
            }
          }
        }

        // Side white lines: 2 bookings → 2 lines, 3 → 3 lines (left edge)
        const lineCount=bookings.length>=2?bookings.length:0;

        // Date text always white on booked days for readability
        const dateTextColor = booked ? "#ffffff" : textColor;

        return(
          <div key={i} onMouseDown={start} onMouseUp={end} onTouchStart={start} onTouchEnd={end}
            style={{cursor:readOnly?"default":"pointer",
              borderRight:i<6?"1px solid #1a1a1a":"none",
              background: booked&&centerColor ? centerColor : bg,
              position:"relative",minHeight:52,
              display:"flex",flexDirection:"column",justifyContent:"flex-start",
              paddingTop:6,overflow:"hidden",
            }}>

            {/* LAYER 1 — bottom: type stripe (commercial/noncommercial) z=1 */}
            {booked&&stripeColor&&!bottomMixed&&(
              <div style={{position:"absolute",bottom:0,left:0,right:0,height:"25%",background:stripeColor,opacity:0.9,zIndex:1,borderTop:"1.5px solid rgba(255,255,255,0.5)"}}/>
            )}
            {booked&&bottomMixed&&(
              <>
                <div style={{position:"absolute",bottom:0,left:0,width:"50%",height:"25%",background:"#ef4444",opacity:0.9,zIndex:1,borderTop:"1.5px solid rgba(255,255,255,0.5)",borderRight:"1px solid rgba(255,255,255,0.3)"}}/>
                <div style={{position:"absolute",bottom:0,left:"50%",right:0,height:"25%",opacity:0.9,zIndex:1,borderTop:"1.5px solid rgba(255,255,255,0.5)",
                  background:"repeating-linear-gradient(45deg,#60a5fa 0px,#60a5fa 3px,#1a1a2a 3px,#1a1a2a 6px)"}}/>
              </>
            )}

            {/* LAYER 2 — top: unpaid red stripe z=2 */}
            {topStripe&&<div style={{position:"absolute",top:0,left:0,right:0,height:"25%",background:"#ef4444",opacity:0.9,zIndex:2}}/>}

            {/* LAYER 3 — day name z=3 */}
            <div style={{fontSize:8,color: booked?"#ffffff":"#aaa",letterSpacing:1,textTransform:"uppercase",
              textAlign:"center",marginBottom:2,position:"relative",zIndex:3,
              textShadow: booked?"0 1px 3px rgba(0,0,0,0.8)":"none"}}>{DAYS_SHORT[i]}</div>

            {/* LAYER 3 — date number, always readable z=3 */}
            <div style={{fontSize:13,fontWeight:700,color:dateTextColor,
              textAlign:"center",flex:1,position:"relative",zIndex:3,
              textShadow: booked?"0 1px 3px rgba(0,0,0,0.8)":"none",
            }}>{d.getDate()}</div>

            {/* Today dot z=4 */}
            {isToday&&<div style={{position:"absolute",top:3,right:4,width:4,height:4,
              borderRadius:"50%",background:"#fff",zIndex:4}}/>}

            {/* LAYER 5 — side lines: 2 or 3 bookings, full height, high contrast z=5 */}
            {lineCount>=2&&Array.from({length:lineCount},(_,li)=>{
              const gap=100/(lineCount+1);
              return <div key={li} style={{
                position:"absolute",left:0,width:3,
                top:`${gap*(li+1) - 8}%`,height:"16%",
                background:"#ffffff",
                borderRadius:1,zIndex:5,
                boxShadow:"0 0 3px rgba(0,0,0,0.6)",
              }}/>;
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── DayDetailModal ───────────────────────────────────────────────────────────
function DayDetailModal({dk,wk,dayIdx,days,weeks,priorities,knownClients,getDayInfo,onAddBooking,onUpdateBooking,onRemoveBooking,onClearDay,onToggleOpen,onClose}){
  const{status,bookings}=getDayInfo(dk,wk,dayIdx);
  const[addForm,setAddForm]=useState(null);
  const[editId,setEditId]=useState(null);
  const[editForm,setEditForm]=useState({});
  const date=parseLocalDate(dk);
  const w=weeks[wk];
  const isOpen=status===S.OPEN||(status===S.CLOSED&&w?.availDays?.includes(dayIdx)&&!days[dk]?.status);
  const avPriorities=availablePriorities(wk,days,priorities);
  const activePriorities=PRIORITY_KEYS.filter(pk=>priorities[pk]?.name);

  const startAdd=()=>setAddForm({priority:avPriorities[0]||PRIORITY_KEYS[0],type:BT.COMMERCIAL,client:"",paid:false,amount:"",note:"",allDay:false,timeStart:"",timeEnd:"",location:"",reminders:[],dueOffset:0,customDueDate:""});
  const confirmAdd=()=>{
    if(!addForm) return;
    const bookingId=Date.now().toString();
    const booking={id:bookingId,...addForm,client:addForm.client.trim(),note:addForm.note.trim()};
    // Store custom due info on booking for later deadline creation
    if(addForm.customDueDate) booking._customDueDate=addForm.customDueDate;
    if(addForm.dueOffset) booking._dueOffset=addForm.dueOffset;
    onAddBooking(dk,booking,wk);
    setAddForm(null);
  };
  const startEdit=(b)=>{ setEditId(b.id); setEditForm({...b}); };
  const saveEdit=()=>{
    const{id,...rest}=editForm;
    Object.entries(rest).forEach(([k,v])=>onUpdateBooking(dk,editId,{[k]:v}));
    setEditId(null);
  };

  return(
    <Overlay>
      <MB style={{maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <ML>День</ML>
            <div style={{fontSize:14,fontWeight:700,lineHeight:1.3}}>{fmtFull(date)}</div>
          </div>
          <button onClick={onClose} style={bSty("#999","#222")}>✕</button>
        </div>

        {bookings.length>0&&(
          <div style={{marginBottom:12}}>
            <ML>Задания ({bookings.length}/3)</ML>
            {bookings.map(b=>
              editId===b.id
                ? <BookingEditCard key={b.id} b={b} ef={editForm} setEf={setEditForm}
                    priorities={priorities} activePriorities={activePriorities}
                    knownClients={knownClients}
                    onSave={saveEdit} onCancel={()=>setEditId(null)}/>
                : <BookingViewCard key={b.id} b={b} priorities={priorities}
                    onEdit={()=>startEdit(b)} onDelete={()=>onRemoveBooking(dk,b.id)}
                    onMarkPaid={(id)=>onUpdateBooking(dk,id,{paid:true})}/>
            )}
          </div>
        )}

        {!editId&&(addForm?(
          <BookingAddForm
            addForm={addForm} setAddForm={setAddForm}
            activePriorities={activePriorities} avPriorities={avPriorities}
            priorities={priorities} knownClients={knownClients}
            dk={dk}
            onConfirm={confirmAdd} onCancel={()=>setAddForm(null)}/>
        ):(
          bookings.length<3&&(
            <button onClick={startAdd} style={{width:"100%",padding:"9px",borderRadius:7,border:"1px dashed #333",
              background:"transparent",color:"#ccc",fontSize:12,cursor:"pointer",fontFamily:"inherit",marginBottom:12}}>
              + Добавить задание {bookings.length>0?`(${bookings.length}/3)`:""}
            </button>
          )
        ))}

        {bookings.length===0&&!addForm&&(
          <Row><Btn onClick={()=>{onToggleOpen();onClose();}} c={isOpen?"#facc15":"#4ade80"} b={isOpen?"#facc15":"#4ade80"} bg="transparent">
            {isOpen?"Скрыть день":"Открыть день"}
          </Btn></Row>
        )}
        {bookings.length>0&&!editId&&!addForm&&(
          <Row>
            <Btn onClick={onClose} c="#999" b="#222" bg="transparent">Закрыть</Btn>
            <Btn onClick={()=>{onClearDay();onClose();}} c="#ef4444" b="#ef4444" bg="#1a0a0a" bold>Очистить день</Btn>
          </Row>
        )}
      </MB>
    </Overlay>
  );
}

function BookingViewCard({b, priorities, onEdit, onDelete, onMarkPaid}){
  const p=priorities[b.priority]; const pc=p?.color||"#ccc";
  const bs=BT_STYLE[b.type]; const isComm=b.type===BT.COMMERCIAL;
  return(
    <div style={{border:`1px solid ${pc}55`,borderRadius:9,padding:"11px 13px",marginBottom:8,background:`${pc}08`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
          <div style={{width:9,height:9,borderRadius:"50%",background:pc,flexShrink:0}}/>
          <span style={{fontSize:12,color:pc,fontWeight:700}}>{p?.name||b.priority}</span>
          <span style={{fontSize:10,color:bs.color,fontWeight:600,opacity:0.9}}>{bs.label}</span>
          {isComm&&<span style={{fontSize:10,fontWeight:700,color:b.paid?"#4ade80":"#ef4444"}}>
            {b.paid?"✓ Оплачено":"✗ Не оплачено"}
          </span>}
        </div>
        <button onClick={onEdit} style={{padding:"6px 14px",borderRadius:6,border:"2px solid #60a5fa",background:"#0d1520",color:"#60a5fa",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>✏ Изменить</button>
      </div>
      {b.client&&<div style={{fontSize:12,color:"#e8e8e0",marginBottom:4}}>👤 {b.client}</div>}
      {isComm&&b.amount&&<div style={{fontSize:13,color:"#fbbf24",fontWeight:700,marginBottom:4}}>💶 {parseFloat(b.amount).toLocaleString("ru-RU")} €</div>}
      {(b.timeStart||b.allDay)&&<div style={{fontSize:11,color:"#ccc",marginBottom:3}}>🕐 {b.allDay?"Весь день":b.timeStart+(b.timeEnd?" – "+b.timeEnd:"")}</div>}
      {b.location&&<div style={{fontSize:11,color:"#ccc",marginBottom:3}}>📍 {b.location}</div>}
      {b.note&&<div style={{fontSize:11,color:"#aaa",fontStyle:"italic",marginTop:4}}>{b.note}</div>}
      {(b.reminders||[]).length>0&&(
        <div style={{fontSize:10,color:"#fbbf24",marginTop:4}}>
          🔔 {(b.reminders||[]).map(r=>r===360?"6 часов":r===1440?"1 сутки":"5 дней").join(", ")}
        </div>
      )}
      <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
        {b.type===BT.COMMERCIAL&&!b.paid&&(
          <button onClick={()=>onMarkPaid(b.id)} style={{
            padding:"5px 14px",borderRadius:6,border:"1px solid #4ade80",
            background:"#0d1f14",color:"#4ade80",fontSize:11,cursor:"pointer",
            fontFamily:"inherit",fontWeight:700,
          }}>✓ Оплачено</button>
        )}
        <button onClick={onDelete} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #ef4444",background:"#130808",color:"#ef4444",fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>🗑 Удалить</button>
      </div>
    </div>
  );
}

function BookingEditCard({b, ef, setEf, priorities, activePriorities, knownClients, onSave, onCancel}){
  const upEf=(k,v)=>setEf(p=>({...p,[k]:v}));
  const p=priorities[ef.priority]; const pc=p?.color||"#ccc";
  return(
    <div style={{border:`2px solid ${pc}`,borderRadius:9,padding:"11px 13px",marginBottom:8,background:`${pc}10`}}>
      <div style={{fontSize:10,color:pc,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>✏ Редактирование</div>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
        {activePriorities.map(pk=>{
          const pp=priorities[pk]; const isSel=ef.priority===pk;
          return <button key={pk} onClick={()=>upEf("priority",pk)} style={{
            padding:"2px 8px",borderRadius:4,border:`1px solid ${isSel?pp.color:"#333"}`,
            background:isSel?`${pp.color}20`:"transparent",color:isSel?pp.color:"#aaa",
            fontSize:9,cursor:"pointer",fontFamily:"inherit",
          }}>{pp.name}</button>;
        })}
      </div>
      <div style={{display:"flex",gap:6,marginBottom:8}}>
        {[BT.COMMERCIAL,BT.NONCOMMERCIAL].filter(t=>t!==BT.COMMERCIAL||priorities[ef.priority]?.canBeCommercial!==false).map(t=>{
          const ts=BT_STYLE[t];
          return <button key={t} onClick={()=>upEf("type",t)} style={{
            flex:1,padding:"5px",borderRadius:6,border:`1px solid ${ef.type===t?ts.color:"#222"}`,
            background:ef.type===t?ts.bg:"transparent",color:ef.type===t?ts.color:"#999",
            fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:ef.type===t?700:400,
          }}>{ts.label}</button>;
        })}
      </div>
      <ClientInput value={ef.client||""} onChange={v=>upEf("client",v)}
        suggestions={knownClients} placeholder="Клиент" style={{...inp,fontSize:12}}/>
      {ef.type===BT.COMMERCIAL&&(
        <input value={ef.amount||""} onChange={e=>upEf("amount",e.target.value)}
          placeholder="Стоимость (€)" type="number" min="0" style={{...inp,fontSize:12}}/>
      )}
      {ef.type===BT.COMMERCIAL&&(
        <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:10,color:"#ccc"}}>Оплата:</div>
          {[["Оплачено",true,"#4ade80"],["Не оплачено",false,"#ef4444"]].map(([lbl,val,clr])=>(
            <button key={lbl} onClick={()=>upEf("paid",val)} style={{
              padding:"4px 10px",borderRadius:5,fontSize:10,cursor:"pointer",fontFamily:"inherit",
              border:`1px solid ${ef.paid===val?clr:"#333"}`,
              background:ef.paid===val?`${clr}18`:"transparent",color:ef.paid===val?clr:"#888",
              fontWeight:ef.paid===val?700:400,
            }}>{lbl}</button>
          ))}
        </div>
      )}
      <input value={ef.note||""} onChange={e=>upEf("note",e.target.value)}
        placeholder="Заметка" style={{...inp,fontSize:11,color:"#e8e8e0"}}/>
      <input value={ef.location||""} onChange={e=>upEf("location",e.target.value)}
        placeholder="📍 Место" style={{...inp,fontSize:11,color:"#e8e8e0"}}/>
      {/* Reminders */}
      <div style={{marginBottom:10}}>
        <div style={{fontSize:9,color:"#aaa",letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>🔔 Напоминания</div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {[{label:"6 часов",val:360},{label:"1 сутки",val:1440},{label:"5 дней",val:7200}].map(({label,val})=>{
            const active=(ef.reminders||[]).includes(val);
            return <button key={val} onClick={()=>upEf("reminders",active?(ef.reminders||[]).filter(r=>r!==val):[...(ef.reminders||[]),val])} style={{
              padding:"4px 11px",borderRadius:6,fontSize:10,cursor:"pointer",fontFamily:"inherit",
              border:`1px solid ${active?"#fbbf24":"#333"}`,
              background:active?"#1a1500":"transparent",
              color:active?"#fbbf24":"#777",fontWeight:active?700:400,
            }}>🔔 {label}</button>;
          })}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8,cursor:"pointer"}}
        onClick={()=>upEf("allDay",!ef.allDay)}>
        <div style={{width:34,height:19,borderRadius:10,transition:"all .2s",
          background:ef.allDay?"#4ade80":"#333",position:"relative",flexShrink:0}}>
          <div style={{position:"absolute",top:3,left:ef.allDay?17:3,width:13,height:13,
            borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
        </div>
        <span style={{fontSize:11,color:ef.allDay?"#4ade80":"#888"}}>Весь день</span>
      </div>
      {!ef.allDay&&(
        <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:9,color:"#888",marginBottom:3}}>Начало</div>
            <input type="time" value={ef.timeStart||""} onChange={e=>upEf("timeStart",e.target.value)}
              style={{...inp,marginBottom:0,fontSize:12,colorScheme:"dark"}}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:9,color:"#888",marginBottom:3}}>Конец</div>
            <input type="time" value={ef.timeEnd||""} onChange={e=>upEf("timeEnd",e.target.value)}
              style={{...inp,marginBottom:0,fontSize:12,colorScheme:"dark"}}/>
          </div>
        </div>
      )}
      <Row>
        <Btn onClick={onCancel} c="#888" b="#333" bg="transparent">Отмена</Btn>
        <Btn onClick={onSave} c="#4ade80" b="#4ade80" bg="#0d1f14" bold>Сохранить</Btn>
      </Row>
    </div>
  );
}

function DeadlinePreview({priority:p, type, dk, dueOffset, customDueDate, onOffsetChange, onCustomDate, onClearCustom}){
  if(!p||!p.name||!dk||p.hasDue===false) return null;
  const base=p.dueAfterDays||7;
  const extra=type===BT.NONCOMMERCIAL?5:0;
  const total=base+extra+dueOffset;
  const bookDate=parseLocalDate(dk);
  let displayDate;
  if(customDueDate){
    displayDate=parseLocalDate(customDueDate);
  } else {
    displayDate=new Date(bookDate); displayDate.setDate(displayDate.getDate()+total);
  }
  const displayStr=displayDate.toLocaleDateString("ru-RU",{day:"numeric",month:"long"});
  return(
    <div style={{marginBottom:10,padding:"10px 12px",borderRadius:8,
      background:`${p.color}10`,border:`1px solid ${p.color}44`}}>
      <div style={{fontSize:10,color:"#aaa",marginBottom:8}}>
        📋 {p.dueLabel||"Сдать"} — срок сдачи:
        {extra>0&&<span style={{color:"#888",marginLeft:5}}>(+{extra} дн. некоммерч.)</span>}
      </div>
      {!customDueDate&&(
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <button onClick={()=>onOffsetChange(dueOffset-1)}
            style={{padding:"4px 14px",borderRadius:6,border:"1px solid #777",background:"#222",
              color:"#fff",fontSize:16,cursor:"pointer",fontWeight:900,fontFamily:"inherit"}}>−</button>
          <span style={{fontSize:13,color:p.color,fontWeight:700,flex:1,textAlign:"center"}}>{displayStr}</span>
          <button onClick={()=>onOffsetChange(dueOffset+1)}
            style={{padding:"4px 14px",borderRadius:6,border:"1px solid #777",background:"#222",
              color:"#fff",fontSize:16,cursor:"pointer",fontWeight:900,fontFamily:"inherit"}}>+</button>
        </div>
      )}
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:10,color:"#666",flexShrink:0}}>Точная дата:</span>
        <input type="date" value={customDueDate}
          onChange={e=>onCustomDate(e.target.value)}
          style={{flex:1,padding:"5px 8px",background:"#111",border:"1px solid #333",
            borderRadius:6,color:"#e0e0d8",fontSize:11,fontFamily:"inherit",outline:"none",colorScheme:"dark"}}/>
        {customDueDate&&(
          <button onClick={onClearCustom}
            style={{padding:"3px 8px",borderRadius:5,border:"1px solid #333",
              background:"transparent",color:"#888",cursor:"pointer",fontFamily:"inherit",fontSize:10}}>✕</button>
        )}
      </div>
    </div>
  );
}

function BookingAddForm({addForm, setAddForm, activePriorities, avPriorities, priorities, knownClients, dk, onConfirm, onCancel}){
  return(
    <div style={{border:"1px solid #2a2a2a",borderRadius:9,padding:"10px 12px",marginBottom:12,background:"#111"}}>
      <ML>Новое задание</ML>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
        {activePriorities.map(pk=>{
          const pp=priorities[pk]; const isSel=addForm.priority===pk; const hasCap=avPriorities.includes(pk);
          return <button key={pk} onClick={()=>setAddForm(f=>({...f,priority:pk}))} style={{
            padding:"3px 9px",borderRadius:5,border:`1px solid ${isSel?pp.color:hasCap?"#bbb":"#3a1a1a"}`,
            background:isSel?`${pp.color}20`:"transparent",color:isSel?pp.color:hasCap?"#aaa":"#553333",
            fontSize:10,cursor:"pointer",fontFamily:"inherit",
          }}>{pp.name}{!hasCap&&<span style={{fontSize:7,color:"#f87171",marginLeft:3}}>лимит</span>}</button>;
        })}
      </div>
      {!avPriorities.includes(addForm.priority)&&(
        <div style={{fontSize:9,color:"#f87171",marginBottom:8}}>⚠ Лимит достигнут — для клиентов недоступно</div>
      )}
      <div style={{display:"flex",gap:6,marginBottom:8}}>
        {[BT.COMMERCIAL,BT.NONCOMMERCIAL].filter(t=>t!==BT.COMMERCIAL||priorities[addForm.priority]?.canBeCommercial!==false).map(t=>{
          const ts=BT_STYLE[t];
          return <button key={t} onClick={()=>setAddForm(f=>({...f,type:t}))} style={{
            flex:1,padding:"6px",borderRadius:6,border:`1px solid ${addForm.type===t?ts.color:"#222"}`,
            background:addForm.type===t?ts.bg:"transparent",color:addForm.type===t?ts.color:"#999",
            fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:addForm.type===t?700:400,
          }}>{ts.label}</button>;
        })}
      </div>
      <ClientInput value={addForm.client} onChange={v=>setAddForm(f=>({...f,client:v}))}
        suggestions={knownClients} placeholder="Имя клиента" style={{...inp,fontSize:12}}/>
      {addForm.type===BT.COMMERCIAL&&(
        <input value={addForm.amount||""} onChange={e=>setAddForm(f=>({...f,amount:e.target.value}))}
          placeholder="Стоимость (€)" type="number" min="0" style={{...inp,fontSize:12}}/>
      )}
      {addForm.type===BT.COMMERCIAL&&(
        <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:10,color:"#ccc"}}>Оплата:</div>
          {[["Оплачено",true,"#4ade80"],["Не оплачено",false,"#ef4444"]].map(([lbl,val,clr])=>(
            <button key={lbl} onClick={()=>setAddForm(f=>({...f,paid:val}))} style={{
              padding:"4px 10px",borderRadius:5,border:`1px solid ${addForm.paid===val?clr:"#333"}`,
              background:addForm.paid===val?`${clr}18`:"transparent",color:addForm.paid===val?clr:"#888",
              fontSize:10,cursor:"pointer",fontFamily:"inherit",
            }}>{lbl}</button>
          ))}
        </div>
      )}
      <input value={addForm.note} onChange={e=>setAddForm(f=>({...f,note:e.target.value}))}
        placeholder="Заметка" style={{...inp,fontSize:11,color:"#e8e8e0"}}/>
      <input value={addForm.location||""} onChange={e=>setAddForm(f=>({...f,location:e.target.value}))}
        placeholder="📍 Место" style={{...inp,fontSize:11,color:"#e8e8e0"}}/>
      {/* Reminders */}
      <div style={{marginBottom:10}}>
        <div style={{fontSize:9,color:"#aaa",letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>🔔 Напоминания</div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {[{label:"6 часов",val:360},{label:"1 сутки",val:1440},{label:"5 дней",val:7200}].map(({label,val})=>{
            const active=(addForm.reminders||[]).includes(val);
            return <button key={val} onClick={()=>setAddForm(f=>({...f,reminders:active?(f.reminders||[]).filter(r=>r!==val):[...(f.reminders||[]),val]}))} style={{
              padding:"4px 11px",borderRadius:6,fontSize:10,cursor:"pointer",fontFamily:"inherit",
              border:`1px solid ${active?"#fbbf24":"#333"}`,
              background:active?"#1a1500":"transparent",
              color:active?"#fbbf24":"#777",fontWeight:active?700:400,
            }}>🔔 {label}</button>;
          })}
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <div onClick={()=>setAddForm(f=>({...f,allDay:!f.allDay,timeStart:"",timeEnd:""}))}
          style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer"}}>
          <div style={{width:34,height:19,borderRadius:10,transition:"all .2s",
            background:addForm.allDay?"#4ade80":"#333",position:"relative",flexShrink:0}}>
            <div style={{position:"absolute",top:3,left:addForm.allDay?17:3,width:13,height:13,
              borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
          </div>
          <span style={{fontSize:11,color:addForm.allDay?"#4ade80":"#888"}}>Весь день</span>
        </div>
      </div>
      {!addForm.allDay&&(
        <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:9,color:"#888",marginBottom:3}}>Начало</div>
            <input type="time" value={addForm.timeStart||""} onChange={e=>setAddForm(f=>({...f,timeStart:e.target.value}))}
              style={{...inp,marginBottom:0,fontSize:12,colorScheme:"dark"}}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:9,color:"#888",marginBottom:3}}>Конец</div>
            <input type="time" value={addForm.timeEnd||""} onChange={e=>setAddForm(f=>({...f,timeEnd:e.target.value}))}
              style={{...inp,marginBottom:0,fontSize:12,colorScheme:"dark"}}/>
          </div>
        </div>
      )}
      {/* Deadline preview */}
      <DeadlinePreview
        priority={priorities[addForm.priority]}
        type={addForm.type}
        dk={dk}
        dueOffset={addForm.dueOffset||0}
        customDueDate={addForm.customDueDate||""}
        onOffsetChange={v=>setAddForm(f=>({...f,dueOffset:v}))}
        onCustomDate={v=>setAddForm(f=>({...f,customDueDate:v,dueOffset:0}))}
        onClearCustom={()=>setAddForm(f=>({...f,customDueDate:"",dueOffset:0}))}
      />
      <Row>
        <Btn onClick={onCancel} c="#ccc" b="#222" bg="transparent">Отмена</Btn>
        <Btn onClick={onConfirm} c="#e0e0d8" b="#bbb" bg="#1a1a1a" bold>Добавить</Btn>
      </Row>
    </div>
  );
}

// ─── WeekMenuModal ────────────────────────────────────────────────────────────
function WeekMenuModal({wk,current,note,onSet,onClose}){
  const[sel,setSel]=useState(current||WR.NONE);
  const[txt,setTxt]=useState(note||"");
  const m=parseWK(wk);
  return <Overlay><MB>
    <ML>Статус недели</ML>
    <div style={{fontSize:12,fontWeight:600,marginBottom:12}}>{fmtShort(m)} – {fmtShort(addDays(m,6))} {m.getFullYear()}</div>
    {[{v:WR.NONE,l:"Обычная неделя",s:"Управление днями вручную",c:"#4ade80"},
      {v:WR.PERSONAL,l:"🔒 Личная бронь",s:"Отпуск, проект, личные дела",c:"#a78bfa"},
      {v:WR.HYPE,l:"✦ Резерв (ажиотаж)",s:"Закрыта внешне, реально свободна",c:"#facc15"}].map(o=>(
      <div key={o.v} onClick={()=>setSel(o.v)} style={{padding:"8px 11px",borderRadius:8,marginBottom:6,cursor:"pointer",
        border:`1px solid ${sel===o.v?o.c:"#1e1e1e"}`,background:sel===o.v?`${o.c}12`:"#111"}}>
        <div style={{fontSize:11,color:sel===o.v?o.c:"#ccc",fontWeight:600}}>{o.l}</div>
        <div style={{fontSize:11,color:"#e8e8e0",marginTop:1}}>{o.s}</div>
      </div>
    ))}
    {sel!==WR.NONE&&<input value={txt} onChange={e=>setTxt(e.target.value)}
      placeholder={sel===WR.PERSONAL?"Пояснение (отпуск, проект…)":"Заметка для себя"} style={{...inp,marginTop:4,marginBottom:10}}/>}
    <Row style={{marginTop:sel===WR.NONE?10:0}}>
      <Btn onClick={onClose} c="#ccc" b="#222" bg="transparent">Отмена</Btn>
      <Btn onClick={()=>onSet(sel,txt.trim())} c="#e0e0d8" b="#bbb" bg="#1a1a1a" bold>Сохранить</Btn>
    </Row>
  </MB></Overlay>;
}

// ─── FinanceView ─────────────────────────────────────────────────────────────
function FinanceView({days, priorities, writtenOff, onWriteOff, showAmounts, setShowAmounts}){
  const [finTab,setFinTab]=useState("overview");
  const [periodKey,setPeriodKey]=useState("cur_month");
  const [customFrom,setCustomFrom]=useState("");
  const [customTo,setCustomTo]=useState("");

  const now=new Date(); now.setHours(23,59,59,999);
  const today=new Date(); today.setHours(0,0,0,0);

  const getRange=()=>{
    const y=today.getFullYear(), m=today.getMonth();
    if(periodKey==="cur_month") return [new Date(y,m,1), now];
    if(periodKey==="prev_month"){ const pm=m===0?11:m-1,py=m===0?y-1:y; return [new Date(py,pm,1),new Date(y,m,0,23,59,59,999)]; }
    if(periodKey==="quarter") return [new Date(y,Math.floor(m/3)*3,1), now];
    if(periodKey==="year") return [new Date(y,0,1), now];
    if(periodKey==="custom"){
      const f=customFrom?new Date(customFrom):new Date(0);
      const t=customTo?new Date(customTo):now; t.setHours(23,59,59,999); return [f,t];
    }
    return [new Date(0),now];
  };

  const PERIODS=[
    {key:"cur_month",label:"Этот месяц"},{key:"prev_month",label:"Прошлый"},
    {key:"quarter",label:"Квартал"},{key:"year",label:"Этот год"},
    {key:"custom",label:"Даты"},{key:"all",label:"Всё время"},
  ];

  const allBookings=[];
  Object.entries(days).forEach(([dk,d])=>{
    (d.bookings||[]).forEach(b=>{
      if(b.type!=="commercial") return;
      allBookings.push({...b,dk,date:parseLocalDate(dk)});
    });
  });

  const [from,to]=getRange();
  const periodBookings=allBookings.filter(b=>b.date>=from&&b.date<=to);
  const periodPaid=periodBookings.filter(b=>b.paid&&!writtenOff[b.id]).reduce((s,b)=>s+parseFloat(b.amount||0),0);
  const periodDebt=periodBookings.filter(b=>!b.paid&&!writtenOff[b.id]).reduce((s,b)=>s+parseFloat(b.amount||0),0);
  const overdueBookings=allBookings.filter(b=>b.date<today&&!b.paid&&!writtenOff[b.id]).sort((a,b2)=>a.date-b2.date);
  const overdueTotal=overdueBookings.reduce((s,b)=>s+parseFloat(b.amount||0),0);
  const upcomingBookings=allBookings.filter(b=>b.date>=today&&!b.paid&&!writtenOff[b.id]).sort((a,b2)=>a.date-b2.date);
  const upcomingTotal=upcomingBookings.reduce((s,b)=>s+parseFloat(b.amount||0),0);

  const fmt=(n)=>Number(n).toLocaleString("ru-RU")+" €";

  const BRow=({b,writeOffBtn=false})=>{
    const isWO=writtenOff[b.id];
    const pname=priorities[b.priority]?.name||"";
    const overdue=b.date<today&&!b.paid;
    return(
      <div style={{padding:"9px 12px",borderRadius:8,marginBottom:6,
        border:`1px solid ${isWO?"#222":overdue?"#ef444444":"#1a2a1a"}`,
        background:isWO?"#0a0a0a":overdue?"#130808":"#0a130a",opacity:isWO?0.4:1}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
          <div style={{flex:1}}>
            <div style={{fontSize:12,color:"#e8e8e0",fontWeight:600,marginBottom:2}}>
              {b.client||"Клиент не указан"}
              {b.amount&&showAmounts&&<span style={{color:overdue?"#ef4444":"#fbbf24",marginLeft:8,fontWeight:700}}>{parseFloat(b.amount).toLocaleString("ru-RU")} €</span>}
            </div>
            <div style={{fontSize:10,color:"#aaa",display:"flex",gap:8,flexWrap:"wrap"}}>
              <span>{b.date.toLocaleDateString("ru-RU",{day:"numeric",month:"short",year:"numeric"})}</span>
              {pname&&<span style={{color:priorities[b.priority]?.color||"#888"}}>◆ {pname}</span>}
              {overdue&&<span style={{color:"#ef4444",fontWeight:700}}>⚠ просрочено</span>}
            </div>
          </div>
          {writeOffBtn
            ?<button onClick={()=>onWriteOff(p=>({...p,[b.id]:!p[b.id]}))} style={{
                padding:"3px 9px",borderRadius:5,fontSize:10,cursor:"pointer",fontFamily:"inherit",flexShrink:0,
                border:`1px solid ${isWO?"#555":"#f87171"}`,background:isWO?"transparent":"#1f0d0d",color:isWO?"#666":"#f87171",
              }}>{isWO?"Восст.":"Списать"}</button>
            :<span style={{fontSize:9,color:b.paid?"#4ade80":"#ef4444",border:`1px solid ${b.paid?"#4ade8044":"#ef444444"}`,borderRadius:4,padding:"2px 6px",flexShrink:0}}>
              {b.paid?"оплачено":"не оплачено"}
            </span>
          }
        </div>
      </div>
    );
  };

  const TS=(active,color="#fbbf24")=>({
    flex:1,padding:"7px 2px",borderRadius:7,fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:active?700:400,
    border:`1px solid ${active?color:"#222"}`,background:active?`${color}18`:"#111",color:active?color:"#777",textAlign:"center",
  });

  return(
    <div style={{padding:16}}>
      <div style={{fontSize:11,color:"#ddd",letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>Финансы</div>

      {/* Toggle amounts */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,padding:"9px 12px",background:"#111",borderRadius:8,border:"1px solid #222"}}>
        <div onClick={()=>setShowAmounts(p=>!p)} style={{width:38,height:22,borderRadius:11,cursor:"pointer",transition:"all .2s",flexShrink:0,background:showAmounts?"#4ade80":"#333",position:"relative"}}>
          <div style={{position:"absolute",top:4,left:showAmounts?19:4,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
        </div>
        <span style={{fontSize:12,color:showAmounts?"#4ade80":"#888",fontWeight:600}}>Показывать суммы в отчётах</span>
      </div>

      {/* Always-visible summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        <div style={{background:"#1a0000",border:"1px solid #ef444455",borderRadius:9,padding:"10px 12px",cursor:"pointer"}} onClick={()=>setFinTab("overdue")}>
          <div style={{fontSize:9,color:"#ef4444",letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>⚠ Просроченный долг</div>
          <div style={{fontSize:20,fontWeight:700,color:overdueTotal>0?"#ef4444":"#4ade80"}}>{showAmounts?fmt(overdueTotal):`${overdueBookings.length} зад.`}</div>
          <div style={{fontSize:9,color:"#888",marginTop:2}}>{overdueBookings.length} неоплач.</div>
        </div>
        <div style={{background:"#001a0a",border:"1px solid #4ade8055",borderRadius:9,padding:"10px 12px",cursor:"pointer"}} onClick={()=>setFinTab("upcoming")}>
          <div style={{fontSize:9,color:"#4ade80",letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>📅 Предстоящие</div>
          <div style={{fontSize:20,fontWeight:700,color:"#4ade80"}}>{showAmounts?fmt(upcomingTotal):`${upcomingBookings.length} зад.`}</div>
          <div style={{fontSize:9,color:"#888",marginTop:2}}>{upcomingBookings.length} запланир.</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:14}}>
        <button style={TS(finTab==="overview","#fbbf24")} onClick={()=>setFinTab("overview")}>📊 Обзор</button>
        <button style={TS(finTab==="overdue","#ef4444")} onClick={()=>setFinTab("overdue")}>⚠ Долги</button>
        <button style={TS(finTab==="upcoming","#4ade80")} onClick={()=>setFinTab("upcoming")}>📅 Планы</button>
        <button style={TS(finTab==="writeoff","#f87171")} onClick={()=>setFinTab("writeoff")}>✗ Списать</button>
      </div>

      {/* OVERVIEW */}
      {finTab==="overview"&&(
        <div>
          <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap"}}>
            {PERIODS.map(p=>(
              <button key={p.key} onClick={()=>setPeriodKey(p.key)} style={{
                padding:"5px 10px",borderRadius:6,fontSize:10,cursor:"pointer",fontFamily:"inherit",
                border:`1px solid ${periodKey===p.key?"#fbbf24":"#333"}`,
                background:periodKey===p.key?"#1a1500":"#111",
                color:periodKey===p.key?"#fbbf24":"#999",fontWeight:periodKey===p.key?700:400,
              }}>{p.label}</button>
            ))}
          </div>
          {periodKey==="custom"&&(
            <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
              <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} style={{...inp,marginBottom:0,flex:1,fontSize:11,colorScheme:"dark"}}/>
              <span style={{color:"#888"}}>—</span>
              <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} style={{...inp,marginBottom:0,flex:1,fontSize:11,colorScheme:"dark"}}/>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div style={{background:"#0d1f14",border:"1px solid #4ade8033",borderRadius:9,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:"#4ade80",marginBottom:4}}>Оплачено</div>
              <div style={{fontSize:18,fontWeight:700,color:"#4ade80"}}>{showAmounts?fmt(periodPaid):`${periodBookings.filter(b=>b.paid).length} зад.`}</div>
            </div>
            <div style={{background:"#1a0d0d",border:"1px solid #ef444433",borderRadius:9,padding:"10px 12px"}}>
              <div style={{fontSize:10,color:"#ef4444",marginBottom:4}}>Не оплачено</div>
              <div style={{fontSize:18,fontWeight:700,color:periodDebt>0?"#ef4444":"#888"}}>{showAmounts?fmt(periodDebt):`${periodBookings.filter(b=>!b.paid).length} зад.`}</div>
            </div>
          </div>
        </div>
      )}

      {/* OVERDUE */}
      {finTab==="overdue"&&(
        <div>
          <div style={{fontSize:10,color:"#ef4444",marginBottom:10,fontWeight:600}}>
            Просроченные неоплаченные ({overdueBookings.length}){showAmounts&&overdueTotal>0&&` — ${fmt(overdueTotal)}`}
          </div>
          {overdueBookings.length===0
            ?<div style={{fontSize:12,color:"#555",textAlign:"center",padding:20}}>Просроченных долгов нет 🎉</div>
            :overdueBookings.map(b=><BRow key={b.id} b={b}/>)
          }
        </div>
      )}

      {/* UPCOMING */}
      {finTab==="upcoming"&&(
        <div>
          <div style={{fontSize:10,color:"#4ade80",marginBottom:10,fontWeight:600}}>
            Предстоящие платежи ({upcomingBookings.length}){showAmounts&&upcomingTotal>0&&` — ${fmt(upcomingTotal)}`}
          </div>
          {upcomingBookings.length===0
            ?<div style={{fontSize:12,color:"#555",textAlign:"center",padding:20}}>Предстоящих платежей нет</div>
            :upcomingBookings.map(b=><BRow key={b.id} b={b}/>)
          }
        </div>
      )}

      {/* WRITE-OFF */}
      {finTab==="writeoff"&&(
        <div>
          <div style={{fontSize:10,color:"#f87171",marginBottom:10,fontWeight:600}}>Списать безнадёжные долги</div>
          {allBookings.filter(b=>!b.paid).length===0
            ?<div style={{fontSize:12,color:"#555",textAlign:"center",padding:20}}>Долгов нет</div>
            :allBookings.filter(b=>!b.paid).sort((a,b2)=>a.date-b2.date).map(b=><BRow key={b.id} b={b} writeOffBtn={true}/>)
          }
          {Object.values(writtenOff).some(v=>v)&&(
            <div style={{marginTop:14}}>
              <div style={{fontSize:10,color:"#555",marginBottom:8}}>— Списанные (не учитываются в долге) —</div>
              {allBookings.filter(b=>writtenOff[b.id]).map(b=><BRow key={b.id} b={b} writeOffBtn={true}/>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AddWeekModal ─────────────────────────────────────────────────────────────
function AddWeekModal({existingWKs,onAdd,onClose,inline=false}){
  const today=new Date(); today.setHours(0,0,0,0);
  const start=getMonday(today);
  const [direction,setDirection]=useState("future"); // "future" | "past"

  // 104 weeks forward or backward
  const allM = direction==="future"
    ? Array.from({length:104},(_,i)=>addWeeks(start,i))
    : Array.from({length:104},(_,i)=>addWeeks(start,-(i+1)));

  const byMonth={}; allM.forEach(m=>{
    const k=`${m.getFullYear()}-${String(m.getMonth()).padStart(2,"0")}`;
    if(!byMonth[k]) byMonth[k]={label:`${MONTHS_SHORT[m.getMonth()]} ${m.getFullYear()}`,ms:[]};
    byMonth[k].ms.push(m);
  });
  const sortedKeys=Object.keys(byMonth).sort(direction==="future"?(a,b)=>a>b?1:-1:(a,b)=>a>b?-1:1);
  const byYear={}; sortedKeys.forEach(k=>{const yr=k.split("-")[0];if(!byYear[yr])byYear[yr]=[];byYear[yr].push(k);});
  const[open,setOpen]=useState(sortedKeys[0]);

  const Inner=(<div style={{maxHeight:"70vh",overflowY:"auto",padding:"4px 0"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <ML>Добавить неделю</ML>
      <button onClick={onClose} style={bSty("#999","#222")}>✕</button>
    </div>
    {/* Direction toggle */}
    <div style={{display:"flex",gap:6,marginBottom:14}}>
      {[["future","▶ Вперёд","#4ade80"],["past","◀ Назад","#a78bfa"]].map(([d,lbl,clr])=>(
        <button key={d} onClick={()=>{setDirection(d);setOpen(null);}} style={{
          flex:1,padding:"7px",borderRadius:7,fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:700,
          border:`1px solid ${direction===d?clr:"#222"}`,
          background:direction===d?`${clr}18`:"transparent",
          color:direction===d?clr:"#999",
        }}>{lbl}</button>
      ))}
    </div>
    {Object.entries(byYear).map(([yr,mks])=>(
      <div key={yr}>
        <div style={{fontSize:11,color:"#e8e8e0",letterSpacing:2,textTransform:"uppercase",padding:"6px 0 3px",borderBottom:"1px solid #1e1e1e",marginBottom:4}}>{yr}</div>
        {mks.map(mk=>{
          const{label,ms}=byMonth[mk];const isO=open===mk;
          return <div key={mk} style={{marginBottom:3}}>
            <div onClick={()=>setOpen(isO?null:mk)} style={{fontSize:11,color:"#999",padding:"4px 2px",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:9,color:"#999"}}>{isO?"▼":"▶"}</span>{label}
            </div>
            {isO&&ms.map(m=>{
              const wk=weekKey(m);const ex=existingWKs.has(wk);
              return <div key={wk} onClick={()=>!ex&&onAdd(m)} style={{
                padding:"6px 10px",borderRadius:6,marginBottom:2,cursor:ex?"default":"pointer",
                border:`1px solid ${ex?"#181818":"#252525"}`,background:ex?"#0d0d0d":"#141414",opacity:ex?0.3:1,
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,color:ex?"#ccc":"#ccc"}}>{fmtShort(m)} – {fmtShort(addDays(m,6))}</span>
                {ex?<span style={{fontSize:9,color:"#999"}}>есть</span>:<span style={{fontSize:16,color:"#4ade80",lineHeight:1}}>+</span>}
              </div>;
            })}
          </div>;
        })}
      </div>
    ))}
  </div>); return inline?Inner:<Overlay><MB style={{maxHeight:"88vh",overflowY:"auto",padding:"16px 13px"}}>{Inner}</MB></Overlay>;
}

// ─── Primitives ───────────────────────────────────────────────────────────────

// ─── DeadlinesView ───────────────────────────────────────────────────────────
function DeadlinesView({deadlines, setDeadlines, priorities, days}){
  const today = new Date(); today.setHours(0,0,0,0);
  const [curYear,setCurYear]  = useState(today.getFullYear());
  const [curMonth,setCurMonth]= useState(today.getMonth());
  const [selected,setSelected]= useState(null);   // dateKey string
  const [showAdd,setShowAdd]  = useState(false);
  const [newDl,setNewDl]      = useState({label:"",date:"",color:"#f97316",progress:0});

  // navigate months
  const prevMonth=()=>{ if(curMonth===0){setCurMonth(11);setCurYear(y=>y-1);}else setCurMonth(m=>m-1); };
  const nextMonth=()=>{ if(curMonth===11){setCurMonth(0);setCurYear(y=>y+1);}else setCurMonth(m=>m+1); };

  // Build calendar grid
  const firstDay = new Date(curYear, curMonth, 1);
  const daysInMonth = new Date(curYear, curMonth+1, 0).getDate();
  const startDow = (firstDay.getDay()+6)%7; // Mon=0

  // Map deadline dates → items
  const dlByDate = {};
  deadlines.forEach(d=>{ if(!dlByDate[d.date]) dlByDate[d.date]=[]; dlByDate[d.date].push(d); });

  const updateDl=(id,changes)=>setDeadlines(p=>p.map(d=>d.id===id?{...d,...changes}:d));
  const deleteDl=(id)=>setDeadlines(p=>p.filter(d=>d.id!==id));

  const addManual=()=>{
    if(!newDl.label||!newDl.date) return;
    setDeadlines(p=>[...p,{...newDl,id:`m_${Date.now()}`,manual:true,done:false}]);
    setNewDl({label:"",date:"",color:"#f97316",progress:0});
    setShowAdd(false);
  };

  const todayKey=dateKey(today);
  const selectedItems=selected?dlByDate[selected]||[]:[];

  return(
    <div style={{padding:14}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontSize:11,color:"#e0e0d8",fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>⏰ Дедлайны</div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setShowAdd(p=>!p)} style={{
            padding:"5px 12px",borderRadius:6,border:"1px solid #f97316",
            background:showAdd?"#1a0900":"transparent",color:"#f97316",
            fontSize:10,cursor:"pointer",fontFamily:"inherit",fontWeight:700,
          }}>+ Добавить</button>

        </div>
      </div>

      {/* Add form */}
      {showAdd&&(
        <div style={{border:"1px solid #2a2a2a",borderRadius:9,padding:"12px 14px",marginBottom:12,background:"#111"}}>
          <div style={{fontSize:9,color:"#aaa",letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Новый дедлайн</div>
          <input value={newDl.label} onChange={e=>setNewDl(p=>({...p,label:e.target.value}))}
            placeholder="Название задачи" style={{...inp,fontSize:12}}/>
          <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"flex-end"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:9,color:"#aaa",marginBottom:3}}>Дата сдачи</div>
              <input type="date" value={newDl.date} onChange={e=>setNewDl(p=>({...p,date:e.target.value}))}
                style={{...inp,marginBottom:0,colorScheme:"dark"}}/>
            </div>
            <div>
              <div style={{fontSize:9,color:"#aaa",marginBottom:3}}>Цвет</div>
              <input type="color" value={newDl.color} onChange={e=>setNewDl(p=>({...p,color:e.target.value}))}
                style={{width:40,height:34,border:"none",background:"none",cursor:"pointer",padding:0}}/>
            </div>
          </div>
          <Row>
            <Btn onClick={()=>setShowAdd(false)} c="#888" b="#333" bg="transparent">Отмена</Btn>
            <Btn onClick={addManual} c="#f97316" b="#f97316" bg="#1a0900" bold>Добавить</Btn>
          </Row>
        </div>
      )}

      {/* Month nav */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <button onClick={prevMonth} style={{...bSty("#aaa","#333"),fontSize:16,padding:"4px 12px"}}>‹</button>
        <span style={{fontSize:13,fontWeight:700,color:"#e8e8e0"}}>
          {MONTHS_NOM[curMonth]} {curYear}
        </span>
        <button onClick={nextMonth} style={{...bSty("#aaa","#333"),fontSize:16,padding:"4px 12px"}}>›</button>
      </div>

      {/* Weekday headers */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:4}}>
        {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(d=>(
          <div key={d} style={{textAlign:"center",fontSize:10,color:"#888",letterSpacing:1,paddingBottom:5,fontWeight:700}}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:16}}>
        {/* Empty cells before first day */}
        {Array.from({length:startDow},(_,i)=>(
          <div key={`e${i}`}/>
        ))}
        {/* Day cells */}
        {Array.from({length:daysInMonth},(_,i)=>{
          const day=i+1;
          const dk2=`${curYear}-${String(curMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const items=dlByDate[dk2]||[];
          const isToday=dk2===todayKey;
          const isSelected=selected===dk2;
          const hasDone=items.length>0&&items.every(d=>d.done);
          const hasOverdue=items.some(d=>!d.done&&parseLocalDate(dk2)<today);

          return(
            <div key={day} onClick={()=>setSelected(isSelected?null:dk2)}
              style={{
                minHeight:46,borderRadius:7,padding:"4px 2px",cursor:"pointer",
                border:`2px solid ${isSelected?"#f97316":isToday?"#4ade80":items.length>0?"#666":"#2a2a2a"}`,
                background:isSelected?"#1a0900":isToday?"#0d1f14":items.length>0?"#181818":"#0d0d0d",
                position:"relative",
              }}>
              {/* Day number */}
              <div style={{textAlign:"center",fontSize:13,fontWeight:isToday||isSelected||items.length>0?700:500,
                color:isToday?"#4ade80":isSelected?"#f97316":items.length>0?"#e8e8e0":"#666",marginBottom:2}}>
                {day}
              </div>
              {/* Deadline dots + progress */}
              {items.length>0&&(
                <div style={{display:"flex",justifyContent:"center",gap:2,flexWrap:"wrap"}}>
                  {items.slice(0,3).map((d,di)=>(
                    <div key={di} style={{
                      width:6,height:6,borderRadius:"50%",
                      background:(()=>{
                        if(d.done) return "#333";
                        const dl=Math.round((parseLocalDate(d.date)-today)/(24*3600*1000));
                        if(dl<0) return "#ef4444";
                        if(dl<=3) return "#fbbf24";
                        if(dl<=7) return "#fb923c";
                        return d.color;
                      })(),
                      opacity:d.done?0.5:1,
                      outline:hasOverdue&&!d.done?"1px solid #ef4444":"none",
                      outlineOffset:1,
                    }}/>
                  ))}
                  {items.length>3&&<div style={{fontSize:7,color:"#666"}}>+{items.length-3}</div>}
                </div>
              )}
              {/* Progress mini bar under dots */}
              {items.length===1&&(items[0].progress||0)>0&&!items[0].done&&(
                <div style={{marginTop:2,height:2,borderRadius:1,background:"#222",overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:1,
                    background:items[0].color,width:`${items[0].progress}%`}}/>
                </div>
              )}
              {items.length===1&&items[0].done&&(
                <div style={{fontSize:6,color:"#4ade80",textAlign:"center",marginTop:1}}>✓</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selected&&(
        <div style={{border:"1px solid #2a2a2a",borderRadius:10,padding:"12px 14px",background:"#0f0f0f"}}>
          <div style={{fontSize:10,color:"#aaa",letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>
            {parseLocalDate(selected).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})}
          </div>
          {selectedItems.length===0&&(
            <div style={{fontSize:12,color:"#555",textAlign:"center",padding:"10px 0"}}>
              Нет дедлайнов на этот день
            </div>
          )}
          {selectedItems.map(d=>{
            const daysLeft=Math.round((parseLocalDate(d.date)-today)/(24*3600*1000));
            // Find original booking for extra info
            const booking=d.bookingDk&&days?
              (days[d.bookingDk]?.bookings||[]).find(b=>b.id===d.bookingId):null;
            return(
              <div key={d.id} style={{
                padding:"10px 12px",borderRadius:8,marginBottom:7,
                border:(()=>{
                  if(d.done) return "1px solid #222";
                  const dl=Math.round((parseLocalDate(d.date)-today)/(24*3600*1000));
                  if(dl<0) return "1px solid #ef444488";
                  if(dl<=3) return "1px solid #fbbf2488";
                  return `1px solid ${d.color}55`;
                })(),
                background:d.done?"#0a0a0a":`${d.color}0a`,
              }}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                    <div style={{width:8,height:8,borderRadius:2,background:d.color,flexShrink:0}}/>
                    <span style={{fontSize:13,color:d.done?"#555":"#e8e8e0",fontWeight:600,
                      textDecoration:d.done?"line-through":"none"}}>{d.label}</span>
                  </div>
                  <div style={{display:"flex",gap:5}}>
                    <button onClick={()=>updateDl(d.id,{done:!d.done})} style={{
                      padding:"3px 9px",borderRadius:5,fontSize:10,cursor:"pointer",fontFamily:"inherit",
                      border:`1px solid ${d.done?"#555":"#4ade80"}`,
                      background:d.done?"transparent":"#0d1f14",
                      color:d.done?"#555":"#4ade80",fontWeight:700,
                    }}>{d.done?"Вернуть":"Готово"}</button>
                    <button onClick={()=>deleteDl(d.id)} style={{...bSty("#ef4444","#ef444433"),fontSize:9}}>✕</button>
                  </div>
                </div>
                {/* Progress */}
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <div style={{flex:1,height:5,borderRadius:3,background:"#222",overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:3,background:d.color,width:`${d.progress||0}%`,transition:"width .3s"}}/>
                  </div>
                  <span style={{fontSize:10,color:d.color,fontWeight:700,minWidth:28}}>{d.progress||0}%</span>
                </div>
                {/* Quick % buttons */}
                <div style={{display:"flex",gap:4}}>
                  {[0,25,50,75,100].map(v=>(
                    <button key={v} onClick={()=>updateDl(d.id,{progress:v,done:v>=100})} style={{
                      padding:"2px 7px",borderRadius:4,fontSize:9,cursor:"pointer",fontFamily:"inherit",
                      border:`1px solid ${(d.progress||0)===v?d.color:"#222"}`,
                      background:(d.progress||0)===v?`${d.color}20`:"transparent",
                      color:(d.progress||0)===v?d.color:"#666",
                    }}>{v}%</button>
                  ))}
                </div>
                {!d.done&&<div style={{fontSize:9,color:daysLeft<0?"#ef4444":daysLeft===0?"#fbbf24":"#666",marginTop:5}}>
                  {daysLeft<0?`Просрочено на ${Math.abs(daysLeft)} дн.`:daysLeft===0?"Сегодня!":daysLeft===1?"Завтра":`Через ${daysLeft} дн.`}
                </div>}
                {/* Booking date + notes from original booking */}
                {booking&&(
                  <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #1e1e1e"}}>
                    {d.bookingDk&&(
                      <div style={{fontSize:10,color:"#888",marginBottom:3}}>
                        📅 Дата съёмки: {parseLocalDate(d.bookingDk).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})}
                      </div>
                    )}
                    {booking.timeStart&&!booking.allDay&&(
                      <div style={{fontSize:10,color:"#888",marginBottom:3}}>
                        🕐 {booking.timeStart}{booking.timeEnd?" – "+booking.timeEnd:""}
                      </div>
                    )}
                    {booking.allDay&&(
                      <div style={{fontSize:10,color:"#888",marginBottom:3}}>🕐 Весь день</div>
                    )}
                    {booking.location&&(
                      <div style={{fontSize:10,color:"#aaa",marginBottom:3}}>📍 {booking.location}</div>
                    )}
                    {booking.note&&(
                      <div style={{fontSize:11,color:"#aaa",fontStyle:"italic",marginTop:2}}>💬 {booking.note}</div>
                    )}
                    {booking.amount&&(
                      <div style={{fontSize:11,color:"#fbbf24",marginTop:2}}>
                        💶 {parseFloat(booking.amount).toLocaleString("ru-RU")} €
                        {" · "}<span style={{color:booking.paid?"#4ade80":"#ef4444"}}>{booking.paid?"Оплачено":"Не оплачено"}</span>
                      </div>
                    )}
                  </div>
                )}
                {/* Notes on the deadline itself */}
                {d.manual&&(
                  <div style={{marginTop:6}}>
                    <input value={d.note||""} onChange={e=>updateDl(d.id,{note:e.target.value})}
                      placeholder="Заметка к дедлайну..."
                      style={{width:"100%",padding:"5px 8px",background:"#111",border:"1px solid #222",
                        borderRadius:5,color:"#aaa",fontSize:11,fontFamily:"inherit",outline:"none",
                        boxSizing:"border-box"}}/>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Clear all button at bottom */}
      {deadlines.length>0&&(
        <div style={{marginTop:20,paddingTop:14,borderTop:"1px solid #1e1e1e"}}>
          <button onClick={()=>{
            if(window.confirm(`Удалить все ${deadlines.length} дедлайнов? Это действие нельзя отменить.`))
              setDeadlines([]);
          }} style={{
            width:"100%",padding:"9px",borderRadius:7,
            border:"1px solid #ef444455",background:"#0d0000",
            color:"#ef4444",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:700,
          }}>✕ Очистить все дедлайны ({deadlines.length})</button>
        </div>
      )}
    </div>
  );
}

// ─── ProgressView ─────────────────────────────────────────────────────────────
function ProgressView({deadlines, setDeadlines, days}){
  const [editingId,setEditingId]=useState(null);
  const active=deadlines.filter(d=>!d.done).sort((a,b)=>a.date.localeCompare(b.date));
  const done=deadlines.filter(d=>d.done);
  const today=new Date(); today.setHours(0,0,0,0);

  const setProgress=(id,val)=>setDeadlines(p=>p.map(d=>d.id===id?{...d,progress:Math.max(0,Math.min(100,val)),done:val>=100}:d));

  return(
    <div style={{padding:14}}>
      <div style={{fontSize:11,color:"#e0e0d8",letterSpacing:2,textTransform:"uppercase",fontWeight:700,marginBottom:14}}>📈 Прогресс выполнения</div>

      {active.length===0&&done.length===0&&(
        <div style={{fontSize:12,color:"#555",textAlign:"center",paddingTop:30}}>Нет активных дедлайнов</div>
      )}

      {active.map(d=>{
        const dt=parseLocalDate(d.date);
        const daysLeft=Math.round((dt-today)/(24*3600*1000));
        const isEditing=editingId===d.id;
        const isOverdue=daysLeft<0;
        const isUrgent=daysLeft>=0&&daysLeft<=3;
        const borderColor=isOverdue?"#ef444466":isUrgent?"#fbbf2466":`${d.color}44`;
        const bg=isOverdue?"#130808":isUrgent?"#1a1500":`${d.color}08`;

        // Find booking info
        const booking=d.bookingDk&&days?
          (days[d.bookingDk]?.bookings||[]).find(b=>b.id===d.bookingId):null;

        return(
          <div key={d.id} onClick={()=>setEditingId(isEditing?null:d.id)}
            style={{padding:"12px 14px",borderRadius:9,marginBottom:10,cursor:"pointer",
              border:`1px solid ${borderColor}`,background:bg,transition:"all .15s"}}>

            {/* Header row */}
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:6}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <div style={{width:8,height:8,borderRadius:2,background:d.color,flexShrink:0}}/>
                  <span style={{fontSize:13,color:"#e8e8e0",fontWeight:700,lineHeight:1.3}}>{d.label}</span>
                </div>
                {/* Meta info always visible */}
                <div style={{display:"flex",flexWrap:"wrap",gap:10,fontSize:10}}>
                  {d.bookingDk&&(
                    <span style={{color:"#aaa"}}>
                      📅 Съёмка: {parseLocalDate(d.bookingDk).toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}
                    </span>
                  )}
                  <span style={{color:"#aaa"}}>
                    ⏰ Сдать: {dt.toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}
                  </span>
                  {booking?.location&&<span style={{color:"#888"}}>📍 {booking.location}</span>}
                </div>
              </div>
              {/* Days left badge */}
              <div style={{
                padding:"4px 10px",borderRadius:20,flexShrink:0,
                background:isOverdue?"#ef444422":isUrgent?"#fbbf2422":"#1a1a1a",
                border:`1px solid ${isOverdue?"#ef4444":isUrgent?"#fbbf24":"#333"}`,
              }}>
                <span style={{fontSize:11,fontWeight:700,
                  color:isOverdue?"#ef4444":isUrgent?"#fbbf24":"#aaa"}}>
                  {isOverdue?`−${Math.abs(daysLeft)}д`:daysLeft===0?"сегодня":daysLeft===1?"завтра":`+${daysLeft}д`}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{height:10,borderRadius:5,background:"#1e1e1e",overflow:"hidden",marginBottom:4}}>
              <div style={{height:"100%",borderRadius:5,
                background:isOverdue?"#ef4444":isUrgent?"#fbbf24":d.color,
                width:`${d.progress||0}%`,transition:"width .3s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:isEditing?10:0}}>
              <span style={{fontSize:9,color:"#555"}}>0%</span>
              <span style={{fontSize:10,color:isOverdue?"#ef4444":isUrgent?"#fbbf24":d.color,fontWeight:700}}>{d.progress||0}%</span>
              <span style={{fontSize:9,color:"#555"}}>100%</span>
            </div>

            {/* Notes/comment from booking */}
            {booking?.note&&(
              <div style={{fontSize:10,color:"#888",fontStyle:"italic",marginTop:4,
                paddingTop:4,borderTop:"1px solid #1e1e1e"}}>
                💬 {booking.note}
              </div>
            )}

            {/* Expanded editor */}
            {isEditing&&(
              <div style={{marginTop:10}} onClick={e=>e.stopPropagation()}>
                <input type="range" min="0" max="100" value={d.progress||0}
                  onChange={e=>setProgress(d.id,parseInt(e.target.value))}
                  style={{width:"100%",accentColor:isOverdue?"#ef4444":isUrgent?"#fbbf24":d.color,marginBottom:8}}/>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {[0,25,50,75,100].map(v=>(
                    <button key={v} onClick={()=>setProgress(d.id,v)}
                      style={{flex:1,padding:"6px 4px",borderRadius:5,fontSize:11,cursor:"pointer",fontFamily:"inherit",
                        border:`1px solid ${(d.progress||0)===v?d.color:"#333"}`,
                        background:(d.progress||0)===v?`${d.color}20`:"transparent",
                        color:(d.progress||0)===v?d.color:"#888",fontWeight:(d.progress||0)===v?700:400,
                      }}>{v}%</button>
                  ))}
                </div>
                {booking&&(
                  <div style={{marginTop:10,padding:"8px 10px",background:"#111",borderRadius:7,fontSize:10,color:"#aaa",lineHeight:1.7}}>
                    {booking.client&&<div>👤 {booking.client}</div>}
                    {booking.amount&&<div>💶 {parseFloat(booking.amount).toLocaleString("ru-RU")} € · <span style={{color:booking.paid?"#4ade80":"#ef4444"}}>{booking.paid?"Оплачено":"Не оплачено"}</span></div>}
                    {booking.timeStart&&<div>🕐 {booking.allDay?"Весь день":booking.timeStart+(booking.timeEnd?" – "+booking.timeEnd:"")}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {done.length>0&&(
        <div style={{marginTop:16}}>
          <div style={{fontSize:9,color:"#555",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>✓ Выполненные ({done.length})</div>
          {done.map(d=>{
            const booking=d.bookingDk&&days?(days[d.bookingDk]?.bookings||[]).find(b=>b.id===d.bookingId):null;
            return(
              <div key={d.id} style={{padding:"9px 13px",borderRadius:8,marginBottom:5,
                border:"1px solid #1e1e1e",background:"#0a0a0a",
                display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:"#444",textDecoration:"line-through",marginBottom:2}}>{d.label}</div>
                  {d.bookingDk&&<div style={{fontSize:9,color:"#333"}}>
                    📅 {parseLocalDate(d.bookingDk).toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}
                    {" · "}⏰ {parseLocalDate(d.date).toLocaleDateString("ru-RU",{day:"numeric",month:"short"})}
                  </div>}
                </div>
                <button onClick={()=>setDeadlines(p=>p.map(x=>x.id===d.id?{...x,done:false,progress:x.progress>=100?90:x.progress}:x))}
                  style={{...bSty("#666","#333"),fontSize:9,flexShrink:0}}>Вернуть</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ClientInput with autocomplete ───────────────────────────────────────────
function ClientInput({value,onChange,suggestions,placeholder,style}){
  const[show,setShow]=useState(false);
  const filtered=suggestions.filter(s=>s.toLowerCase().includes(value.toLowerCase())&&s!==value);
  return(
    <div style={{position:"relative"}}>
      <input value={value} onChange={e=>{onChange(e.target.value);setShow(true);}}
        onFocus={()=>setShow(true)} onBlur={()=>setTimeout(()=>setShow(false),150)}
        placeholder={placeholder} style={style}/>
      {show&&filtered.length>0&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#1a1a1a",
          border:"1px solid #333",borderRadius:6,zIndex:50,maxHeight:120,overflowY:"auto"}}>
          {filtered.map(s=>(
            <div key={s} onMouseDown={()=>{onChange(s);setShow(false);}}
              style={{padding:"6px 10px",fontSize:11,color:"#e8e8e0",cursor:"pointer",
                borderBottom:"1px solid #222"}}
              onMouseEnter={e=>e.target.style.background="#aaa"}
              onMouseLeave={e=>e.target.style.background="transparent"}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({color,children}){ return <span style={{fontSize:11,color,border:`1px solid ${color}44`,borderRadius:4,padding:"1px 5px",background:`${color}12`}}>{children}</span>; }
const inp={width:"100%",padding:"8px 10px",background:"#0d0d0d",border:"1px solid #2a2a2a",borderRadius:7,color:"#f0f0ec",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:10};
function bSty(c,b){return{fontSize:10,padding:"2px 7px",borderRadius:4,border:`1px solid ${b}`,background:"transparent",color:c,cursor:"pointer",fontFamily:"inherit"};}
function Overlay({children}){
  return <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,
    background:"rgba(0,0,0,.88)",display:"flex",alignItems:"flex-start",
    justifyContent:"center",zIndex:9999,padding:"16px",overflowY:"auto",
  }}>{children}</div>;
}
function MB({children,style}){return <div style={{background:"#141414",border:"1px solid #222",borderRadius:14,padding:18,width:"100%",maxWidth:420,marginTop:8,...style}}>{children}</div>;}
function ML({children}){return <div style={{fontSize:9,letterSpacing:3,color:"#ddd",textTransform:"uppercase",marginBottom:7}}>{children}</div>;}
function Row({children,style}){return <div style={{display:"flex",gap:8,...style}}>{children}</div>;}
function Btn({children,onClick,c,b,bg,bold}){return <button onClick={onClick} style={{flex:1,padding:"8px",borderRadius:7,border:`1px solid ${b}`,background:bg,color:c,fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:bold?700:400}}>{children}</button>;}
