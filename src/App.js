import { useState, useEffect, useCallback } from "react";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignIn,
  useUser,
  useClerk,
} from "@clerk/clerk-react";

// ─── Config ───────────────────────────────────────────────────────────────────
const CLERK_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ;
const API_BASE  = "https://vaultak.com";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const timeAgo = (ts) => {
  if (!ts) return "—";
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};
const riskColor = (s) => s >= 0.75 ? "#ff4d4d" : s >= 0.5 ? "#ff9500" : s >= 0.25 ? "#f5c518" : "#4ade80";
const sevCfg = {
  critical: { c: "#ff4d4d", bg: "rgba(255,77,77,0.12)", b: "rgba(255,77,77,0.25)" },
  high:     { c: "#ff9500", bg: "rgba(255,149,0,0.12)", b: "rgba(255,149,0,0.25)" },
  medium:   { c: "#f5c518", bg: "rgba(245,197,24,0.12)", b: "rgba(245,197,24,0.25)" },
  low:      { c: "#4ade80", bg: "rgba(74,222,128,0.12)", b: "rgba(74,222,128,0.25)" },
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#060609;--glass:rgba(255,255,255,0.05);--glass-h:rgba(255,255,255,0.08);
    --gb:rgba(255,255,255,0.09);--gb2:rgba(255,255,255,0.15);
    --t:#ede9e4;--t2:#8a8695;--t3:#44414f;--w:#ffffff;
    --sans:'Inter',sans-serif;--mono:'JetBrains Mono',monospace;--r:14px;--rs:9px;
  }
  html,body,#root{height:100%;min-height:100vh}
  body{background:var(--bg);color:var(--t);font-family:var(--sans);font-size:14px;-webkit-font-smoothing:antialiased}
  body::before{content:'';position:fixed;top:-20%;left:-10%;width:65%;height:65%;background:radial-gradient(ellipse,rgba(99,88,255,0.15) 0%,rgba(60,50,180,0.06) 40%,transparent 70%);pointer-events:none;z-index:0}
  body::after{content:'';position:fixed;bottom:-20%;right:-5%;width:55%;height:55%;background:radial-gradient(ellipse,rgba(20,180,160,0.12) 0%,rgba(10,120,120,0.05) 40%,transparent 70%);pointer-events:none;z-index:0}

  /* ── Auth page ── */
  .auth-page{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;z-index:1;padding:24px}
  .auth-brand{margin-bottom:32px;text-align:center}
  .auth-brand-name{font-size:28px;font-weight:700;color:var(--w);letter-spacing:-.5px}
  .auth-brand-sub{font-size:13px;color:var(--t3);margin-top:6px;font-family:var(--mono);letter-spacing:.08em}
  .cl-rootBox{background:transparent!important}
  .cl-card{background:rgba(255,255,255,0.05)!important;border:1px solid rgba(255,255,255,0.1)!important;backdrop-filter:blur(24px)!important;border-radius:16px!important;box-shadow:0 8px 32px rgba(0,0,0,0.4)!important}
  .cl-headerTitle{color:#fff!important;font-family:'Inter',sans-serif!important}
  .cl-headerSubtitle{color:#8a8695!important}
  .cl-formButtonPrimary{background:#fff!important;color:#000!important;font-weight:600!important}
  .cl-formButtonPrimary:hover{background:#e5e5e5!important}
  .cl-footerActionLink{color:#a89fe0!important}
  .cl-formFieldInput{background:rgba(255,255,255,0.07)!important;border-color:rgba(255,255,255,0.12)!important;color:#fff!important}
  .cl-formFieldLabel{color:#8a8695!important}
  .cl-dividerLine{background:rgba(255,255,255,0.08)!important}
  .cl-dividerText{color:#44414f!important}
  .cl-socialButtonsBlockButton{background:rgba(255,255,255,0.07)!important;border-color:rgba(255,255,255,0.12)!important;color:#fff!important}
  .cl-socialButtonsBlockButtonText{color:#fff!important}
  .cl-internal-b3fm6y{color:#fff!important}

  /* ── Onboarding ── */
  .onboard-page{min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;z-index:1;padding:24px}
  .onboard-card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:40px;max-width:520px;width:100%;backdrop-filter:blur(24px);box-shadow:0 8px 32px rgba(0,0,0,0.4)}
  .onboard-logo{font-size:22px;font-weight:700;color:var(--w);margin-bottom:8px;letter-spacing:-.4px}
  .onboard-title{font-size:26px;font-weight:600;color:var(--w);margin-bottom:8px;letter-spacing:-.4px}
  .onboard-sub{font-size:14px;color:var(--t2);margin-bottom:32px;line-height:1.6}
  .onboard-step{display:flex;align-items:flex-start;gap:14px;margin-bottom:20px}
  .onboard-step-num{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--t2);flex-shrink:0;margin-top:2px}
  .onboard-step-content{}
  .onboard-step-title{font-size:13px;font-weight:500;color:var(--w);margin-bottom:4px}
  .onboard-step-desc{font-size:12px;color:var(--t2);line-height:1.5}
  .onboard-key-box{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:16px 18px;margin:24px 0;position:relative}
  .onboard-key-label{font-size:10px;font-family:var(--mono);letter-spacing:.12em;color:var(--t3);text-transform:uppercase;margin-bottom:8px}
  .onboard-key-value{font-family:var(--mono);font-size:13px;color:#a89fe0;word-break:break-all;line-height:1.5}
  .onboard-key-warn{font-size:11px;color:#ff9500;margin-top:8px;display:flex;align-items:center;gap:6px}
  .onboard-copy-btn{position:absolute;top:12px;right:12px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:var(--t2);padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;font-family:var(--mono);transition:all .15s}
  .onboard-copy-btn:hover{color:var(--w);border-color:rgba(255,255,255,0.2)}
  .onboard-code-block{background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px 18px;margin:12px 0;font-family:var(--mono);font-size:12px;color:#a89fe0;line-height:1.8;white-space:pre}
  .onboard-btn{width:100%;padding:13px;background:#fff;color:#000;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px;transition:all .15s;font-family:var(--sans)}
  .onboard-btn:hover{background:#e5e5e5}
  .onboard-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:40px;color:var(--t2);font-family:var(--mono);font-size:13px}
  .spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,0.1);border-top-color:rgba(255,255,255,0.4);border-radius:50%;animation:spin .7s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}

  /* ── App layout ── */
  .app{display:grid;grid-template-columns:240px 1fr;height:100vh;overflow:hidden;position:relative;z-index:1}
  .sidebar{display:flex;flex-direction:column;padding:24px 14px;border-right:1px solid var(--gb);background:rgba(255,255,255,0.02);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)}
  .brand{padding:6px 12px 24px;border-bottom:1px solid var(--gb);margin-bottom:16px}
  .brand-name{font-size:18px;font-weight:600;color:var(--w);letter-spacing:-.4px}
  .brand-sub{font-family:var(--mono);font-size:9px;letter-spacing:.16em;color:var(--t3);margin-top:4px;text-transform:uppercase}
  .nav{display:flex;flex-direction:column;gap:3px;flex:1}
  .nav-item{display:flex;align-items:center;gap:11px;padding:10px 13px;border-radius:var(--rs);cursor:pointer;color:var(--t2);font-size:13px;font-weight:400;transition:all .15s;user-select:none;border:1px solid transparent}
  .nav-item:hover{color:var(--t);background:var(--glass-h);border-color:var(--gb)}
  .nav-item.active{color:var(--w);background:var(--glass);border-color:var(--gb2);font-weight:500}
  .nav-icon{width:16px;height:16px;display:flex;align-items:center;justify-content:center;opacity:.65;flex-shrink:0}
  .nav-item.active .nav-icon{opacity:1}
  .nav-badge{margin-left:auto;background:#ff4d4d;color:#fff;font-size:10px;font-weight:600;padding:2px 7px;border-radius:20px;font-family:var(--mono);line-height:1.4}
  .sfooter{padding:16px 12px 0;border-top:1px solid var(--gb);margin-top:auto;display:flex;flex-direction:column;gap:10px}
  .user-row{display:flex;align-items:center;gap:8px}
  .user-avatar{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--w);flex-shrink:0;overflow:hidden}
  .user-avatar img{width:100%;height:100%;object-fit:cover}
  .user-info{flex:1;min-width:0}
  .user-name{font-size:12px;font-weight:500;color:var(--w);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .user-email{font-size:10px;color:var(--t3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .signout-btn{background:transparent;border:1px solid var(--gb);color:var(--t3);padding:5px 10px;border-radius:6px;font-size:10px;cursor:pointer;font-family:var(--mono);transition:all .15s;width:100%}
  .signout-btn:hover{color:var(--t);border-color:var(--gb2)}
  .live{display:flex;align-items:center;gap:8px}
  .ldot{width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 8px #4ade80;animation:lp 2s infinite;flex-shrink:0}
  @keyframes lp{0%,100%{opacity:1;box-shadow:0 0 8px #4ade80}50%{opacity:.45;box-shadow:0 0 3px #4ade80}}
  .ltext{font-family:var(--mono);font-size:10px;color:var(--t3);letter-spacing:.04em}
  .main{display:flex;flex-direction:column;overflow:hidden}
  .topbar{padding:20px 28px;border-bottom:1px solid var(--gb);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
  .ptitle{font-size:18px;font-weight:600;color:var(--w);letter-spacing:-.3px}
  .psub{font-size:11px;color:var(--t3);margin-top:3px;font-family:var(--mono);letter-spacing:.05em}
  .refresh-btn{background:var(--glass);border:1px solid var(--gb);color:var(--t2);padding:6px 14px;border-radius:20px;font-size:11px;font-family:var(--mono);cursor:pointer;transition:all .15s}
  .onboarding-card{background:rgba(99,88,255,0.06);border:1px solid rgba(99,88,255,0.2);border-radius:16px;padding:32px;margin-bottom:24px}
  .onboarding-title{font-size:18px;font-weight:600;color:#fff;margin-bottom:6px;letter-spacing:-.3px}
  .onboarding-sub{font-size:13px;color:var(--t2);margin-bottom:28px;line-height:1.6}
  .onboarding-steps{display:flex;flex-direction:column;gap:12px}
  .onboarding-step{display:flex;align-items:flex-start;gap:16px;padding:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px}
  .onboarding-step-num{width:28px;height:28px;border-radius:50%;background:rgba(99,88,255,0.2);border:1px solid rgba(99,88,255,0.4);color:#a89fe0;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
  .onboarding-step-body{flex:1}
  .onboarding-step-title{font-size:13px;font-weight:600;color:#ede9e4;margin-bottom:4px}
  .onboarding-step-desc{font-size:12px;color:var(--t2);line-height:1.6}
  .onboarding-step-action{margin-top:10px;display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:#a89fe0;cursor:pointer;font-family:var(--mono);background:rgba(99,88,255,0.1);border:1px solid rgba(99,88,255,0.25);padding:5px 12px;border-radius:6px;text-decoration:none;transition:all .15s}
  .onboarding-step-action:hover{background:rgba(99,88,255,0.18);color:#fff}
  .refresh-btn:hover{color:var(--t);border-color:var(--gb2)}
  .loading-bar{height:2px;background:linear-gradient(90deg,transparent,rgba(99,88,255,0.6),transparent);animation:lb 1.5s infinite;display:none}
  .loading-bar.active{display:block}
  @keyframes lb{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}
  .content{flex:1;overflow-y:auto;padding:24px 28px}
  .content::-webkit-scrollbar{width:3px}
  .content::-webkit-scrollbar-thumb{background:var(--gb);border-radius:2px}
  .gc{background:var(--glass);border:1px solid var(--gb);border-radius:var(--r);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);transition:border-color .2s;box-shadow:0 8px 32px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.07)}
  .gc:hover{border-color:var(--gb2)}
  .stats-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px}
  .sc{background:var(--glass);border:1px solid var(--gb);border-radius:var(--r);padding:20px 18px;backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);transition:all .2s;position:relative;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.07)}
  .sc::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)}
  .sc:hover{border-color:var(--gb2);transform:translateY(-1px)}
  .slabel{font-size:10px;font-family:var(--mono);letter-spacing:.12em;color:var(--t3);text-transform:uppercase;margin-bottom:10px}
  .sval{font-size:28px;font-weight:600;color:var(--w);letter-spacing:-1px;line-height:1}
  .sval.warn{color:#ff9500}.sval.danger{color:#ff4d4d}
  .rw{padding:22px 24px;margin-bottom:20px}
  .rh{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
  .rt{font-size:10px;font-family:var(--mono);letter-spacing:.12em;color:var(--t3);text-transform:uppercase}
  .rbar{display:flex;height:5px;border-radius:3px;overflow:hidden;gap:2px;margin-bottom:12px}
  .rseg{height:100%;border-radius:2px;transition:width .8s ease}
  .rleg{display:flex;gap:24px}
  .rli{display:flex;align-items:center;gap:7px;font-size:11px;font-family:var(--mono);color:var(--t2)}
  .rdot{width:7px;height:7px;border-radius:50%}
  .sh{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  .st{font-size:10px;font-family:var(--mono);letter-spacing:.12em;color:var(--t3);text-transform:uppercase}
  .sm{font-size:11px;font-family:var(--mono);color:var(--t3)}
  .tw{border-radius:var(--r);overflow:hidden;margin-bottom:20px}
  table{width:100%;border-collapse:collapse}
  thead{background:rgba(255,255,255,0.025);border-bottom:1px solid var(--gb)}
  th{padding:12px 16px;text-align:left;font-size:10px;font-family:var(--mono);letter-spacing:.12em;color:var(--t3);text-transform:uppercase;font-weight:400}
  tbody tr{border-bottom:1px solid var(--gb);transition:background .12s}
  tbody tr:last-child{border-bottom:none}
  tbody tr:hover{background:rgba(255,255,255,0.028)}
  td{padding:14px 16px;font-size:13px;color:var(--t);vertical-align:middle}
  .chip{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:10px;font-family:var(--mono);font-weight:500;letter-spacing:.06em;border:1px solid}
  .ca{background:rgba(74,222,128,.1);color:#4ade80;border-color:rgba(74,222,128,.25)}
  .cp{background:rgba(255,149,0,.1);color:#ff9500;border-color:rgba(255,149,0,.25)}
  .cf{background:rgba(255,77,77,.1);color:#ff4d4d;border-color:rgba(255,77,77,.25)}
  .ck{background:rgba(255,255,255,.05);color:var(--t3);border-color:rgba(255,255,255,.08)}
  .cm{background:rgba(255,149,0,.1);color:#ff9500;border-color:rgba(255,149,0,.2)}
  .cr{background:rgba(245,197,24,.1);color:#f5c518;border-color:rgba(245,197,24,.2)}
  .calt{background:rgba(255,77,77,.1);color:#ff4d4d;border-color:rgba(255,77,77,.2)}
  .rsc{display:flex;align-items:center;gap:10px}
  .rn{font-family:var(--mono);font-size:12px;font-weight:500;min-width:32px}
  .rtr{width:48px;height:3px;background:rgba(255,255,255,.07);border-radius:2px;overflow:hidden}
  .rfl{height:100%;border-radius:2px}
  .btn{padding:6px 14px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid;transition:all .15s;font-family:var(--sans)}
  .bpa{background:rgba(255,77,77,.08);color:#ff4d4d;border-color:rgba(255,77,77,.2)}
  .bpa:hover{background:rgba(255,77,77,.16)}
  .bre{background:rgba(74,222,128,.08);color:#4ade80;border-color:rgba(74,222,128,.2)}
  .bre:hover{background:rgba(74,222,128,.16)}
  .bac{background:var(--glass);color:var(--t2);border-color:var(--gb);font-size:11px}
  .bac:hover{color:var(--t);border-color:var(--gb2)}
  .aname{font-weight:500;color:var(--w);font-size:13px}
  .aid{font-family:var(--mono);font-size:10px;color:var(--t3);margin-top:3px}
  .svbar{width:3px;height:36px;border-radius:2px;flex-shrink:0}
  .amsg{font-size:13px;color:var(--t)}
  .amet{font-family:var(--mono);font-size:10px;color:var(--t3);margin-top:4px}
  .empty{padding:52px;text-align:center;font-family:var(--mono);font-size:12px;color:var(--t3)}
  .empty-icon{font-size:24px;margin-bottom:12px;opacity:.3}
  .error-banner{background:rgba(255,77,77,0.08);border:1px solid rgba(255,77,77,0.2);border-radius:var(--rs);padding:12px 16px;margin-bottom:16px;font-size:12px;color:#ff4d4d;font-family:var(--mono)}
  .mono{font-family:var(--mono)}.dim{color:var(--t3)}.muted{color:var(--t2)}
  .api-key-section{background:var(--glass);border:1px solid var(--gb);border-radius:var(--r);padding:20px 24px;margin-bottom:20px}
  .api-key-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  .api-key-title{font-size:11px;font-family:var(--mono);letter-spacing:.12em;color:var(--t3);text-transform:uppercase}
  .api-key-val{font-family:var(--mono);font-size:13px;color:#a89fe0;background:rgba(0,0,0,0.2);padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;gap:12px}
  .copy-btn{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);color:var(--t2);padding:4px 10px;border-radius:6px;font-size:10px;cursor:pointer;font-family:var(--mono);transition:all .15s;white-space:nowrap;flex-shrink:0}
  .copy-btn:hover{color:var(--w)}

  @media(max-width:768px){
    .app{grid-template-columns:1fr;grid-template-rows:1fr 60px;height:100vh;overflow:hidden}
    .sidebar{display:none}
    .main{grid-row:1;overflow:hidden}
    .topbar{padding:14px 16px}
    .ptitle{font-size:15px}
    .psub{display:none}
    .content{padding:16px}
    .stats-grid{grid-template-columns:repeat(2,1fr);gap:8px}
    .sc{padding:14px 12px}
    .sval{font-size:22px}
    .slabel{font-size:9px}
    table{font-size:11px}
    th,td{padding:10px 10px}
    .mobile-nav{display:flex!important}
    .gc{border-radius:10px}
    .rleg{flex-wrap:wrap;gap:12px}
    .api-key-section{padding:16px}
    .api-key-val{flex-wrap:wrap;gap:8px;font-size:11px;word-break:break-all}
    .api-key-val span{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .billing-grid{grid-template-columns:1fr!important}
    .content *{max-width:100%;box-sizing:border-box}
  }
  .mobile-nav{display:none;position:fixed;bottom:0;left:0;right:0;height:60px;background:rgba(6,6,9,0.95);border-top:1px solid var(--gb);backdrop-filter:blur(20px);z-index:100;justify-content:space-around;align-items:center;padding:0 8px}
  .mobile-nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;padding:6px 12px;border-radius:8px;transition:all .15s;flex:1}
  .mobile-nav-item.active{background:var(--glass)}
  .mobile-nav-item svg{width:18px;height:18px;color:var(--t2)}
  .mobile-nav-item.active svg{color:var(--w)}
  .mobile-nav-label{font-size:9px;font-family:var(--mono);color:var(--t3);letter-spacing:.04em}
  .mobile-nav-item.active .mobile-nav-label{color:var(--t2)}
  .mobile-nav-badge{position:absolute;top:2px;right:8px;background:#ff4d4d;color:#fff;font-size:8px;font-weight:600;padding:1px 4px;border-radius:8px;font-family:var(--mono)}
`;

// ─── Icons ────────────────────────────────────────────────────────────────────
const OvIco = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>;
const AgIco = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.2"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
const AcIco = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
const AlIco = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M8 6v3M8 11v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
const KeyIco = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="8" r="4" stroke="currentColor" strokeWidth="1.2"/><path d="M10 8h5M13 6v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
const PolIco = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 2L13 4v4c0 3-2.5 5-5 6C3 13 1 11 1 8V4l7-2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M5 8l2 2 4-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const UseIco = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 12h2V7H2v5zm3 0h2V4H5v8zm3 0h2V9H8v3zm3 0h2V2h-2v10z" fill="currentColor" opacity=".7"/></svg>;
const BilIco = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M1 6h14" stroke="currentColor" strokeWidth="1.2"/><path d="M4 10h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;

// ─── RS Component ─────────────────────────────────────────────────────────────
function RS({ score }) {
  const c = riskColor(score || 0);
  return (
    <div className="rsc">
      <span className="rn" style={{ color: c }}>{(score || 0).toFixed(2)}</span>
      <div className="rtr"><div className="rfl" style={{ width: `${(score || 0) * 100}%`, background: c }} /></div>
    </div>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
function Onboarding({ onComplete }) {
  const { user } = useUser();
  const [apiKey, setApiKey]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_BASE}/api/onboard`, {
      method: "POST",
      headers: {
        "x-clerk-user-id": user.id,
        "x-user-email": user.primaryEmailAddress?.emailAddress || "",
        "Content-Type": "application/json",
      },
    })
      .then(r => r.json())
      .then(data => {
        if (data.api_key) {
          setApiKey(data.api_key);
          localStorage.setItem("vtk_api_key", data.api_key);
        } else if (data.already_exists) {
          const saved = localStorage.getItem("vtk_api_key");
          if (saved) setApiKey(saved);
          else setApiKey("KEY_ALREADY_EXISTS_CHECK_EMAIL");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const copy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="onboard-page">
      <div className="onboard-card">
        <div className="onboard-loading"><div className="spinner" /><span>Setting up your account...</span></div>
      </div>
    </div>
  );

  return (
    <div className="onboard-page">
      <div className="onboard-card">
        <div className="onboard-logo">Vaultak</div>
        <div className="onboard-title">Welcome, {user?.firstName || "developer"} 👋</div>
        <div className="onboard-sub">Your account is ready. Here's your API key and how to get started.</div>

        <div className="onboard-key-box">
          <div className="onboard-key-label">Your API Key</div>
          <div className="onboard-key-value">{apiKey}</div>
          <button className="onboard-copy-btn" onClick={copy}>{copied ? "Copied!" : "Copy"}</button>
          <div className="onboard-key-warn">⚠ Save this key — it won't be shown again after you leave this page</div>
        </div>

        <div className="onboard-step">
          <div className="onboard-step-num">1</div>
          <div className="onboard-step-content">
            <div className="onboard-step-title">Install the SDK</div>
            <div className="onboard-code-block">pip install vaultak</div>
          </div>
        </div>

        <div className="onboard-step">
          <div className="onboard-step-num">2</div>
          <div className="onboard-step-content">
            <div className="onboard-step-title">Wrap your agent</div>
            <div className="onboard-code-block">{`from vaultak import Vaultak

vt = Vaultak(api_key="${(apiKey || 'YOUR_API_KEY').slice(0, 20)}...")

with vt.monitor("my-agent"):
    # your agent code here
    pass`}</div>
          </div>
        </div>

        <div className="onboard-step">
          <div className="onboard-step-num">3</div>
          <div className="onboard-step-content">
            <div className="onboard-step-title">Watch your dashboard light up</div>
            <div className="onboard-step-desc">Every action your agent takes will appear in real time on your dashboard.</div>
          </div>
        </div>

        <button className="onboard-btn" onClick={onComplete}>Go to Dashboard →</button>
      </div>
    </div>
  );
}


// ─── AgentManager ─────────────────────────────────────────────────────────────
function AgentManager({ agents, setAgents, apiKey, planInfo }) {
  const [name, setName] = useState("");
  const [agentId, setAgentId] = useState("");
  const [msg, setMsg] = useState("");
  const [adding, setAdding] = useState(false);
  const H = { "x-api-key": apiKey, "Content-Type": "application/json" };

  const canAdd = !planInfo || (planInfo.can_add_agent !== false);
  const limitLabel = planInfo ? `${planInfo.agent_count} / ${planInfo.max_agents === 999999 ? "∞" : planInfo.max_agents} agents` : "";

  const onAdd = async () => {
    if (!name.trim()) { setMsg("Agent name is required"); return; }
    setAdding(true);
    setMsg("");
    try {
      const body = { name: name.trim() };
      if (agentId.trim()) body.agent_id = agentId.trim().toLowerCase().replace(/\s+/g, "-");
      const r = await fetch(`${API_BASE}/api/agents`, {
        method: "POST",
        headers: H,
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (r.ok) {
        setAgents(prev => [{ ...data, total_actions: 0, flagged_actions: 0, avg_risk_score: 0 }, ...prev]);
        setName(""); setAgentId("");
        setMsg("Agent registered. Use the agent ID in your SDK: vt.monitor(\"" + data.agent_id + "\")");
      } else {
        setMsg(data.detail || "Failed to add agent");
      }
    } catch(e) {
      setMsg("Error: " + e.message);
    } finally {
      setAdding(false);
    }
  };

  const onDelete = async (agentId) => {
    if (!window.confirm(`Delete agent "${agentId}"? This cannot be undone.`)) return;
    const r = await fetch(`${API_BASE}/api/agents/${agentId}`, { method: "DELETE", headers: H });
    if (r.ok) setAgents(prev => prev.filter(a => a.agent_id !== agentId));
  };

  return (
    <div className="gc" style={{padding:"20px 24px",marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{fontSize:11,fontFamily:"var(--mono)",letterSpacing:".12em",color:"var(--t3)",textTransform:"uppercase"}}>Register Agent</div>
        {planInfo && <div style={{fontSize:11,fontFamily:"var(--mono)",color: canAdd ? "var(--t2)" : "#ff9500",background:"rgba(255,255,255,0.05)",border:"1px solid var(--gb)",borderRadius:6,padding:"3px 10px"}}>{limitLabel}</div>}
      </div>
      {!canAdd ? (
        <div style={{fontSize:13,color:"#ff9500",padding:"12px",background:"rgba(255,149,0,0.08)",border:"1px solid rgba(255,149,0,0.2)",borderRadius:8}}>
          Agent limit reached for your plan. <a href="#" onClick={e=>{e.preventDefault();}} style={{color:"#a89fe0",textDecoration:"none"}}>Upgrade to add more agents.</a>
        </div>
      ) : (
        <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div style={{flex:"2",minWidth:160}}>
            <div style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)",marginBottom:4}}>AGENT NAME *</div>
            <input
              placeholder="e.g. Data Pipeline Agent"
              value={name}
              onChange={e=>setName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&onAdd()}
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid var(--gb)",borderRadius:8,padding:"8px 12px",color:"var(--w)",fontSize:13,outline:"none"}}
            />
          </div>
          <div style={{flex:"2",minWidth:160}}>
            <div style={{fontSize:10,color:"var(--t3)",fontFamily:"var(--mono)",marginBottom:4}}>AGENT ID (optional)</div>
            <input
              placeholder="auto-generated from name"
              value={agentId}
              onChange={e=>setAgentId(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&onAdd()}
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid var(--gb)",borderRadius:8,padding:"8px 12px",color:"var(--w)",fontSize:13,outline:"none",fontFamily:"var(--mono)"}}
            />
          </div>
          <button
            onClick={onAdd}
            disabled={adding}
            style={{background:"rgba(255,255,255,0.1)",border:"1px solid var(--gb2)",borderRadius:8,padding:"8px 18px",color:"var(--w)",fontSize:13,cursor:"pointer",fontWeight:500,whiteSpace:"nowrap",height:38}}
          >{adding ? "Adding..." : "+ Add Agent"}</button>
        </div>
      )}
      {msg && (
        <div style={{fontSize:12,marginTop:12,padding:"8px 12px",borderRadius:7,
          background: msg.includes("registered") ? "rgba(74,222,128,0.08)" : "rgba(255,149,0,0.08)",
          border: `1px solid ${msg.includes("registered") ? "rgba(74,222,128,0.2)" : "rgba(255,149,0,0.2)"}`,
          color: msg.includes("registered") ? "#4ade80" : "#ff9500",
          fontFamily:"var(--mono)"}}>
          {msg}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ apiKey: propApiKey }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [view, setView]       = useState(() => { try { const p = new URLSearchParams(window.location.search); return p.get("view") || "overview"; } catch(e) { return "overview"; } });
  const [stats, setStats]     = useState({});
  const [agents, setAgents]   = useState([]);
  const [actions, setActions] = useState([]);
  const [alerts, setAlerts]   = useState([]);
  const [policies, setPolicies] = useState([]);
  const [newPolicy, setNewPolicy] = useState({ name:"", action_type:"", resource_pattern:"", effect:"block", max_risk_score:"", priority:0 });
  const [policyMsg, setPolicyMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [time, setTime]       = useState(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  const [showKey, setShowKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenMsg, setRegenMsg] = useState("");
  const [usage, setUsage] = useState(null);
  const [planInfo, setPlanInfo] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ allowed_action_types: "", allowed_resources: "", blocked_resources: "", max_actions_per_minute: 60, max_risk_score: 1.0 });
  const [profileMsg, setProfileMsg] = useState("");

  const apiKey = propApiKey || "";
  const H = { "x-api-key": apiKey, "Content-Type": "application/json" };

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchAll = useCallback(async (showLoading = false) => {
    if (!apiKey) return;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [s, ag, ac, al] = await Promise.all([
        fetch(`${API_BASE}/api/stats`, { headers: H }).then(r => r.json()),
        fetch(`${API_BASE}/api/agents`, { headers: H }).then(r => r.json()),
        fetch(`${API_BASE}/api/actions?limit=50`, { headers: H }).then(r => r.json()),
        fetch(`${API_BASE}/api/alerts`, { headers: H }).then(r => r.json()),
      ]);
      if (s.detail) {
        localStorage.removeItem("vtk_api_key");
        return;
      }
      setStats(s);
      setAgents(Array.isArray(ag) ? ag : []);
      try { const pol = await fetch(`${API_BASE}/api/policies`, { headers: H }).then(r=>r.json()); setPolicies(Array.isArray(pol) ? pol : []); } catch(e) {}
      try { const use = await fetch(`${API_BASE}/api/usage`, { headers: H }).then(r=>r.json()); setUsage(use); } catch(e) {}
      try { const pi = await fetch(`${API_BASE}/api/org/plan`, { headers: H }).then(r=>r.json()); setPlanInfo(pi); } catch(e) {}
      setActions(Array.isArray(ac) ? ac : []);
      setAlerts(Array.isArray(al) ? al : []);
    } catch (e) {
      setError(e.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchAll(true);
    const t = setInterval(() => fetchAll(false), 30000);
    return () => clearInterval(t);
  }, [fetchAll]);

  const onRegenerate = async () => {
    if (!window.confirm("Regenerate your API key? Your current key will stop working immediately.")) return;
    setRegenerating(true);
    setRegenMsg("");
    try {
      const r = await fetch(`${API_BASE}/api/keys/regenerate`, { method: "POST", headers: H });
      const data = await r.json();
      if (data.api_key) {
        localStorage.setItem("vtk_api_key", data.api_key);
        window.location.reload();
      }
    } catch(e) {
      setRegenMsg("Failed to regenerate. Try again.");
    } finally {
      setRegenerating(false);
    }
  };

  const onAck = useCallback(async (id) => {
    await fetch(`${API_BASE}/api/alerts/${id}/acknowledge`, { method: "PATCH", headers: H });
    setAlerts(p => p.map(a => a.id === id ? { ...a, acknowledged: true } : a));
    setStats(p => ({ ...p, active_alerts: Math.max(0, (p.active_alerts || 1) - 1) }));
  }, [apiKey]);

  const onPause = useCallback(async (agentId) => {
    await fetch(`${API_BASE}/api/agents/${agentId}`, { method: "PATCH", headers: H, body: JSON.stringify({ paused: true }) });
    setAgents(p => p.map(a => a.agent_id === agentId ? { ...a, paused: true } : a));
  }, [apiKey]);

  const onResume = useCallback(async (agentId) => {
    await fetch(`${API_BASE}/api/agents/${agentId}`, { method: "PATCH", headers: H, body: JSON.stringify({ paused: false }) });
    setAgents(p => p.map(a => a.agent_id === agentId ? { ...a, paused: false } : a));
  }, [apiKey]);

  const onSaveProfile = useCallback(async (agentId) => {
    const body = {};
    if (profileForm.allowed_action_types.trim()) body.allowed_action_types = profileForm.allowed_action_types.split(",").map(s => s.trim()).filter(Boolean);
    if (profileForm.allowed_resources.trim()) body.allowed_resources = profileForm.allowed_resources.split(",").map(s => s.trim()).filter(Boolean);
    if (profileForm.blocked_resources.trim()) body.blocked_resources = profileForm.blocked_resources.split(",").map(s => s.trim()).filter(Boolean);
    body.max_actions_per_minute = profileForm.max_actions_per_minute;
    body.max_risk_score = profileForm.max_risk_score;
    const r = await fetch(`${API_BASE}/api/agents/${agentId}/profile`, { method: "PATCH", headers: H, body: JSON.stringify(body) });
    if (r.ok) {
      const updated = await r.json();
      setAgents(p => p.map(a => a.agent_id === agentId ? { ...a, ...updated } : a));
      setProfileMsg("Profile saved!");
      setTimeout(() => { setProfileMsg(""); setEditingProfile(null); }, 2000);
    } else { setProfileMsg("Failed to save profile"); }
  }, [apiKey, profileForm]);

  const activeAlerts = alerts.filter(a => !a.acknowledged);
  const d = stats.risk_distribution || {};
  const total = Object.values(d).reduce((a, b) => a + b, 0) || 1;

  const pages = {
    overview: { title: "Command Center",     sub: "REAL-TIME BEHAVIORAL MONITORING" },
    agents:   { title: "Agent Registry",     sub: "MANAGE & CONTROL" },
    actions:  { title: "Action Audit Trail", sub: "EVERY ACTION LOGGED & SCORED" },
    alerts:   { title: "Alert Queue",        sub: `${activeAlerts.length} UNACKNOWLEDGED` },
    apikey:   { title: "API Key",            sub: "YOUR CREDENTIALS" },
    policies: { title: "Security Policies",   sub: "PRE-EXECUTION ENFORCEMENT" },
    usage:    { title: "Usage",                sub: "API & ACTION METRICS" },
    billing:  { title: "Plan & Billing",          sub: "MANAGE YOUR SUBSCRIPTION" },
  };

  const nav = [
    { id: "overview", label: "Overview", icon: <OvIco /> },
    { id: "agents",   label: "Agents",   icon: <AgIco /> },
    { id: "actions",  label: "Actions",  icon: <AcIco /> },
    { id: "alerts",   label: "Alerts",   icon: <AlIco />, badge: activeAlerts.length },
    { id: "apikey",   label: "API Key",  icon: <KeyIco /> },
    { id: "policies", label: "Policies",  icon: <PolIco /> },
    { id: "usage",    label: "Usage",    icon: <UseIco /> },
    { id: "billing",  label: "Billing",  icon: <BilIco /> },
  ];

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand"><div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"4px"}}><svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style={{width:"28px",height:"28px",flexShrink:0}}><rect width="64" height="64" rx="12" fill="#ffffff"/><polygon points="32,4 60,32 32,60 4,32" fill="#0a0a0a"/><path d="M20,28 L32,46 L44,28" fill="none" stroke="#ffffff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg><div className="brand-name">Vaultak</div></div><div className="brand-sub">Runtime Security</div></div>
        <div className="nav">
          {nav.map(n => (
            <div key={n.id} className={`nav-item ${view === n.id ? "active" : ""}`} onClick={() => setView(n.id)}>
              <span className="nav-icon">{n.icon}</span>{n.label}
              {n.badge > 0 && <span className="nav-badge">{n.badge}</span>}
            </div>
          ))}
        </div>
        <div className="sfooter">
          <div className="live"><div className="ldot" /><span className="ltext">{time} · LIVE</span></div>
          <div className="user-row">
            <div className="user-avatar">
              {user?.imageUrl ? <img src={user.imageUrl} alt="" /> : (user?.firstName?.[0] || "U")}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.firstName} {user?.lastName}</div>
              <div className="user-email">{user?.primaryEmailAddress?.emailAddress}</div>
            </div>
          </div>
          <button className="signout-btn" onClick={() => signOut()}>Sign out</button>
        </div>
      </nav>

      <div className="main">
        <div className="topbar">
          <div><div className="ptitle">{pages[view].title}</div><div className="psub">{pages[view].sub}</div></div>
          <button className="refresh-btn" onClick={fetchAll}>↻ Refresh</button>
        </div>
        <div className={`loading-bar ${loading ? "active" : ""}`} />
        <div className="content">
          {error && <div className="error-banner">⚠ {error}</div>}

          {view === "overview" && (
            <>
              {(stats.total_agents === 0 || stats.total_agents === undefined) && (stats.total_actions === 0 || stats.total_actions === undefined) && (
                <div className="onboarding-card">
                  <div className="onboarding-title">Get started with Vaultak</div>
                  <div className="onboarding-sub">Follow these steps to start monitoring your AI agents in real time.</div>
                  <div className="onboarding-steps">
                    <div className="onboarding-step">
                      <div className="onboarding-step-num">1</div>
                      <div className="onboarding-step-body">
                        <div className="onboarding-step-title">Copy your API key</div>
                        <div className="onboarding-step-desc">Your API key authenticates your agents with Vaultak. Keep it secret.</div>
                        <a className="onboarding-step-action" onClick={() => setView("apikey")}>Go to API Key →</a>
                      </div>
                    </div>
                    <div className="onboarding-step">
                      <div className="onboarding-step-num">2</div>
                      <div className="onboarding-step-body">
                        <div className="onboarding-step-title">Connect via SDK or Sentry</div>
                        <div className="onboarding-step-desc">Use the Python/Node SDK to wrap your agent code, or download Vaultak Sentry to monitor any agent process with zero code changes.</div>
                        <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                          <a className="onboarding-step-action" href="https://docs.vaultak.com/quickstart" target="_blank" rel="noreferrer">SDK Quickstart →</a>
                          <a className="onboarding-step-action" href="https://vaultak.com/download" target="_blank" rel="noreferrer">Download Sentry →</a>
                        </div>
                      </div>
                    </div>
                    <div className="onboarding-step">
                      <div className="onboarding-step-num">3</div>
                      <div className="onboarding-step-body">
                        <div className="onboarding-step-title">Run your agent</div>
                        <div className="onboarding-step-desc">Once connected, your agent actions will appear here in real time. This checklist disappears automatically once your first action is logged.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="stats-grid">
                {[
                  { label: "Active Agents",   value: (stats.total_agents || 0) - (stats.paused_agents || 0) },
                  { label: "Total Actions",   value: (stats.total_actions || 0).toLocaleString() },
                  { label: "Flagged Actions", value: stats.flagged_actions || 0, v: (stats.flagged_actions || 0) > 0 ? "warn" : "" },
                  { label: "Active Alerts",   value: stats.active_alerts || 0,  v: (stats.active_alerts || 0) > 0 ? "danger" : "" },
                  { label: "Paused Agents",   value: stats.paused_agents || 0,  v: (stats.paused_agents || 0) > 0 ? "warn" : "" },
                ].map(({ label, value, v }) => (
                  <div key={label} className="sc"><div className="slabel">{label}</div><div className={`sval ${v || ""}`}>{value}</div></div>
                ))}
              </div>
              <div className="gc rw">
                <div className="rh"><span className="rt">Risk Distribution</span><span className="mono dim" style={{ fontSize: 11 }}>{(stats.total_actions || 0).toLocaleString()} actions</span></div>
                <div className="rbar">
                  {[{ k: "critical", c: "#ff4d4d" }, { k: "high", c: "#ff9500" }, { k: "medium", c: "#f5c518" }, { k: "low", c: "#4ade80" }].map(({ k, c }) => (
                    <div key={k} className="rseg" style={{ width: `${((d[k] || 0) / total) * 100}%`, background: c }} />
                  ))}
                </div>
                <div className="rleg">
                  {[{ k: "critical", c: "#ff4d4d", l: "Critical" }, { k: "high", c: "#ff9500", l: "High" }, { k: "medium", c: "#f5c518", l: "Medium" }, { k: "low", c: "#4ade80", l: "Low" }].map(({ k, c, l }) => (
                    <div key={k} className="rli"><div className="rdot" style={{ background: c }} />{l} — {(d[k] || 0).toLocaleString()}</div>
                  ))}
                </div>
              </div>
              <div className="sh"><span className="st">Recent Alerts</span><span className="sm">latest 3</span></div>
              <div className="gc tw">
                {activeAlerts.length === 0 ? <div className="empty"><div className="empty-icon">✓</div>No active alerts</div> : (
                  <table>
                    <thead><tr><th style={{ width: 4 }}></th><th>Alert</th><th>Agent</th><th>Severity</th><th>Time</th></tr></thead>
                    <tbody>
                      {activeAlerts.slice(0, 3).map(a => {
                        const cfg = sevCfg[a.level] || sevCfg.low;
                        return (
                          <tr key={a.id}>
                            <td style={{ padding: "0 0 0 14px" }}><div className="svbar" style={{ background: cfg.c }} /></td>
                            <td><div className="amsg">{a.message}</div><div className="amet">{a.agent_id}</div></td>
                            <td className="muted" style={{ fontSize: 12 }}>{a.agent_id}</td>
                            <td><span className="chip" style={{ background: cfg.bg, color: cfg.c, borderColor: cfg.b }}>{(a.level || "").toUpperCase()}</span></td>
                            <td className="mono dim" style={{ fontSize: 11 }}>{timeAgo(a.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {view === "agents" && (
            <>
              <AgentManager agents={agents} setAgents={setAgents} apiKey={apiKey} planInfo={planInfo} />
              <div className="sh"><span className="st">All Agents</span><span className="sm">{agents.length} registered</span></div>
              <div className="gc tw">
                {agents.length === 0 ? <div className="empty"><div className="empty-icon">◎</div>No agents connected yet.</div> : (
                  <table>
                    <thead><tr><th>Agent</th><th>Status</th><th>Actions</th><th>Flagged</th><th>Avg Risk</th><th>Last Seen</th><th></th></tr></thead>
                    <tbody>
                      {agents.map(a => (
                        <tr key={a.agent_id}>
                          <td><div className="aname">{a.name || a.agent_id}</div><div className="aid">{a.agent_id}</div></td>
                          <td><span className={`chip ${a.paused ? "cp" : "ca"}`}>{a.paused ? "PAUSED" : "ACTIVE"}</span></td>
                          <td className="mono muted">{(a.total_actions || 0).toLocaleString()}</td>
                          <td>{(a.flagged_actions || 0) > 0 ? <span className="chip cf">{a.flagged_actions} flagged</span> : <span className="dim mono">—</span>}</td>
                          <td><RS score={parseFloat(a.avg_risk_score) || 0} /></td>
                          <td className="mono dim" style={{ fontSize: 11 }}>{timeAgo(a.last_seen)}</td>
                          <td style={{display:"flex",gap:6}}>
                        {a.paused ? <button className="btn bre" onClick={() => onResume(a.agent_id)}>Resume</button> : <button className="btn bpa" onClick={() => onPause(a.agent_id)}>Pause</button>}
                        <button className="btn bac" onClick={() => { setEditingProfile(a.agent_id); setProfileForm({ allowed_action_types: (a.allowed_action_types||[]).join(", "), allowed_resources: (a.allowed_resources||[]).join(", "), blocked_resources: (a.blocked_resources||[]).join(", "), max_actions_per_minute: a.max_actions_per_minute||60, max_risk_score: a.max_risk_score||1.0 }); }}>Profile</button>
                        <button className="btn" style={{background:"rgba(255,77,77,0.08)",color:"#ff4d4d",borderColor:"rgba(255,77,77,0.2)"}} onClick={async()=>{if(!window.confirm(`Delete agent "${a.agent_id}"?`))return;const r=await fetch(`${API_BASE}/api/agents/${a.agent_id}`,{method:"DELETE",headers:H});if(r.ok)setAgents(p=>p.filter(x=>x.agent_id!==a.agent_id));}}>Delete</button>
                      </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            {editingProfile && (
              <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{background:"#0e0e14",border:"1px solid rgba(255,255,255,0.12)",borderRadius:16,padding:32,width:520,backdropFilter:"blur(24px)"}}>
                  <div style={{fontSize:16,fontWeight:600,color:"#fff",marginBottom:6}}>Permission Profile</div>
                  <div style={{fontSize:12,color:"var(--t2)",marginBottom:20}}>Define what this agent is allowed to do. Leave blank for no restriction.</div>
                  {[
                    {label:"Allowed Action Types", key:"allowed_action_types", placeholder:"file_read, api_call, database_query"},
                    {label:"Allowed Resources (glob patterns)", key:"allowed_resources", placeholder:"/tmp/*, /data/readonly/*"},
                    {label:"Blocked Resources (glob patterns)", key:"blocked_resources", placeholder:"prod.*, *.env, /etc/*"},
                  ].map(({label,key,placeholder}) => (
                    <div key={key} style={{marginBottom:12}}>
                      <div style={{fontSize:11,color:"var(--t3)",marginBottom:4,fontFamily:"var(--mono)"}}>{label}</div>
                      <input placeholder={placeholder} value={profileForm[key]} onChange={e=>setProfileForm(p=>({...p,[key]:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid var(--gb)",borderRadius:8,padding:"8px 12px",color:"var(--w)",fontSize:12,outline:"none"}} />
                    </div>
                  ))}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                    <div>
                      <div style={{fontSize:11,color:"var(--t3)",marginBottom:4,fontFamily:"var(--mono)"}}>Max Actions / Minute</div>
                      <input type="number" value={profileForm.max_actions_per_minute} onChange={e=>setProfileForm(p=>({...p,max_actions_per_minute:parseInt(e.target.value)||60}))} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid var(--gb)",borderRadius:8,padding:"8px 12px",color:"var(--w)",fontSize:12,outline:"none"}} />
                    </div>
                    <div>
                      <div style={{fontSize:11,color:"var(--t3)",marginBottom:4,fontFamily:"var(--mono)"}}>Max Risk Score (0-1)</div>
                      <input type="number" step="0.1" min="0" max="1" value={profileForm.max_risk_score} onChange={e=>setProfileForm(p=>({...p,max_risk_score:parseFloat(e.target.value)||1.0}))} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid var(--gb)",borderRadius:8,padding:"8px 12px",color:"var(--w)",fontSize:12,outline:"none"}} />
                    </div>
                  </div>
                  {profileMsg && <div style={{fontSize:12,color:profileMsg.includes("!")?"#4ade80":"#ff6b6b",marginBottom:12}}>{profileMsg}</div>}
                  <div style={{display:"flex",gap:10}}>
                    <button onClick={() => onSaveProfile(editingProfile)} style={{flex:1,background:"#fff",color:"#000",border:"none",borderRadius:8,padding:"10px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Save Profile</button>
                    <button onClick={() => setEditingProfile(null)} style={{flex:1,background:"transparent",color:"var(--t2)",border:"1px solid var(--gb)",borderRadius:8,padding:"10px",fontSize:13,cursor:"pointer"}}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
            </>
          )}

          {view === "actions" && (
            <>
              <div className="sh"><span className="st">Action Log</span><span className="sm">{actions.length} shown</span></div>
              <div className="gc tw">
                {actions.length === 0 ? <div className="empty"><div className="empty-icon">≡</div>No actions logged yet.</div> : (
                  <table>
                    <thead><tr><th>Agent</th><th>Action Type</th><th>Resource</th><th>Risk</th><th>Mode</th><th>Status</th><th>Time</th></tr></thead>
                    <tbody>
                      {actions.map(a => (
                        <tr key={a.id}>
                          <td className="muted" style={{ fontSize: 12 }}>{a.agent_id}</td>
                          <td className="mono" style={{ fontSize: 12 }}>{a.action_type || "—"}</td>
                          <td className="mono dim" style={{ fontSize: 12 }}>{a.resource || "—"}</td>
                          <td><RS score={a.risk_score || 0} /></td>
                          <td><span className={`chip ${a.kill_switch_mode === "ROLLBACK" ? "cr" : a.kill_switch_mode === "PAUSE" ? "cm" : "calt"}`}>{a.kill_switch_mode || "ALERT"}</span></td>
                          <td><span className={`chip ${a.flagged ? "cf" : "ck"}`}>{a.flagged ? "FLAGGED" : "CLEAN"}</span></td>
                          <td className="mono dim" style={{ fontSize: 11 }}>{timeAgo(a.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {view === "alerts" && (
            <>
              <div className="sh"><span className="st">Active Alerts</span><span className="sm">{activeAlerts.length} unacknowledged</span>{activeAlerts.length>0&&<button className="btn bac" onClick={async()=>{await Promise.all(activeAlerts.map(a=>fetch(`${API_BASE}/api/alerts/${a.id}/acknowledge`,{method:"PATCH",headers:H})));setAlerts(p=>p.map(a=>({...a,acknowledged:true})));setStats(p=>({...p,active_alerts:0}));}}>Acknowledge all</button>}</div>
              <div className="gc tw">
                {activeAlerts.length === 0 ? <div className="empty"><div className="empty-icon">✓</div>No active alerts</div> : (
                  <table>
                    <thead><tr><th style={{ width: 4 }}></th><th>Alert</th><th>Agent</th><th>Severity</th><th>Time</th><th></th></tr></thead>
                    <tbody>
                      {activeAlerts.map(a => {
                        const cfg = sevCfg[a.level] || sevCfg.low;
                        return (
                          <tr key={a.id}>
                            <td style={{ padding: "0 0 0 14px" }}><div className="svbar" style={{ background: cfg.c }} /></td>
                            <td><div className="amsg">{a.message}</div><div className="amet">{a.agent_id}</div></td>
                            <td className="muted" style={{ fontSize: 12 }}>{a.agent_id}</td>
                            <td><span className="chip" style={{ background: cfg.bg, color: cfg.c, borderColor: cfg.b }}>{(a.level || "").toUpperCase()}</span></td>
                            <td className="mono dim" style={{ fontSize: 11 }}>{timeAgo(a.created_at)}</td>
                            <td><button className="btn bac" onClick={() => onAck(a.id)}>Acknowledge</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {view === "apikey" && (
            <>
              <div className="sh"><span className="st">Your API Key</span></div>
              <div className="api-key-section">
                <div className="api-key-header">
                  <span className="api-key-title">SDK Integration Key</span>
                </div>
                <div className="api-key-val">
                  <span>{showKey ? apiKey : apiKey.slice(0, 12) + "••••••••••••••••••••••••••••••••"}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="copy-btn" onClick={() => setShowKey(s => !s)}>{showKey ? "Hide" : "Show"}</button>
                    <button className="copy-btn" onClick={() => { navigator.clipboard.writeText(apiKey); }}>Copy</button>
                    <button className="copy-btn" onClick={onRegenerate} disabled={regenerating} style={{color: regenerating ? "var(--t3)" : "#f87171", borderColor: "rgba(248,113,113,0.3)"}}>{regenerating ? "Regenerating..." : "Regenerate"}</button>
                  </div>
                  {regenMsg && <div style={{fontSize:11,color:"#f59e0b",marginTop:8,fontFamily:"var(--mono)"}}>{regenMsg}</div>}
                </div>
              </div>
              <div className="gc" style={{ padding: "24px" }}>
                <div className="st" style={{ marginBottom: 16 }}>Quick Start</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "#a89fe0", background: "rgba(0,0,0,0.3)", padding: "16px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", lineHeight: 1.8, whiteSpace: "pre" }}>{`pip install vaultak

from vaultak import Vaultak

vt = Vaultak(api_key="${apiKey.slice(0, 12)}...")

with vt.monitor("my-agent"):
    # your agent code here
    pass`}</div>
              </div>
            </>
          )}

          {view === "usage" && (
            <>
              <div className="stats-grid" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
                {[
                  { label: "Total Actions",   value: (usage?.total_actions || 0).toLocaleString() },
                  { label: "Actions Today",   value: (usage?.actions_today || 0).toLocaleString() },
                  { label: "This Month",      value: (usage?.actions_this_month || 0).toLocaleString() },
                  { label: "Flagged Rate",    value: usage ? `${((usage.flagged_rate || 0) * 100).toFixed(1)}%` : "0%", v: (usage?.flagged_rate || 0) > 0.1 ? "warn" : "" },
                ].map(({ label, value, v }) => (
                  <div key={label} className="sc"><div className="slabel">{label}</div><div className={`sval ${v || ""}`}>{value}</div></div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
                <div className="gc" style={{padding:"20px 24px"}}>
                  <div className="st" style={{marginBottom:16}}>Daily Actions — Last 7 Days</div>
                  {usage?.daily_breakdown?.length > 0 ? (
                    <div style={{display:"flex",alignItems:"flex-end",gap:6,height:80}}>
                      {usage.daily_breakdown.map((d,i) => {
                        const max = Math.max(...usage.daily_breakdown.map(x=>x.count));
                        const h = max > 0 ? (d.count/max)*100 : 0;
                        return <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                          <div style={{width:"100%",background:"rgba(99,88,255,0.6)",borderRadius:3,height:`${h}%`,minHeight:2,transition:"height .3s"}}/>
                          <div style={{fontSize:9,color:"var(--t3)",fontFamily:"var(--mono)"}}>{d.day.slice(5)}</div>
                        </div>
                      })}
                    </div>
                  ) : <div className="empty" style={{padding:20}}>No data yet</div>}
                </div>
                <div className="gc" style={{padding:"20px 24px"}}>
                  <div className="st" style={{marginBottom:16}}>Top Agents</div>
                  {usage?.top_agents?.length > 0 ? usage.top_agents.map((a,i) => (
                    <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--gb)"}}>
                      <span style={{fontSize:12,fontFamily:"var(--mono)",color:"var(--t)"}}>{a.agent_id}</span>
                      <span style={{fontSize:11,color:"var(--t2)",fontFamily:"var(--mono)"}}>{a.count.toLocaleString()} actions</span>
                    </div>
                  )) : <div className="empty" style={{padding:20}}>No agents yet</div>}
                </div>
              </div>
              <div className="gc" style={{padding:"20px 24px"}}>
                <div className="st" style={{marginBottom:16}}>Summary</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
                  {[
                    {label:"Total Agents", value: usage?.total_agents || 0},
                    {label:"Total Alerts", value: usage?.total_alerts || 0},
                    {label:"Flagged Actions", value: usage?.flagged_actions || 0},
                  ].map(({label,value}) => (
                    <div key={label} style={{textAlign:"center",padding:"16px",background:"rgba(255,255,255,0.03)",borderRadius:10,border:"1px solid var(--gb)"}}>
                      <div style={{fontSize:24,fontWeight:600,color:"#fff",marginBottom:4}}>{value.toLocaleString()}</div>
                      <div style={{fontSize:11,color:"var(--t3)",fontFamily:"var(--mono)",letterSpacing:".08em"}}>{label.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}


          {view === "billing" && (
            <>
              <div className="sh"><span className="st">Plan & Billing</span><span style={{fontSize:12,color:"var(--t2)",marginLeft:"auto",fontFamily:"var(--mono)",background:"rgba(99,88,255,0.15)",border:"1px solid rgba(99,88,255,0.3)",borderRadius:6,padding:"3px 10px",textTransform:"uppercase",letterSpacing:".08em"}}>Starter</span></div>
              <div className="gc" style={{padding:"24px",marginBottom:16}}>
                <div className="billing-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
                  {[
                    {plan:"pro",       label:"Pro",        price:"$49",  desc:"5 agents · 100K actions/mo · Policy engine · Email support"},
                    {plan:"team",      label:"Team",       price:"$99",  desc:"15 agents · 500K actions/mo · PII masking · Priority support"},
                    {plan:"business",  label:"Business",   price:"$299", desc:"50 agents · 2M actions/mo · SIEM · Shadow AI · SLA"},
                    {plan:"enterprise",label:"Enterprise", price:"$999", desc:"Unlimited agents & actions · On-premises · SSO · Dedicated support"},
                  ].map(({plan, label, price, desc}) => (
                    <div key={plan} style={{background:"rgba(255,255,255,0.03)",border:"1px solid var(--gb)",borderRadius:10,padding:"20px",display:"flex",flexDirection:"column",gap:8}}>
                      <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{label}</div>
                      <div style={{fontSize:24,fontWeight:700,color:"#fff"}}>{price}<span style={{fontSize:12,color:"var(--t3)",fontWeight:400}}>/mo</span></div>
                      <div style={{fontSize:12,color:"var(--t2)",lineHeight:1.6,flex:1}}>{desc}</div>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`${API_BASE}/api/billing/checkout`, {
                              method: "POST",
                              headers: H,
                              body: JSON.stringify({plan}),
                            });
                            const data = await res.json();
                            if (data.checkout_url) window.location.href = data.checkout_url;
                            else alert("Error: " + JSON.stringify(data));
                          } catch(e) { alert("Billing error: " + e.message); }
                        }}
                        style={{background:"rgba(99,88,255,0.8)",color:"#fff",border:"none",borderRadius:7,padding:"10px 14px",fontSize:12,fontWeight:600,cursor:"pointer",marginTop:4}}
                      >
                        Upgrade to {label}
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:20,textAlign:"center"}}>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_BASE}/api/billing/portal`, {
                          method: "POST",
                          headers: H,
                        }).then(r => r.json());
                        if (res.portal_url) window.open(res.portal_url, "_blank");
                      } catch(e) {}
                    }}
                    style={{background:"transparent",color:"var(--t2)",border:"1px solid var(--gb)",borderRadius:7,padding:"8px 20px",fontSize:12,cursor:"pointer"}}
                  >
                    Manage billing →
                  </button>
                </div>
              </div>
            </>
          )}
          {view === "policies" && (
            <>
              <div className="sh"><span className="st">Active Policies</span><span style={{fontSize:12,color:"var(--t2)",marginLeft:"auto"}}>{policies.length} rule{policies.length !== 1 ? "s" : ""}</span></div>
              <div className="gc" style={{padding:"20px 24px",marginBottom:16}}>
                <div className="st" style={{marginBottom:14,fontSize:13}}>Create New Policy</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
                  <input placeholder="Policy name" value={newPolicy.name} onChange={e=>setNewPolicy(p=>({...p,name:e.target.value}))} style={{background:"rgba(255,255,255,0.05)",border:"1px solid var(--gb)",borderRadius:8,padding:"8px 12px",color:"var(--w)",fontSize:13,outline:"none"}} />
                  <input placeholder="Action type (e.g. file_delete)" value={newPolicy.action_type} onChange={e=>setNewPolicy(p=>({...p,action_type:e.target.value}))} style={{background:"rgba(255,255,255,0.05)",border:"1px solid var(--gb)",borderRadius:8,padding:"8px 12px",color:"var(--w)",fontSize:13,outline:"none"}} />
                  <input placeholder="Resource pattern (e.g. prod.*)" value={newPolicy.resource_pattern} onChange={e=>setNewPolicy(p=>({...p,resource_pattern:e.target.value}))} style={{background:"rgba(255,255,255,0.05)",border:"1px solid var(--gb)",borderRadius:8,padding:"8px 12px",color:"var(--w)",fontSize:13,outline:"none"}} />
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:14}}>
                  <select value={newPolicy.effect} onChange={e=>setNewPolicy(p=>({...p,effect:e.target.value}))} style={{background:"rgba(255,255,255,0.05)",border:"1px solid var(--gb)",borderRadius:8,padding:"8px 12px",color:"var(--w)",fontSize:13,outline:"none"}}>
                    <option value="block">Block</option>
                    <option value="pause">Pause</option>
                    <option value="allow">Allow</option>
                  </select>
                  <input placeholder="Max risk score (0-1)" type="number" step="0.1" min="0" max="1" value={newPolicy.max_risk_score} onChange={e=>setNewPolicy(p=>({...p,max_risk_score:e.target.value}))} style={{background:"rgba(255,255,255,0.05)",border:"1px solid var(--gb)",borderRadius:8,padding:"8px 12px",color:"var(--w)",fontSize:13,outline:"none"}} />
                  <input placeholder="Priority (0-100)" type="number" value={newPolicy.priority} onChange={e=>setNewPolicy(p=>({...p,priority:parseInt(e.target.value)||0}))} style={{background:"rgba(255,255,255,0.05)",border:"1px solid var(--gb)",borderRadius:8,padding:"8px 12px",color:"var(--w)",fontSize:13,outline:"none"}} />
                  <button onClick={async()=>{
                    if(!newPolicy.name||!newPolicy.action_type){setPolicyMsg("Name and action type required");return;}
                    const body={name:newPolicy.name,action_type:newPolicy.action_type,effect:newPolicy.effect,priority:newPolicy.priority};
                    if(newPolicy.resource_pattern) body.resource_pattern=newPolicy.resource_pattern;
                    if(newPolicy.max_risk_score) body.max_risk_score=parseFloat(newPolicy.max_risk_score);
                    const r=await fetch(`${API_BASE}/api/policies`,{method:"POST",headers:{...H,"Content-Type":"application/json"},body:JSON.stringify(body)});
                    if(r.ok){const p=await r.json();setPolicies(prev=>[p,...prev]);setNewPolicy({name:"",action_type:"",resource_pattern:"",effect:"block",max_risk_score:"",priority:0});setPolicyMsg("Policy created!");}
                    else setPolicyMsg("Failed to create policy");
                    setTimeout(()=>setPolicyMsg(""),3000);
                  }} style={{background:"rgba(255,255,255,0.1)",border:"1px solid var(--gb2)",borderRadius:8,padding:"8px 16px",color:"var(--w)",fontSize:13,cursor:"pointer",fontWeight:500}}>+ Add Policy</button>
                </div>
                {policyMsg && <div style={{fontSize:12,color:policyMsg.includes("!")?"#4ade80":"#ff6b6b"}}>{policyMsg}</div>}
              </div>
              <div className="gc" style={{padding:0}}>
                {policies.length === 0 ? (
                  <div style={{padding:"40px",textAlign:"center",color:"var(--t2)",fontSize:13}}>No policies yet. Create one above to start enforcing rules.</div>
                ) : (
                  <table>
                    <thead><tr><th>Name</th><th>Action Type</th><th>Resource Pattern</th><th>Effect</th><th>Max Risk</th><th>Priority</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                      {policies.map(p => (
                        <tr key={p.id}>
                          <td style={{fontWeight:500}}>{p.name}</td>
                          <td><span style={{fontFamily:"var(--mono)",fontSize:11,background:"rgba(255,255,255,0.06)",padding:"2px 7px",borderRadius:4}}>{p.action_type || "*"}</span></td>
                          <td><span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--t2)"}}>{p.resource_pattern || "*"}</span></td>
                          <td><span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:p.effect==="block"?"rgba(255,77,77,0.15)":p.effect==="pause"?"rgba(255,165,0,0.15)":"rgba(74,222,128,0.15)",color:p.effect==="block"?"#ff6b6b":p.effect==="pause"?"#ffa500":"#4ade80"}}>{p.effect.toUpperCase()}</span></td>
                          <td>{p.max_risk_score != null ? p.max_risk_score : "—"}</td>
                          <td>{p.priority}</td>
                          <td><span style={{padding:"3px 10px",borderRadius:20,fontSize:11,background:p.enabled?"rgba(74,222,128,0.1)":"rgba(255,255,255,0.05)",color:p.enabled?"#4ade80":"var(--t2)"}}>{p.enabled?"Active":"Disabled"}</span></td>
                          <td>
                            <button onClick={async()=>{
                              await fetch(`${API_BASE}/api/policies/${p.id}?enabled=${!p.enabled}`,{method:"PATCH",headers:H});
                              setPolicies(prev=>prev.map(x=>x.id===p.id?{...x,enabled:!x.enabled}:x));
                            }} style={{background:"transparent",border:"1px solid var(--gb)",borderRadius:6,padding:"4px 10px",color:"var(--t2)",fontSize:11,cursor:"pointer",marginRight:6}}>{p.enabled?"Disable":"Enable"}</button>
                            <button onClick={async()=>{
                              await fetch(`${API_BASE}/api/policies/${p.id}`,{method:"DELETE",headers:H});
                              setPolicies(prev=>prev.filter(x=>x.id!==p.id));
                            }} style={{background:"transparent",border:"1px solid rgba(255,77,77,0.3)",borderRadius:6,padding:"4px 10px",color:"#ff6b6b",fontSize:11,cursor:"pointer"}}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    <nav className="mobile-nav">
        {[
          {id:"overview",label:"Overview",icon:<OvIco/>},
          {id:"agents",label:"Agents",icon:<AgIco/>},
          {id:"alerts",label:"Alerts",icon:<AlIco/>,badge:activeAlerts.length},
          {id:"apikey",label:"API Key",icon:<KeyIco/>},
          {id:"billing",label:"Billing",icon:<BilIco/>},
        ].map(n=>(
          <div key={n.id} className={`mobile-nav-item ${view===n.id?"active":""}`} onClick={()=>setView(n.id)} style={{position:"relative"}}>
            {n.icon}
            <span className="mobile-nav-label">{n.label}</span>
            {n.badge>0&&<span className="mobile-nav-badge">{n.badge}</span>}
          </div>
        ))}
      </nav>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
function AppInner() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [apiKey, setApiKey] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
  if (!user) return;
  const saved = localStorage.getItem("vtk_api_key");
  if (saved && saved.startsWith("vtk_")) {
    setApiKey(saved);
    setReady(true);
    return;
  }
  fetch(`${API_BASE}/api/onboard`, {
    method: "POST",
    headers: {
      "x-clerk-user-id": user.id,
      "x-user-email": user.primaryEmailAddress?.emailAddress || "",
      "Content-Type": "application/json",
    },
  })
    .then(r => r.json())
    .then(data => {
      if (data.api_key && data.api_key.startsWith("vtk_")) {
        setApiKey(data.api_key);
        localStorage.setItem("vtk_api_key", data.api_key);
      }
      setReady(true);
    })
    .catch(() => setReady(true));
}, [user]);

  if (!isLoaded || (isSignedIn && !ready)) return (
    <div className="onboard-page">
      <div className="onboard-loading"><div className="spinner" /><span>Loading...</span></div>
    </div>
  );

  if (!isSignedIn) return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-name">Vaultak</div>
        <div className="auth-brand-sub">Runtime Security for AI Agents</div>
      </div>
      <SignIn />
    </div>
  );

  return <Dashboard apiKey={apiKey} />;
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      <style>{css}</style>
      <div className="bg-mid" style={{ position: "fixed", top: "40%", left: "35%", width: "40%", height: "40%", background: "radial-gradient(ellipse,rgba(180,60,255,0.07) 0%,transparent 65%)", pointerEvents: "none", zIndex: 0 }} />
      <AppInner />
    </ClerkProvider>
  );
}
