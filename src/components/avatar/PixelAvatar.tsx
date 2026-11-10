"use client";
import type { CSSProperties } from "react";

export interface AvatarLook {
 skin_tone:string;
 hair_id:string;
 outfit_id:string;
 shoes_id:string;
 accessory_id:string;
 pet_id:string;
 drink_id:string;
 device_id:string;
}

const SKIN:Record<string,{base:string;shadow:string;light:string}> = {
 light:{base:"#f3c6a5",shadow:"#db9678",light:"#ffe1c8"},
 warm:{base:"#e9af87",shadow:"#c77e61",light:"#ffcca8"},
 medium:{base:"#cb8a67",shadow:"#9c5e49",light:"#efb08c"},
 tan:{base:"#aa6848",shadow:"#75432f",light:"#cf8a64"},
 deep:{base:"#814a32",shadow:"#573020",light:"#ad7150"},
 dark:{base:"#573323",shadow:"#382116",light:"#825039"},
};
const PX:CSSProperties={shapeRendering:"crispEdges"};

function PixelPet({kind}:{kind:string}){
 if(kind==="pet_none")return null;
 const dog=kind==="pet_dog",body=dog?"#b87947":"#f7e8d6",shade=dog?"#77442c":"#bcaaa1",detail=dog?"#5a3426":"#ca9d9a";
 return <g transform="translate(194 175)" stroke="#392d32" strokeWidth="2">
  <rect x="7" y="24" width="43" height="28" fill={shade}/>
  <rect x="5" y="22" width="45" height="25" fill={body}/>
  <rect x="11" y="43" width="10" height="10" fill={shade}/><rect x="33" y="43" width="10" height="10" fill={shade}/>
  <rect x="12" y="10" width="30" height="29" fill={body}/>
  {dog?<><rect x="4" y="9" width="12" height="22" fill={shade}/><rect x="40" y="9" width="10" height="22" fill={shade}/></>:<><path d="M12 14V0L23 12Z" fill={body}/><path d="M32 12L44 0V15Z" fill={body}/><path d="M16 10V5L21 11Z M36 11L40 5V11Z" fill="#e8a6a9" stroke="none"/></>}
  <rect x="19" y="23" width="5" height="5" fill="#292731" stroke="none"/>
  <rect x="33" y="23" width="5" height="5" fill="#292731" stroke="none"/>
  <rect x="27" y="29" width="4" height="4" fill={detail} stroke="none"/>
  <path d="M49 34Q63 10 56 8" fill="none" stroke={shade} strokeWidth="5"/>
 </g>;
}

export default function PixelAvatar({look,animated=false,className=""}:{look:AvatarLook;animated?:boolean;className?:string}){
 const skin=SKIN[look.skin_tone]??SKIN.medium;
 const hair=look.hair_id;
 const hairColor=hair==="hair_pink"?"#bf5f86":hair==="hair_brown_short"?"#6a4036":hair==="hair_bun"?"#382c35":hair==="hair_curly"?"#4c302d":"#292532";
 const hairHighlight=hair==="hair_pink"?"#dc89ad":hair==="hair_brown_short"?"#9f6b54":hair==="hair_bun"?"#5d4248":hair==="hair_curly"?"#705043":"#554654";
 const outfit=look.outfit_id;
 const top=outfit==="outfit_blazer"?"#172943":outfit==="outfit_premium"?"#d590a8":outfit==="outfit_comfy"?"#98a9ba":"#f9eee2";
 const trim=outfit==="outfit_blazer"?"#f5dfd1":outfit==="outfit_premium"?"#fff1e8":outfit==="outfit_comfy"?"#dde7ec":"#cbb19e";
 const trousers=outfit==="outfit_premium"?"#3c334c":outfit==="outfit_comfy"?"#657c93":"#4e617c";
 const formal=look.shoes_id==="shoes_formal";
 return <svg viewBox="0 0 280 280" role="img" aria-label="Bonequinha pixel art personalizada" className={className} style={PX}>
   <ellipse cx="141" cy="252" rx="60" ry="8" fill="#b58e91" opacity=".25"/>
   <g className={animated?"herway-avatar-step":undefined}>
    {/* Cabelo traseiro e trança */}
    <rect x="104" y="57" width="73" height={hair==="hair_brown_short"?"95":"125"} fill="#29242e"/>
    <rect x="109" y="59" width="64" height={hair==="hair_brown_short"?"92":"122"} fill={hairColor}/>
    <rect x="110" y="72" width="8" height="86" fill={hairHighlight}/>
    {hair==="hair_black_long"&&<><rect x="164" y="142" width="18" height="53" fill={hairColor}/><rect x="170" y="188" width="17" height="13" fill={hairColor}/></>}
    {hair==="hair_curly"&&<g fill={hairColor}>{[[103,61],[115,48],[130,51],[144,45],[160,52],[171,65],[101,87],[175,90],[102,112],[175,115],[107,136],[173,139],[108,156],[171,159]].map(([x,y],i)=><rect key={i} x={x} y={y} width="17" height="17"/>)}</g>}
    {hair==="hair_bun"&&<><rect x="119" y="40" width="47" height="28" fill={hairColor}/><rect x="127" y="31" width="27" height="20" fill={hairHighlight}/></>}
    {/* pernas e sapatos */}
    <rect x="118" y="190" width="42" height="51" fill="#363947"/>
    <rect x="116" y="188" width="21" height="54" fill={trousers}/><rect x="143" y="188" width="21" height="54" fill={trousers}/>
    <rect x="118" y="195" width="5" height="38" fill="#8395a5" opacity=".38"/>
    <rect x="145" y="195" width="4" height="38" fill="#8395a5" opacity=".3"/>
    <rect x="113" y="237" width="26" height="11" fill={formal?"#453c3b":"#f7eee7"}/>
    <rect x="142" y="237" width="26" height="11" fill={formal?"#453c3b":"#f7eee7"}/>
    <rect x="114" y="246" width="25" height="4" fill="#51444d"/>
    <rect x="142" y="246" width="27" height="4" fill="#51444d"/>
    {/* roupa corpo */}
    <rect x="106" y="144" width="65" height="56" fill="#51404a"/>
    <rect x="109" y="144" width="59" height="52" fill={top}/>
    <rect x="133" y="142" width="11" height="15" fill={skin.base}/>
    <path d="M126 146L138 166L149 146" fill={trim} stroke="#77676c" strokeWidth="1.3"/>
    {outfit==="outfit_blazer"&&<><path d="M113 152L124 179L137 166L123 153Z" fill="#263d60"/><path d="M163 152L152 179L140 166L153 153Z" fill="#263d60"/></>}
    {outfit==="outfit_casual"&&<><rect x="119" y="180" width="36" height="4" fill="#deccb7"/><rect x="137" y="172" width="3" height="10" fill="#a47d78"/></>}
    {outfit==="outfit_comfy"&&<><rect x="113" y="147" width="55" height="7" fill="#dae2e5"/><rect x="113" y="184" width="55" height="8" fill="#8499ae"/></>}
    {outfit==="outfit_premium"&&<><rect x="116" y="177" width="45" height="6" fill="#f9c8b5"/><rect x="134" y="165" width="7" height="7" fill="#faf1cb"/></>}
    {/* braços */}
    <rect x="94" y="146" width="16" height="49" fill={top}/>
    <rect x="169" y="146" width="16" height="49" fill={top}/>
    <rect x="95" y="185" width="13" height="17" fill={skin.shadow}/>
    <rect x="171" y="185" width="12" height="17" fill={skin.shadow}/>
    <rect x="97" y="186" width="9" height="14" fill={skin.base}/>
    <rect x="172" y="186" width="9" height="14" fill={skin.base}/>
    {/* rosto */}
    <rect x="107" y="78" width="70" height="65" fill={skin.shadow}/>
    <rect x="110" y="80" width="65" height="60" fill={skin.base}/>
    <rect x="115" y="84" width="55" height="7" fill={skin.light} opacity=".65"/>
    <rect x="116" y="107" width="15" height="19" fill="#2f2936"/>
    <rect x="151" y="107" width="15" height="19" fill="#2f2936"/>
    <rect x="118" y="109" width="9" height="12" fill="white"/>
    <rect x="153" y="109" width="9" height="12" fill="white"/>
    <rect x="121" y="112" width="6" height="9" fill="#272330"/>
    <rect x="156" y="112" width="6" height="9" fill="#272330"/>
    <rect x="122" y="111" width="3" height="4" fill="white"/>
    <rect x="157" y="111" width="3" height="4" fill="white"/>
    <rect x="111" y="123" width="9" height="5" fill="#e98c91" opacity=".65"/>
    <rect x="167" y="123" width="8" height="5" fill="#e98c91" opacity=".65"/>
    <rect x="137" y="127" width="10" height="3" fill="#9c5e62"/>
    <rect x="140" y="129" width="5" height="2" fill="#bc7378"/>
    {/* franja */}
    <rect x="104" y="66" width="76" height="20" fill={hairColor}/>
    <rect x="112" y="59" width="58" height="14" fill={hairColor}/>
    <rect x="117" y="57" width="35" height="8" fill={hairHighlight}/>
    <rect x="107" y="77" width="20" height="24" fill={hairColor}/>
    <rect x="113" y="90" width="10" height="11" fill={hairHighlight}/>
    <rect x="151" y="74" width="26" height="20" fill={hairColor}/>
    <rect x="168" y="93" width="10" height="30" fill={hairColor}/>
    {hair==="hair_brown_short"&&<rect x="109" y="141" width="64" height="9" fill={hairColor}/>}
    {hair==="hair_pink"&&<rect x="125" y="65" width="10" height="8" fill={hairHighlight}/>}
    {/* acessórios */}
    {look.accessory_id==="accessory_glasses"&&<g stroke="#52454f" strokeWidth="3" fill="none"><rect x="113" y="107" width="20" height="17"/><rect x="148" y="107" width="20" height="17"/><path d="M133 112H148"/></g>}
    {look.accessory_id==="accessory_headphones"&&<g><path d="M103 112V83Q103 55 140 54Q180 54 180 87V112" fill="none" stroke="#e5e3e6" strokeWidth="8"/><path d="M103 100V116M180 100V116" stroke="#585963" strokeWidth="11"/><rect x="96" y="101" width="12" height="25" fill="#f7f1ec"/><rect x="175" y="101" width="12" height="25" fill="#f7f1ec"/></g>}
    {look.accessory_id==="accessory_star"&&<path d="M193 43L197 53L208 54L199 61L202 72L193 66L184 72L187 61L178 54L190 53Z" fill="#f5bd53" stroke="#d49449" strokeWidth="2"/>}
    {/* props */}
    {look.drink_id!=="drink_none"&&<g transform="translate(172 182)"><rect x="6" y="0" width="18" height="27" fill={look.drink_id==="drink_matcha"?"#91b367":"#ead4b0"} stroke="#7a5d55" strokeWidth="3"/><path d="M23 5H29V17H23" fill="none" stroke="#7a5d55" strokeWidth="4"/><path d="M9 -6V-12M17 -6V-14" stroke="#a49a93" strokeWidth="2"/></g>}
    {look.device_id==="device_laptop"&&<g transform="translate(53 161)"><rect x="0" y="0" width="49" height="34" fill="#3e4950" stroke="#d4d6d9" strokeWidth="4"/><rect x="6" y="5" width="36" height="23" fill="#253a38"/><path d="M11 11H30M12 17H39M12 23H25" stroke="#81cd95" strokeWidth="2" strokeDasharray="3 3"/><path d="M-6 35H54L48 41H0Z" fill="#c6ccd0" stroke="#7f8791" strokeWidth="2"/></g>}
   </g>
   <PixelPet kind={look.pet_id}/>
   <style>{`@media (prefers-reduced-motion: no-preference){.herway-avatar-step{animation:herway-avatar-breathe 2.8s ease-in-out infinite;transform-origin:140px 238px}@keyframes herway-avatar-breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}}`}</style>
  </svg>;
}
