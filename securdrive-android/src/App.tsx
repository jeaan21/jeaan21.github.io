/**
 * SecurDrive — Sistema de Control Vehicular
 * Android App v1.0 (Capacitor + PWA)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Camera, History, Plus, Search, FileText,
  X, Trash2, Clock, CheckCircle2, Car, ChevronLeft,
  MessageCircle, AlertCircle, Loader2, Moon, Sun,
  MapPin, Gauge, User, Shield, LogOut,
  Zap, TrendingUp, Package, RefreshCw
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, formatDistanceToNow, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import confetti from 'canvas-confetti';
import { db, type VehicleRecord, type VehicleType } from './db';
import { scanPlateFromImage } from './services/geminiService';
import { generatePDFReport, getWhatsAppText } from './services/pdfService';

// ── TYPES ─────────────────────────────────────────────────────────────────
type AppScreen = 'SETUP' | 'DASHBOARD' | 'SCANNER' | 'FORM' | 'HISTORY';
interface GuardInfo { name: string; shift: 'Día' | 'Noche' }

// ── CONSTANTS ─────────────────────────────────────────────────────────────
const VEHICLE_TYPES: VehicleType[] = [
  'Camioneta','Cisterna de agua','Cisterna de combustible','Bus',
  'Minibús','Excavadora','Retroexcavadora','Cargador frontal',
  'Tracto','Sprinter','Custer','Plataforma','Encapsulado',
];
const ICONS: Record<string, string> = {
  'Camioneta':'🚙','Cisterna de agua':'💧','Cisterna de combustible':'⛽',
  'Bus':'🚌','Minibús':'🚐','Excavadora':'🏗️','Retroexcavadora':'🚜',
  'Cargador frontal':'🏗️','Tracto':'🚛','Sprinter':'🚐',
  'Custer':'🚐','Plataforma':'🚚','Encapsulado':'🚚',
};
const HAS_SECONDARY = ['Plataforma','Encapsulado'];
const TR = { duration: 0.22, ease: [0.4,0,0.2,1] as const };

// ── TOAST ─────────────────────────────────────────────────────────────────
type TType = 'success'|'error'|'info';
interface IToast { id:number; msg:string; type:TType }
let tid=0;
const tlisteners:((t:IToast)=>void)[]=[];
function toast(msg:string, type:TType='info'){
  const t={id:++tid,msg,type};
  tlisteners.forEach(l=>l(t));
}

function Toasts(){
  const [list,setList]=useState<IToast[]>([]);
  useEffect(()=>{
    const h=(t:IToast)=>{
      setList(p=>[...p,t]);
      setTimeout(()=>setList(p=>p.filter(x=>x.id!==t.id)),3500);
    };
    tlisteners.push(h);
    return ()=>{const i=tlisteners.indexOf(h);if(i>-1)tlisteners.splice(i,1)};
  },[]);
  return (
    <div className="fixed top-0 inset-x-0 z-[200] flex flex-col items-center gap-2 pt-4 px-4 pointer-events-none" style={{paddingTop:'calc(env(safe-area-inset-top,0px) + 16px)'}}>
      <AnimatePresence>
        {list.map(t=>(
          <motion.div key={t.id} initial={{opacity:0,y:-20,scale:0.9}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-8}} transition={{duration:0.2}}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold shadow-2xl max-w-sm w-full pointer-events-auto
              ${t.type==='success'?'bg-emerald-500 text-white':t.type==='error'?'bg-red-500 text-white':'bg-neutral-800 text-white border border-neutral-700'}`}>
            {t.type==='success'?<CheckCircle2 className="w-4 h-4 shrink-0"/>:t.type==='error'?<AlertCircle className="w-4 h-4 shrink-0"/>:<Zap className="w-4 h-4 shrink-0"/>}
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── SETUP ─────────────────────────────────────────────────────────────────
function SetupScreen({onStart}:{onStart:(g:GuardInfo)=>void}){
  const [name,setName]=useState('');
  const [shift,setShift]=useState<'Día'|'Noche'>('Día');
  useEffect(()=>{const h=new Date().getHours();setShift(h>=6&&h<18?'Día':'Noche');},[]);
  return(
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6" style={{paddingTop:'env(safe-area-inset-top,0px)'}}>
      <div className="absolute inset-0 opacity-[0.025]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'40px 40px'}}/>
      <motion.div className="relative w-full max-w-sm space-y-8" initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={TR}>
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-600 shadow-2xl shadow-blue-600/40 mb-2">
            <Shield className="w-10 h-10 text-white"/>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">SecurDrive</h1>
          <p className="text-neutral-500 text-sm">Control Vehicular Inteligente</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-5 shadow-2xl">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Vigilante de turno</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500"/>
              <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre completo"
                className="w-full bg-neutral-800 border border-neutral-700 focus:border-blue-500 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder:text-neutral-600 outline-none transition-colors text-sm font-medium"
                onKeyDown={e=>e.key==='Enter'&&name.trim()&&onStart({name:name.trim(),shift})}/>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Horario de turno</label>
            <div className="grid grid-cols-2 gap-2">
              {(['Día','Noche'] as const).map(s=>(
                <button key={s} onClick={()=>setShift(s)}
                  className={`flex items-center justify-center gap-2 py-3.5 rounded-xl border font-semibold text-sm transition-all
                    ${shift===s?s==='Día'?'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/20':'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20':'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>
                  {s==='Día'?<Sun className="w-4 h-4"/>:<Moon className="w-4 h-4"/>} Turno {s}
                </button>
              ))}
            </div>
          </div>
          <button disabled={!name.trim()} onClick={()=>onStart({name:name.trim(),shift})}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-base shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98]">
            Iniciar Jornada →
          </button>
        </div>
        <p className="text-center text-neutral-700 text-xs">Datos almacenados localmente en el dispositivo</p>
      </motion.div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
function Dashboard({guard,onScan,onManual,onHistory,onLogout,onOpenRecord}:{
  guard:GuardInfo; onScan:()=>void; onManual:()=>void;
  onHistory:()=>void; onLogout:()=>void; onOpenRecord:(r:VehicleRecord)=>void;
}){
  const records=useLiveQuery(()=>db.records.orderBy('exitTime').reverse().limit(50).toArray());
  const pending=useLiveQuery(()=>db.records.where('status').equals('PENDING').count())??0;
  const todayAll=records?.filter(r=>isToday(new Date(r.exitTime))).length??0;
  const todayDone=records?.filter(r=>isToday(new Date(r.exitTime))&&r.status==='COMPLETED').length??0;
  const recent=records?.slice(0,8)??[];

  return(
    <div className="min-h-screen bg-neutral-950 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-xl border-b border-neutral-900 px-5 py-4" style={{paddingTop:'calc(env(safe-area-inset-top,0px) + 16px)'}}>
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${guard.shift==='Día'?'bg-amber-400':'bg-indigo-400'} animate-pulse`}/>
            <div>
              <p className="text-white font-semibold text-sm leading-none">{guard.name}</p>
              <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Turno {guard.shift}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={onHistory} className="p-2.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-all"><History className="w-5 h-5"/></button>
            <button onClick={onLogout} className="p-2.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-xl transition-all"><LogOut className="w-4 h-4"/></button>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 pb-24 max-w-xl mx-auto space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {label:'En Planta',val:pending,color:'orange',icon:<Package className="w-4 h-4"/>},
            {label:'Hoy',val:todayAll,color:'blue',icon:<TrendingUp className="w-4 h-4"/>},
            {label:'Listos',val:todayDone,color:'emerald',icon:<CheckCircle2 className="w-4 h-4"/>},
          ].map(s=>(
            <div key={s.label} className={`rounded-2xl border p-3
              ${s.color==='orange'?'text-orange-400 bg-orange-400/10 border-orange-400/20':
                s.color==='blue'?'text-blue-400 bg-blue-400/10 border-blue-400/20':
                'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'}`}>
              <div className="opacity-70 mb-1">{s.icon}</div>
              <div className="text-2xl font-black leading-none">{s.val}</div>
              <div className="text-[9px] font-bold uppercase tracking-wider opacity-60 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Scan button */}
        <motion.button onClick={onScan} whileTap={{scale:0.97}}
          className="relative w-full bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden group active:border-blue-500/50 transition-colors"
          style={{aspectRatio:'16/9'}}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-blue-600/5"/>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="pulse-ring absolute inset-0 rounded-full bg-blue-500/20"/>
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40 group-active:shadow-blue-600/60 transition-shadow">
                <Camera className="w-9 h-9 text-white"/>
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg tracking-tight">ESCANEAR PLACA</p>
              <p className="text-neutral-500 text-xs font-medium mt-0.5">Detección automática con IA</p>
            </div>
          </div>
          {/* Corner marks */}
          {[['top-3 left-3','border-l-2 border-t-2 rounded-tl'],['top-3 right-3','border-r-2 border-t-2 rounded-tr'],
            ['bottom-3 left-3','border-l-2 border-b-2 rounded-bl'],['bottom-3 right-3','border-r-2 border-b-2 rounded-br']
          ].map(([pos,cls],i)=>(
            <div key={i} className={`absolute w-5 h-5 border-blue-500/50 ${pos} ${cls}`}/>
          ))}
        </motion.button>

        {/* Manual */}
        <button onClick={onManual}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-neutral-800 rounded-2xl text-neutral-500 hover:text-white hover:border-neutral-600 transition-all text-sm font-medium">
          <Plus className="w-4 h-4"/> Ingreso manual de placa
        </button>

        {/* Recent */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-sm">Actividad Reciente</h3>
            <button onClick={onHistory} className="text-blue-500 text-xs font-semibold">Ver historial →</button>
          </div>
          <div className="space-y-2">
            {recent.map(r=>(
              <motion.div key={r.id} onClick={()=>onOpenRecord(r)} whileTap={{scale:0.98}}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between cursor-pointer active:border-neutral-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg
                    ${r.status==='PENDING'?'bg-orange-500/10':'bg-emerald-500/10'}`}>
                    {ICONS[r.type]||'🚗'}
                  </div>
                  <div>
                    <p className="plate-text text-white font-bold text-sm leading-none">{r.plate}</p>
                    <p className="text-neutral-500 text-[11px] font-medium mt-0.5 truncate max-w-[150px]">{r.type} · {r.driver}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-bold ${r.status==='PENDING'?'text-orange-400':'text-emerald-400'}`}>
                    {r.status==='PENDING'?'EN PLANTA':'RETORNÓ'}
                  </p>
                  <p className="text-neutral-600 text-[10px] mt-0.5">{format(new Date(r.exitTime),'HH:mm')}</p>
                </div>
              </motion.div>
            ))}
            {recent.length===0&&(
              <div className="text-center py-14 border border-dashed border-neutral-800 rounded-2xl">
                <Car className="w-10 h-10 text-neutral-700 mx-auto mb-3"/>
                <p className="text-neutral-600 text-sm font-medium">Sin registros hoy</p>
                <p className="text-neutral-700 text-xs mt-1">Escanee una placa para comenzar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SCANNER ───────────────────────────────────────────────────────────────
function ScannerScreen({onCapture,onManual,onCancel}:{
  onCapture:(b64:string)=>void; onManual:()=>void; onCancel:()=>void;
}){
  const videoRef=useRef<HTMLVideoElement>(null);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [processing,setProcessing]=useState(false);
  const [err,setErr]=useState('');
  const [torch,setTorch]=useState(false);
  const streamRef=useRef<MediaStream|null>(null);

  useEffect(()=>{
    let alive=true;
    navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}
    }).then(s=>{
      if(!alive){s.getTracks().forEach(t=>t.stop());return;}
      streamRef.current=s;
      if(videoRef.current) videoRef.current.srcObject=s;
    }).catch(()=>setErr('No se pudo acceder a la cámara. Verifique los permisos en Configuración.'));
    return ()=>{ alive=false; streamRef.current?.getTracks().forEach(t=>t.stop()); };
  },[]);

  const toggleTorch=async()=>{
    const track=streamRef.current?.getVideoTracks()[0];
    if(!track) return;
    try{ await (track as any).applyConstraints({advanced:[{torch:!torch}]}); setTorch(!torch); }catch{}
  };

  const capture=async()=>{
    if(!canvasRef.current||!videoRef.current||processing) return;
    setProcessing(true);
    const cv=canvasRef.current, vd=videoRef.current;
    cv.width=vd.videoWidth; cv.height=vd.videoHeight;
    cv.getContext('2d')?.drawImage(vd,0,0);
    const b64=cv.toDataURL('image/jpeg',0.92);
    streamRef.current?.getTracks().forEach(t=>t.stop());
    onCapture(b64);
  };

  return(
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="relative flex-1 overflow-hidden">
        {err?(
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div className="space-y-4">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto"/>
              <p className="text-white font-semibold">{err}</p>
              <button onClick={onManual} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold active:scale-95 transition-transform">
                Ingresar manualmente
              </button>
            </div>
          </div>
        ):(
          <>
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover"/>
            <div className="absolute inset-0 bg-black/40"/>
            {/* Viewfinder */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
              <p className="text-white/70 text-sm font-medium tracking-wider uppercase bg-black/30 px-4 py-1.5 rounded-full">
                Encuadre la placa
              </p>
              <div className="relative w-[80vw] max-w-xs" style={{aspectRatio:'3/1'}}>
                <div className="absolute inset-0 rounded-xl border-2 border-white/20"/>
                {[['top-0 left-0 border-l-4 border-t-4 rounded-tl-xl'],['top-0 right-0 border-r-4 border-t-4 rounded-tr-xl'],
                  ['bottom-0 left-0 border-l-4 border-b-4 rounded-bl-xl'],['bottom-0 right-0 border-r-4 border-b-4 rounded-br-xl']
                ].map(([cls],i)=><div key={i} className={`absolute w-7 h-7 border-blue-400 ${cls}`}/>)}
                {!processing&&<div className="scan-line absolute left-0 right-0 h-0.5 bg-blue-400/80 shadow-lg shadow-blue-400/50"/>}
              </div>
              {processing&&(
                <div className="flex items-center gap-2 text-blue-400 bg-black/50 px-4 py-2 rounded-full">
                  <Loader2 className="w-4 h-4 animate-spin"/>
                  <span className="text-sm font-semibold">Analizando...</span>
                </div>
              )}
            </div>
            {/* Top controls */}
            <div className="absolute left-0 right-0 flex items-center justify-between px-5" style={{top:'calc(env(safe-area-inset-top,0px) + 20px)'}}>
              <button onClick={onCancel} className="p-3 bg-black/60 backdrop-blur-sm rounded-full text-white active:scale-90 transition-transform">
                <X className="w-5 h-5"/>
              </button>
              <button onClick={toggleTorch} className={`p-3 rounded-full backdrop-blur-sm text-white active:scale-90 transition-transform ${torch?'bg-amber-500/80':'bg-black/60'}`}>
                <Zap className="w-5 h-5"/>
              </button>
            </div>
          </>
        )}
      </div>
      {/* Bottom */}
      <div className="bg-neutral-950 px-8 py-6 flex flex-col items-center gap-4" style={{paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 24px)'}}>
        <button onClick={capture} disabled={!!err||processing}
          className="w-20 h-20 rounded-full border-4 border-white/20 bg-white flex items-center justify-center disabled:opacity-50 active:scale-90 transition-transform shadow-2xl">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            {processing?<Loader2 className="w-8 h-8 text-white animate-spin"/>:<Camera className="w-8 h-8 text-white"/>}
          </div>
        </button>
        <button onClick={onManual} className="text-neutral-500 text-sm font-semibold active:text-white transition-colors">
          Ingresar placa manualmente
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden"/>
    </div>
  );
}

// ── FORM ──────────────────────────────────────────────────────────────────
function FormScreen({record,guard,onSave,onBack,onScanMore}:{
  record:Partial<VehicleRecord>; guard:GuardInfo;
  onSave:(r:Partial<VehicleRecord>)=>Promise<void>;
  onBack:()=>void; onScanMore:()=>void;
}){
  const isReturn=!!record.id;
  const [form,setForm]=useState<Partial<VehicleRecord>>({type:'Camioneta',driver:'',destination:'',observations:'',...record,shift:guard.shift,guard:guard.name});
  const [saving,setSaving]=useState(false);
  const [preview,setPreview]=useState<string|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const set=(p:Partial<VehicleRecord>)=>setForm(prev=>({...prev,...p}));

  const addPhoto=(b64:string,isRet:boolean)=>{
    if(isRet) set({returnPhotos:[...(form.returnPhotos??[]),b64]});
    else set({exitPhotos:[...(form.exitPhotos??[]),b64]});
  };
  const onFile=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>addPhoto(ev.target?.result as string,isReturn);
    r.readAsDataURL(f);
    e.target.value='';
  };
  const removePhoto=(i:number)=>{
    if(isReturn) set({returnPhotos:form.returnPhotos?.filter((_,j)=>j!==i)});
    else set({exitPhotos:form.exitPhotos?.filter((_,j)=>j!==i)});
  };

  const canSave=form.plate&&form.driver?.trim()&&form.destination?.trim()&&
    (isReturn?!!form.returnMileage:!!form.exitMileage);

  const handleSave=async()=>{
    if(!canSave||saving) return;
    setSaving(true);
    try{ await onSave(form); }
    catch{ toast('Error al guardar el registro','error'); setSaving(false); }
  };

  const photos=isReturn?(form.returnPhotos??[]):(form.exitPhotos??[]);
  const accent=isReturn?'bg-emerald-600 shadow-emerald-600/30':'bg-orange-600 shadow-orange-600/30';
  const hdr=isReturn?'from-emerald-950':'from-orange-950';

  return(
    <div className="min-h-screen bg-neutral-950" style={{paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
      {/* Header */}
      <div className={`bg-gradient-to-b ${hdr} to-neutral-950 px-5 pb-8 relative`} style={{paddingTop:'calc(env(safe-area-inset-top,0px) + 56px)'}}>
        <button onClick={onBack} className="absolute left-4 p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white" style={{top:'calc(env(safe-area-inset-top,0px) + 12px)'}}>
          <X className="w-5 h-5"/>
        </button>
        <div className="text-center mt-2">
          <div className={`inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 ${isReturn?'bg-emerald-500/20 text-emerald-400':'bg-orange-500/20 text-orange-400'}`}>
            {isReturn?'✅ Registro de Retorno':'🚗 Registro de Salida'}
          </div>
          <h2 className="plate-text text-4xl font-black text-white tracking-wider">{form.plate||'???-???'}</h2>
          {isReturn&&form.exitTime&&(
            <p className="text-neutral-500 text-xs mt-2">Salió {formatDistanceToNow(new Date(form.exitTime),{addSuffix:true,locale:es})}</p>
          )}
        </div>
      </div>

      <div className="px-5 -mt-4 pb-32 space-y-4 max-w-xl mx-auto">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-5">

          {/* Plate input (only new records without plate) */}
          {!record.id&&!record.plate&&(
            <div className="space-y-1.5">
              <label className="field-label"><Car className="w-4 h-4"/>Placa de rodaje</label>
              <input autoFocus type="text" placeholder="ABC-123" maxLength={8}
                className="input plate-text uppercase text-xl font-black tracking-wider"
                value={form.plate??''} onChange={e=>set({plate:e.target.value.toUpperCase()})}/>
            </div>
          )}

          {/* Vehicle type */}
          {!isReturn&&(
            <div className="space-y-2">
              <label className="field-label">Tipo de unidad</label>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {VEHICLE_TYPES.map(t=>(
                  <button key={t} onClick={()=>set({type:t})}
                    className={`text-left text-xs py-2.5 px-3 rounded-xl border font-medium transition-all truncate
                      ${form.type===t?'bg-neutral-100 text-neutral-900 border-neutral-100 font-bold':'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>
                    {ICONS[t]} {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {HAS_SECONDARY.includes(form.type??'')&&!isReturn&&(
            <div className="space-y-1.5">
              <label className="field-label"><Car className="w-4 h-4"/>Placa de carreta/remolque</label>
              <input type="text" placeholder="Z1A-222" maxLength={8}
                className="input plate-text uppercase font-bold"
                value={form.secondaryPlate??''} onChange={e=>set({secondaryPlate:e.target.value.toUpperCase()})}/>
            </div>
          )}

          <div className="space-y-1.5">
            <label className={`field-label ${isReturn?'opacity-50':''}`}><User className="w-4 h-4"/>Conductor</label>
            <input type="text" placeholder="Nombre del conductor" disabled={isReturn}
              className={`input ${isReturn?'opacity-50 cursor-not-allowed':''}`}
              value={form.driver??''} onChange={e=>set({driver:e.target.value})}/>
          </div>

          <div className="space-y-1.5">
            <label className={`field-label ${isReturn?'opacity-50':''}`}><MapPin className="w-4 h-4"/>Destino / Área</label>
            <input type="text" placeholder="Destino o área de trabajo" disabled={isReturn}
              className={`input ${isReturn?'opacity-50 cursor-not-allowed':''}`}
              value={form.destination??''} onChange={e=>set({destination:e.target.value})}/>
          </div>

          <div className={`grid gap-3 ${isReturn?'grid-cols-2':'grid-cols-1'}`}>
            {isReturn&&(
              <div className="space-y-1.5">
                <label className="field-label opacity-50"><Gauge className="w-4 h-4"/>KM Salida</label>
                <div className="input opacity-50 text-neutral-400">{form.exitMileage?.toLocaleString('es-PE')??'—'}</div>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="field-label"><Gauge className="w-4 h-4"/>{isReturn?'KM Retorno':'Kilometraje'}</label>
              <input type="number" placeholder="Ej: 45030" min={0} className="input"
                value={isReturn?(form.returnMileage||''):(form.exitMileage||'')}
                onChange={e=>{const v=parseInt(e.target.value)||undefined; isReturn?set({returnMileage:v}):set({exitMileage:v});}}/>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="field-label"><FileText className="w-4 h-4"/>Observaciones (opcional)</label>
            <textarea placeholder="Notas adicionales..." className="input resize-none" rows={2}
              value={form.observations??''} onChange={e=>set({observations:e.target.value})}/>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <label className="field-label"><Camera className="w-4 h-4"/>Evidencia fotográfica</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((p,i)=>(
                <div key={i} className="relative shrink-0">
                  <img src={p} onClick={()=>setPreview(p)} className="w-20 h-20 object-cover rounded-xl border border-neutral-700 cursor-pointer"/>
                  <button onClick={()=>removePhoto(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                    <X className="w-3 h-3 text-white"/>
                  </button>
                </div>
              ))}
              <button onClick={onScanMore} className="w-20 h-20 shrink-0 border-2 border-dashed border-neutral-700 rounded-xl flex flex-col items-center justify-center gap-1 text-neutral-600 active:text-neutral-400 active:border-neutral-600 transition-colors">
                <Camera className="w-5 h-5"/><span className="text-[10px] font-bold">Cámara</span>
              </button>
              <button onClick={()=>fileRef.current?.click()} className="w-20 h-20 shrink-0 border-2 border-dashed border-neutral-700 rounded-xl flex flex-col items-center justify-center gap-1 text-neutral-600 active:text-neutral-400 transition-colors">
                <Plus className="w-5 h-5"/><span className="text-[10px] font-bold">Galería</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile}/>
            </div>
          </div>
        </div>

        <button disabled={!canSave||saving} onClick={handleSave}
          className={`w-full py-5 rounded-2xl font-black text-lg text-white shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${accent} disabled:opacity-40 disabled:cursor-not-allowed`}>
          {saving&&<Loader2 className="w-5 h-5 animate-spin"/>}
          {isReturn?'✅ REGISTRAR RETORNO':'🚗 REGISTRAR SALIDA'}
        </button>
      </div>

      {/* Photo preview */}
      <AnimatePresence>
        {preview&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6"
            onClick={()=>setPreview(null)}>
            <img src={preview} className="max-w-full max-h-[85vh] rounded-2xl object-contain"/>
            <button className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white"><X className="w-5 h-5"/></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── HISTORY ───────────────────────────────────────────────────────────────
function HistoryScreen({onBack,onOpenRecord}:{onBack:()=>void; onOpenRecord:(r:VehicleRecord)=>void}){
  const [q,setQ]=useState('');
  const [fs,setFs]=useState<'ALL'|'PENDING'|'COMPLETED'>('ALL');
  const records=useLiveQuery(()=>db.records.orderBy('exitTime').reverse().toArray());
  const filtered=records?.filter(r=>{
    const mq=!q||r.plate.includes(q.toUpperCase())||r.driver.toLowerCase().includes(q.toLowerCase())||r.destination.toLowerCase().includes(q.toLowerCase());
    const ms=fs==='ALL'||r.status===fs;
    return mq&&ms;
  })??[];

  const del=async(id:number)=>{
    if(!confirm('¿Eliminar este registro?')) return;
    await db.records.delete(id);
    toast('Registro eliminado','success');
  };

  return(
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-900" style={{paddingTop:'env(safe-area-inset-top,0px)'}}>
        <div className="px-5 pt-4 pb-3 max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={onBack} className="p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 active:scale-95 transition-transform">
              <ChevronLeft className="w-5 h-5"/>
            </button>
            <h1 className="text-white font-bold text-lg flex-1">Historial</h1>
            <span className="text-neutral-600 text-xs">{filtered.length} registros</span>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500"/>
            <input type="text" placeholder="Placa, conductor, destino..."
              className="w-full bg-neutral-900 border border-neutral-800 focus:border-neutral-700 rounded-xl pl-10 pr-10 py-2.5 text-white text-sm placeholder:text-neutral-600 outline-none transition-colors"
              value={q} onChange={e=>setQ(e.target.value)}/>
            {q&&<button onClick={()=>setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600"><X className="w-4 h-4"/></button>}
          </div>
          <div className="flex gap-2">
            {(['ALL','PENDING','COMPLETED'] as const).map(s=>(
              <button key={s} onClick={()=>setFs(s)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
                  ${fs===s?'bg-neutral-100 text-neutral-900':'text-neutral-500 active:text-neutral-300'}`}>
                {s==='ALL'?'Todos':s==='PENDING'?'🟠 En Planta':'✅ Completados'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3 max-w-xl mx-auto pb-24">
        {filtered.length===0&&(
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-neutral-800 mx-auto mb-3"/>
            <p className="text-neutral-600 font-medium">Sin resultados</p>
          </div>
        )}
        {filtered.map(r=>(
          <div key={r.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="p-4 flex items-start gap-3 cursor-pointer active:bg-neutral-800/50 transition-colors" onClick={()=>onOpenRecord(r)}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${r.status==='PENDING'?'bg-orange-500/10':'bg-emerald-500/10'}`}>
                {ICONS[r.type]||'🚗'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="plate-text text-white font-black text-base">{r.plate}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full
                    ${r.status==='PENDING'?'bg-orange-500/15 text-orange-400':'bg-emerald-500/15 text-emerald-400'}`}>
                    {r.status==='PENDING'?'En Planta':'Completado'}
                  </span>
                </div>
                <p className="text-neutral-500 text-[11px] mt-0.5 truncate">{r.type} · {r.driver}</p>
                <p className="text-neutral-600 text-[11px] truncate">{r.destination}</p>
              </div>
            </div>
            <div className="px-4 pb-2 grid grid-cols-2 gap-3 border-t border-neutral-800/60 pt-3">
              <div>
                <p className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest mb-0.5">Salida</p>
                <p className="text-white text-xs font-bold">{format(new Date(r.exitTime),'HH:mm · dd/MM')}</p>
                <p className="text-neutral-500 text-[11px]">KM: {r.exitMileage?.toLocaleString('es-PE')}</p>
              </div>
              {r.returnTime?(
                <div>
                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Retorno</p>
                  <p className="text-emerald-400 text-xs font-bold">{format(new Date(r.returnTime),'HH:mm · dd/MM')}</p>
                  <p className="text-emerald-600 text-[11px]">KM: {r.returnMileage?.toLocaleString('es-PE')}</p>
                </div>
              ):(
                <button onClick={()=>onOpenRecord(r)} className="h-full border border-dashed border-orange-800/50 rounded-xl text-[10px] font-bold text-orange-600 active:text-orange-400 transition-colors">
                  + Registrar retorno
                </button>
              )}
            </div>
            <div className="flex gap-2 px-4 pb-4 pt-2">
              <button onClick={()=>window.open(`https://wa.me/?text=${getWhatsAppText(r)}`,'_blank')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600/20 active:bg-emerald-600/30 text-emerald-400 rounded-xl text-xs font-bold transition-colors">
                <MessageCircle className="w-3.5 h-3.5"/> WhatsApp
              </button>
              <button onClick={()=>generatePDFReport(r)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600/20 active:bg-blue-600/30 text-blue-400 rounded-xl text-xs font-bold transition-colors">
                <FileText className="w-3.5 h-3.5"/> PDF
              </button>
              <button onClick={()=>del(r.id!)} className="py-2.5 px-3 bg-red-900/20 active:bg-red-900/40 text-red-500 rounded-xl transition-colors">
                <Trash2 className="w-3.5 h-3.5"/>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────
export default function App(){
  const [screen,setScreen]=useState<AppScreen>('SETUP');
  const [guard,setGuard]=useState<GuardInfo|null>(null);
  const [active,setActive]=useState<Partial<VehicleRecord>|null>(null);
  const [scanning,setScanning]=useState(false);

  useEffect(()=>{
    const s=localStorage.getItem('sd_session');
    if(s){try{setGuard(JSON.parse(s));setScreen('DASHBOARD');}catch{localStorage.removeItem('sd_session');}}
  },[]);

  const startSession=(g:GuardInfo)=>{
    setGuard(g); localStorage.setItem('sd_session',JSON.stringify(g));
    setScreen('DASHBOARD'); toast(`¡Bienvenido, ${g.name}!`,'success');
  };
  const logout=()=>{
    localStorage.removeItem('sd_session');
    setGuard(null); setActive(null); setScreen('SETUP');
  };
  const openPlateFlow=useCallback(async(plate:string,photo?:string)=>{
    const ex=await db.records.where('plate').equals(plate).and(r=>r.status==='PENDING').first();
    if(ex) setActive({...ex,returnTime:new Date(),returnPhotos:photo?[photo]:[]});
    else setActive({plate,type:'Camioneta',driver:'',destination:'',exitTime:new Date(),exitPhotos:photo?[photo]:[],status:'PENDING'});
    setScanning(false); setScreen('FORM');
  },[]);

  const handleCapture=async(b64:string)=>{
    setScanning(true); setScreen('DASHBOARD');
    toast('Analizando placa con IA...','info');
    try{
      const plate=await scanPlateFromImage(b64);
      if(plate){ toast(`Placa detectada: ${plate}`,'success'); await openPlateFlow(plate,b64); }
      else{ toast('No se detectó placa. Use ingreso manual.','error'); setScanning(false); }
    }catch{ toast('Error en escaneo. Use ingreso manual.','error'); setScanning(false); }
  };

  const saveRecord=async(data:Partial<VehicleRecord>)=>{
    if(data.id){
      await db.records.update(data.id,{...data,status:'COMPLETED'});
      confetti({particleCount:200,spread:80,origin:{y:0.6},colors:['#10b981','#34d399','#6ee7b7']});
      toast('Retorno registrado','success');
    } else {
      await db.records.add({...(data as VehicleRecord),guard:guard!.name,shift:guard!.shift});
      toast('Salida registrada','success');
    }
    setActive(null); setScreen('DASHBOARD');
  };

  const openRecord=(r:VehicleRecord)=>{
    if(r.status==='PENDING') setActive({...r,returnTime:new Date(),returnPhotos:[]});
    else setActive(r);
    setScreen('FORM');
  };

  return(
    <>
      <style>{`
        .input{width:100%;background:rgb(23 23 23);border:1px solid rgb(38 38 38);border-radius:12px;padding:12px 14px;color:white;font-size:14px;font-weight:500;outline:none;transition:border-color .15s;font-family:inherit;}
        .input:focus{border-color:rgb(63 63 70);}
        .input:disabled{opacity:.5;cursor:not-allowed;}
        .field-label{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgb(115 115 115);}
      `}</style>
      <Toasts/>

      {/* Scanning overlay */}
      <AnimatePresence>
        {scanning&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-4 mx-6">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto"/>
              <div>
                <p className="text-white font-bold">Procesando imagen...</p>
                <p className="text-neutral-500 text-sm mt-1">Detectando placa con Google Gemini AI</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {screen==='SETUP'&&(
          <motion.div key="setup" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={TR}>
            <SetupScreen onStart={startSession}/>
          </motion.div>
        )}
        {screen==='DASHBOARD'&&guard&&(
          <motion.div key="dash" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={TR}>
            <Dashboard guard={guard} onScan={()=>setScreen('SCANNER')} onManual={()=>{
              setActive({plate:'',type:'Camioneta',driver:'',destination:'',exitTime:new Date(),exitPhotos:[],status:'PENDING'});
              setScreen('FORM');
            }} onHistory={()=>setScreen('HISTORY')} onLogout={logout} onOpenRecord={openRecord}/>
          </motion.div>
        )}
        {screen==='SCANNER'&&(
          <motion.div key="scanner" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.15}}>
            <ScannerScreen onCapture={handleCapture} onManual={()=>{
              setActive({plate:'',type:'Camioneta',driver:'',destination:'',exitTime:new Date(),exitPhotos:[],status:'PENDING'});
              setScreen('FORM');
            }} onCancel={()=>setScreen('DASHBOARD')}/>
          </motion.div>
        )}
        {screen==='FORM'&&active&&guard&&(
          <motion.div key="form" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}} transition={TR}>
            <FormScreen record={active} guard={guard} onSave={saveRecord}
              onBack={()=>{setActive(null);setScreen('DASHBOARD');}}
              onScanMore={()=>setScreen('SCANNER')}/>
          </motion.div>
        )}
        {screen==='HISTORY'&&(
          <motion.div key="history" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={TR}>
            <HistoryScreen onBack={()=>setScreen('DASHBOARD')} onOpenRecord={openRecord}/>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
