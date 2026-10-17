import { speechTags } from "@/lib/i18n/tts";

/**
 * Text-to-speech with the diner's own device voices (Web Speech API): free, no server call, works
 * offline once the page is loaded. Buttons are rendered hidden; the inline script below reveals only
 * those whose language the device can really speak, so nobody sees a button that does nothing.
 * Server-rendered markup + one inline script: no React client component, no hydration cost.
 */
export function SpeakButton({ text, lang, label }: { text: string; lang: string; label: string }) {
  if (!text.trim()) return null;
  return (
    <button type="button" hidden suppressHydrationWarning className="speak" data-speak data-tags={speechTags(lang).join(",")} data-text={text} aria-label={label} aria-pressed="false" title={label}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
      </svg>
    </button>
  );
}

const SCRIPT = `(function(){try{
if(!("speechSynthesis" in window)||typeof SpeechSynthesisUtterance==="undefined")return;
var ss=window.speechSynthesis,voices=[],cur=null;
function norm(s){return String(s).toLowerCase().replace(/_/g,"-")}
function find(tags){for(var i=0;i<tags.length;i++){var t=norm(tags[i]);for(var j=0;j<voices.length;j++){var v=norm(voices[j].lang);if(v===t||(t.indexOf("-")<0&&v.indexOf(t+"-")===0))return voices[j]}}return null}
function reveal(){voices=ss.getVoices();if(!voices.length)return;var bs=document.querySelectorAll("button[data-speak]");for(var i=0;i<bs.length;i++){if(find(bs[i].getAttribute("data-tags").split(",")))bs[i].hidden=false}}
reveal();if(ss.addEventListener)ss.addEventListener("voiceschanged",reveal);else ss.onvoiceschanged=reveal;
setTimeout(reveal,600);setTimeout(reveal,2000);
function chunks(t){var parts=t.replace(/\\s+/g," ").trim().replace(/([.!?\\u3002\\uff01\\uff1f\\u0964\\u061f])\\s+/g,"$1\\u0001").split("\\u0001"),out=[],c="";for(var i=0;i<parts.length;i++){var p=parts[i];if(c&&(c+" "+p).length>180){out.push(c);c=p}else c=c?c+" "+p:p}if(c)out.push(c);return out}
function stop(){ss.cancel();if(cur){cur.removeAttribute("data-speaking");cur.setAttribute("aria-pressed","false");cur=null}}
document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("button[data-speak]");if(!b)return;e.preventDefault();if(cur===b){stop();return}stop();var v=find(b.getAttribute("data-tags").split(","));if(!v)return;var parts=chunks(b.getAttribute("data-text")||"");if(!parts.length)return;cur=b;b.setAttribute("data-speaking","");b.setAttribute("aria-pressed","true");parts.forEach(function(p,i){var u=new SpeechSynthesisUtterance(p);u.voice=v;u.lang=v.lang;u.rate=0.95;if(i===parts.length-1){u.onend=u.onerror=function(){if(cur===b)stop()}}ss.speak(u)})});
document.addEventListener("visibilitychange",function(){if(document.hidden)stop()});window.addEventListener("pagehide",stop);
}catch(e){}})();`;

export function SpeakScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
