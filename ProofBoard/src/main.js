import React from 'react';
import ReactDOM from 'react-dom/client';
import htm from 'htm';
import { ethers } from 'ethers';
import './styles.css';

const {useState,useRef,useEffect,useMemo}=React;
const html=htm.bind(React.createElement);

const CAT={
 Code:{c:['#8f7dff','#5ff0c0'],g:'{ }'},
 Docs:{c:['#5ff0c0','#7ab8ff'],g:'¶'},
 Design:{c:['#ff8fd0','#8f7dff'],g:'◆'},
 Security:{c:['#ffc46b','#ff7a90'],g:'§'}
};

const ABI = [
 'function submitContribution(string title, string proofUrl, string category) returns (uint256)',
 'function approveContribution(uint256 contributionId)',
 'function rejectContribution(uint256 contributionId)',
 'function getContribution(uint256 contributionId) view returns (address contributor, string title, string proofUrl, uint8 status, uint256 tokenId)',
 'function getContributionCount() view returns (uint256)',
 'function getContributionCategory(uint256 contributionId) view returns (string)',
 'function tokenURI(uint256 tokenId) view returns (string)',
 'function owner() view returns (address)'
];

const CONTRACT_ADDRESS = '0x68Eee9155291F7Da8061a5C8914C0b3f6e796C43';
const GANACHE_CHAIN_ID = 1337n;

const getProvider = () =>
 window.ethereum ? new ethers.BrowserProvider(window.ethereum) : null;

const getContract = runner =>
 new ethers.Contract(CONTRACT_ADDRESS, ABI, runner);

const shorten = a => a ? a.slice(0,6)+'…'+a.slice(-4) : '';

const cleanError = e =>
 e?.shortMessage || e?.reason || e?.message?.slice(0,180) || 'Transaction failed';

const checkNetwork = async provider => {
 const network = await provider.getNetwork();
 if(network.chainId !== GANACHE_CHAIN_ID)
 throw new Error('Switch MetaMask to Ganache Local (Chain ID: 1337) first.');
};

const loadContributions = async () => {
 const provider=getProvider();
 if(!provider) return [];

 await checkNetwork(provider);

 const contract=getContract(provider);
 const count=Number(await contract.getContributionCount());

 const records=await Promise.all(
  Array.from({length:count},(_,i)=>
   Promise.all([
    contract.getContribution(i+1),
    contract.getContributionCategory(i+1)
   ]).then(([c,category])=>({
    id:i+1,
    title:c.title,
    url:c.proofUrl,
    by:shorten(c.contributor),
    a:c.contributor,
    cat:category,
    st:['pending','approved','rejected'][Number(c.status)],
    d:'On-chain',
    tok:Number(c.tokenId)
   }))
  )
 );

 return records.reverse();
};

const grad=c=>`linear-gradient(135deg,${CAT[c].c[0]},${CAT[c].c[1]})`;

function Badge({cat,title,tok,id,size=230,dim}){
 const [a,b]=CAT[cat].c,u='b'+id+size;
 const t=title.length>26?title.slice(0,25)+'…':title;

 return html`<svg viewBox="0 0 200 260" width=${size} style=${{display:'block',opacity:dim?.4:1}} role="img" aria-label=${'Badge: '+title}>
 <defs>
  <linearGradient id=${u+'a'} x1="0" y1="0" x2="1" y2="1">
   <stop offset="0" stopColor=${a}/>
   <stop offset="1" stopColor=${b}/>
  </linearGradient>
  <radialGradient id=${u+'b'} cx=".5" cy=".4" r=".7">
   <stop offset="0" stopColor=${a} stopOpacity=".28"/>
   <stop offset=".7" stopColor="#0d0d14"/>
  </radialGradient>
 </defs>

 <rect x="1" y="1" width="198" height="258" rx="19" fill=${`url(#${u}b)`} stroke=${`url(#${u}a)`} strokeWidth="1.4"/>
 <rect x="9" y="9" width="182" height="242" rx="13" fill="none" stroke="#ffffff14"/>

 <text x="20" y="30" fill=${a} fontFamily="Geist Mono,monospace" fontSize="8.5">proofboard / s1</text>
 <text x="180" y="30" textAnchor="end" fill="#ffffff80" fontFamily="Geist Mono,monospace" fontSize="8.5">${tok?'#'+tok:'#----'}</text>

 <g transform="translate(100 120)">
  <g className="ring">
   ${[...Array(14)].map((_,i)=>html`<ellipse key=${i} rx="72" ry="26" transform=${`rotate(${i*12.857})`} fill="none" stroke=${`url(#${u}a)`} strokeWidth=".8" opacity=".75"/>`)}
  </g>
  <g className="ring r">
   ${[...Array(10)].map((_,i)=>html`<ellipse key=${i} rx="50" ry="50" cx=${Math.cos(i*.628)*22} cy=${Math.sin(i*.628)*22} fill="none" stroke="#ffffff22" strokeWidth=".6"/>`)}
  </g>
  <circle r="31" fill="#0b0b11" stroke=${`url(#${u}a)`} strokeWidth="1.5"/>
  <text textAnchor="middle" y="9" fontFamily="Instrument Serif,serif" fontSize="28" fill=${`url(#${u}a)`}>${CAT[cat].g}</text>
 </g>

 <line x1="20" x2="180" y1="203" y2="203" stroke="#ffffff1a"/>
 <text x="20" y="223" fill="#ecebf3" fontFamily="Instrument Serif,serif" fontSize="15">${t}</text>
 <text x="20" y="241" fill=${b} fontFamily="Geist Mono,monospace" fontSize="8.5">${cat.toLowerCase()} contributor</text>
 </svg>`;
}

function Tilt({children}){
 const r=useRef();

 const mv=e=>{
  const k=r.current.getBoundingClientRect();
  const x=(e.clientX-k.left)/k.width;
  const y=(e.clientY-k.top)/k.height;

  r.current.style.transform=`rotateY(${(x-.5)*22}deg) rotateX(${(.5-y)*22}deg)`;
  r.current.style.setProperty('--mx',x*100+'%');
  r.current.style.setProperty('--my',y*100+'%');
 };

 const lv=()=>{r.current.style.transform=''};

 return html`<div ref=${r} className="tilt" onMouseMove=${mv} onMouseLeave=${lv}>${children}</div>`;
}

function Wallet({w,setW,toast}){
 const [open,setOpen]=useState(false);

 const go=async()=>{
  if(w.s==='connected'){
   setOpen(!open);
   return;
  }

  const provider=getProvider();

  if(!provider){
   toast('Install MetaMask to connect');
   return;
  }

  setW({s:'connecting'});

  try{
   const accounts=await window.ethereum.request({
    method:'eth_requestAccounts'
   });

   const chainId=await window.ethereum.request({
    method:'eth_chainId'
   });

   if(BigInt(chainId)!==GANACHE_CHAIN_ID)
    throw new Error('Switch MetaMask to Ganache Local (Chain ID: 1337) first.');

   const balanceHex=await window.ethereum.request({
    method:'eth_getBalance',
    params:[accounts[0],'latest']
   });

   const balance=BigInt(balanceHex);

   setW({
    s:'connected',
    address:accounts[0],
    a:shorten(accounts[0]),
    n:'Ganache Local',
    bal:Number(ethers.formatEther(balance)).toFixed(4)+' ETH'
   });

   toast('Wallet connected on Ganache Local');
  }catch(e){
   setW({s:'idle'});
   toast(cleanError(e));
  }
 };

 return html`<div style=${{position:'relative'}}>
  <button className=${'btn '+(w.s==='connected'?'':'pri')} onClick=${go} disabled=${w.s==='connecting'}>
   ${w.s==='connecting'&&html`<span className="spin2"></span>`}
   ${w.s==='idle'&&'Connect wallet'}
   ${w.s==='connecting'&&'Connecting...'}
   ${w.s==='connected'&&html`<span><span className="dot"></span> <span className="mono" style=${{marginLeft:6}}>${w.a}</span></span>`}
  </button>

  ${open&&html`<div className="menu">
   <div>
    <span>Network</span>
    <span style=${{color:'var(--tx)'}}>${w.n}</span>
   </div>
   <div>
    <span>Balance</span>
    <span className="mono" style=${{color:'var(--tx)'}}>${w.bal}</span>
   </div>
   <button onClick=${()=>{
    setW({s:'idle'});
    setOpen(false);
    toast('Wallet disconnected from this page');
   }}>Disconnect</button>
  </div>`}
 </div>`;
}

function App(){
 const [w,setW]=useState({s:'idle'});
 const [items,setItems]=useState([]);
 const [busy,setBusy]=useState(false);
 const [isOwner,setIsOwner]=useState(false);
 const [admin,setAdmin]=useState(false);
 const [f,setF]=useState('all');
 const [q,setQ]=useState('');
 const [sel,setSel]=useState(null);
 const [tm,setTm]=useState(null);
 const [form,setForm]=useState({t:'',u:'',c:'Code'});
 const [err,setErr]=useState('');

 const toast=m=>{
  setTm(m);
  clearTimeout(window._t);
  window._t=setTimeout(()=>setTm(null),2800);
 };

 const counts=useMemo(()=>{
  const c={all:items.length,pending:0,approved:0,rejected:0};
  items.forEach(i=>{c[i.st==='minting'?'approved':i.st]++});
  return c;
 },[items]);

 const shown=items.filter(i=>
  (f==='all'||i.st===f||(f==='approved'&&i.st==='minting')) &&
  (i.title+i.by+i.url+i.cat).toLowerCase().includes(q.toLowerCase())
 );

 const cur=items.find(i=>i.id===sel)||items[0];

 const refresh=async()=>{
  try{
   const records=await loadContributions();
   setItems(records);
   setSel(old=>records.some(r=>r.id===old)?old:(records[0]?.id??null));
  }catch(e){
   toast(cleanError(e));
  }
 };

 useEffect(()=>{
  if(!window.ethereum)return;

  refresh();

  const sync=()=>{
   setW({s:'idle'});
   setIsOwner(false);
   refresh();
  };

  window.ethereum.on?.('accountsChanged',sync);
  window.ethereum.on?.('chainChanged',sync);

  return()=>{
   window.ethereum.removeListener?.('accountsChanged',sync);
   window.ethereum.removeListener?.('chainChanged',sync);
  };
 },[]);

 useEffect(()=>{
  if(w.s!=='connected'){
   setIsOwner(false);
   return;
  }

  (async()=>{
   try{
    const contract=getContract(getProvider());
    setIsOwner(
     (await contract.owner()).toLowerCase()===w.address.toLowerCase()
    );
    await refresh();
   }catch(e){
    toast(cleanError(e));
   }
  })();
 },[w.address]);

 const write=async(method,args,success)=>{
  if(busy)return false;

  const provider=getProvider();

  if(!provider){
   toast('MetaMask is required');
   return false;
  }

  setBusy(true);

  try{
   await checkNetwork(provider);

   const signer=await provider.getSigner();
   const contract=getContract(signer);

   const tx=await contract[method](...args);

   toast('Transaction submitted. Waiting for confirmation...');

   const receipt=await tx.wait();

   if(receipt.status!==1)
    throw new Error('Transaction reverted');

   await refresh();

   toast(success);
   return true;
  }catch(e){
   toast(cleanError(e));
   return false;
  }finally{
   setBusy(false);
  }
 };

 const approve=(e,i)=>{
  e.stopPropagation();

  if(!isOwner){
   toast('Only the contract owner can approve');
   return;
  }

  setSel(i.id);
  write('approveContribution',[i.id],'Approved. NFT minted!');
 };

 const reject=(e,i)=>{
  e.stopPropagation();

  if(!isOwner){
   toast('Only the contract owner can reject');
   return;
  }

  write('rejectContribution',[i.id],'Contribution rejected');
 };

 const submit=async e=>{
  e.preventDefault();

  if(w.s!=='connected'){
   setErr('Connect your wallet first so the badge has somewhere to go.');
   return;
  }

  if(form.t.trim().length<6){
   setErr('Give the contribution a title of at least 6 characters.');
   return;
  }

  if(!/^(https?:\/\/)?(www\.)?github\.com\/[\w.-]+\/[\w.-]+/i.test(form.u.trim())){
   setErr('Proof must be a GitHub link, like github.com/owner/repo.');
   return;
  }

  setErr('');

  const url=form.u.trim().startsWith('http')
   ?form.u.trim()
   :'https://'+form.u.trim();

  const ok=await write(
   'submitContribution',
   [form.t.trim(),url,form.c],
   'Submitted on Ganache. Waiting for admin review'
  );

  if(ok){
   setForm({t:'',u:'',c:'Code'});
   setF('all');
   document.getElementById('explore')?.scrollIntoView();
  }
 };

 const minted=items.filter(i=>i.st==='approved');

 const hero=minted[0]||items[0]||{
  id:0,
  title:'Your contribution title',
  cat:'Code',
  tok:0
 };

 return html`<div>
 <nav><div className="wrap">
  <div className="logo">
   <svg width="22" height="22" viewBox="0 0 24 24">
    <defs>
     <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#8f7dff"/>
      <stop offset="1" stopColor="#5ff0c0"/>
     </linearGradient>
    </defs>
    <path d="M12 2l9 5v10l-9 5-9-5V7z" fill="none" stroke="url(#lg)" strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="3" fill="url(#lg)"/>
   </svg>
   ProofBoard
  </div>

  <div className="links">
   <a href="#explore">Explorer</a>
   <a href="#submit">Submit proof</a>
   <a href="#gallery">Gallery</a>
  </div>

  <div className="sp"></div>

  <button
   className=${'sw '+(admin?'on':'')}
   onClick=${()=>{
    if(!isOwner){
     toast('Connect the contract owner wallet to review proofs');
     return;
    }
    setAdmin(!admin);
   }}
   aria-pressed=${admin}
  >
   <i></i>Admin review
  </button>

  <${Wallet} w=${w} setW=${setW} toast=${toast}/>
 </div></nav>

 <div className="wrap">
 <div className="hero">
  <div>
   <h1>Your commits deserve a place on the wall.</h1>
   <p className="lede">
    Submit a pull request or repo as proof, get it reviewed by the maintainers,
    and receive a generative badge minted to your wallet.
    Work that is seen, verified and collectible.
   </p>

   <div className="cta">
    <a href="#submit" style=${{textDecoration:'none'}}>
     <button className="btn pri">Submit a contribution</button>
    </a>
    <a href="#explore" style=${{textDecoration:'none'}}>
     <button className="btn">Browse proofs</button>
    </a>
   </div>

   <div className="ticker">
    <div><b>${items.length}</b><span>proofs submitted</span></div>
    <div><b>${minted.length}</b><span>badges minted</span></div>
    <div><b>Ganache</b><span>local testnet</span></div>
   </div>
  </div>

  <div className="stage">
   <div className="float">
    <${Tilt}>
     <${Badge} cat=${hero.cat} title=${hero.title} tok=${hero.tok} id="hero" size=${300}/>
    </${Tilt}>
   </div>
  </div>
 </div>

 <section id="explore">
  <h2>Contribution explorer</h2>
  <p className="sub">Every submission, from first review to mint. Pick one to see its badge.</p>

  <div className="bar">
   <div className="seg">
    ${['all','pending','approved','rejected'].map(k=>html`
     <button
      key=${k}
      className=${f===k?'on':''}
      onClick=${()=>setF(k)}
     >
      ${k[0].toUpperCase()+k.slice(1)}
      <small>${counts[k]}</small>
     </button>
    `)}
   </div>

   <input
    className="search"
    placeholder="Search title, handle or repo"
    value=${q}
    onInput=${e=>setQ(e.target.value)}
    aria-label="Search contributions"
   />
  </div>

  <div className="ex">
   <div className="list">
    ${shown.length===0&&html`
     <div className="empty">
      No on-chain proofs match. Clear the search or submit your own below.
     </div>
    `}

    ${shown.map(i=>html`
     <div
      key=${i.id}
      className=${'row '+(cur?.id===i.id?'sel':'')}
      onClick=${()=>setSel(i.id)}
      tabIndex="0"
      onKeyDown=${e=>e.key==='Enter'&&setSel(i.id)}
     >
      <div className="av" style=${{background:grad(i.cat)}}>
       ${i.by.slice(0,2)}
      </div>

      <div style=${{minWidth:0}}>
       <h4>${i.title}</h4>
       <p><span className="mono">${i.by}</span> · ${i.url}</p>
      </div>

      <div className="acts">
       ${admin&&isOwner&&i.st==='pending'
        ?html`
         <button className="btn mint mini" disabled=${busy} onClick=${e=>approve(e,i)}>Approve</button>
         <button className="btn ghost mini" disabled=${busy} onClick=${e=>reject(e,i)}>Reject</button>
        `
        :html`
         <span className=${'chip '+i.st}>
          ${i.st[0].toUpperCase()+i.st.slice(1)}
         </span>
        `
       }
      </div>
     </div>
    `)}
   </div>

   ${cur&&html`
    <div className="panel">
     <div className="ghostb" style=${{display:'inline-block'}}>
      <${Tilt}>
       <div>
        <${Badge}
         cat=${cur.cat}
         title=${cur.title}
         tok=${cur.tok}
         id=${'p'+cur.id+cur.st}
         size=${210}
         dim=${cur.st==='pending'||cur.st==='rejected'}
        />
       </div>
      </${Tilt}>

      ${cur.st==='pending'&&html`
       <div className="lbl">Awaiting review</div>
      `}

      ${cur.st==='rejected'&&html`
       <div className="lbl" style=${{color:'var(--rd)'}}>Not minted</div>
      `}
     </div>

     <dl>
      <dt>Contributor</dt><dd>${cur.by}</dd>
      <dt>Wallet</dt><dd>${cur.a}</dd>
      <dt>Proof</dt><dd title=${cur.url}>${cur.url}</dd>
      <dt>Submitted</dt><dd>${cur.d}</dd>
      <dt>Token</dt><dd>${cur.tok?'#'+cur.tok:'Not minted'}</dd>
     </dl>

     ${admin&&isOwner&&cur.st==='pending'&&html`
      <div className="acts" style=${{marginTop:14}}>
       <button className="btn mint" disabled=${busy} style=${{flex:1}} onClick=${e=>approve(e,cur)}>
        Approve and mint
       </button>
       <button className="btn ghost" disabled=${busy} onClick=${e=>reject(e,cur)}>
        Reject
       </button>
      </div>
     `}
    </div>
   `}
  </div>
 </section>

 <section id="submit">
  <h2>Submit proof of contribution</h2>
  <p className="sub">
   Link the pull request, issue, doc or repo that shows your work.
   Reviewers usually respond within two days.
  </p>

  <div className="sub-grid">
   <form onSubmit=${submit} noValidate>
    <label>
     Contribution title
     <input
      className="f"
      placeholder="e.g. Added retry logic to the RPC client"
      value=${form.t}
      onInput=${e=>setForm({...form,t:e.target.value})}
     />
    </label>

    <label>
     Proof URL
     <input
      className="f mono"
      placeholder="github.com/owner/repo/pull/123"
      value=${form.u}
      onInput=${e=>setForm({...form,u:e.target.value})}
     />
    </label>

    <label>
     Type of work
     <div className="cats">
      ${Object.keys(CAT).map(k=>html`
       <button
        type="button"
        key=${k}
        className=${form.c===k?'on':''}
        onClick=${()=>setForm({...form,c:k})}
       >
        ${k}
       </button>
      `)}
     </div>
    </label>

    <div className="err" role="alert">${err}</div>

    <button
     className="btn pri"
     type="submit"
     disabled=${busy}
     style=${{padding:'11px'}}
    >
     ${busy?'Waiting for transaction...':'Submit for review'}
    </button>
   </form>

   <div className="pv">
    <${Badge}
     cat=${form.c}
     title=${form.t||'Your contribution title'}
     tok=${0}
     id="form"
     size=${180}
     dim=${true}
    />
    <div>
     Live preview. The badge takes its colors from the type of work
     and its glyph from the category. It mints once an admin approves.
    </div>
   </div>
  </div>
 </section>

 <section id="gallery">
  <h2>Minted gallery</h2>
  <p className="sub">
   ${minted.length} badges minted on Ganache. Hover to tilt, click to inspect.
  </p>

  <div className="gal">
   ${minted.map(i=>html`
    <div
     key=${i.id}
     onClick=${()=>{
      setSel(i.id);
      setF('all');
      document.getElementById('explore').scrollIntoView();
     }}
    >
     <${Tilt}>
      <${Badge}
       cat=${i.cat}
       title=${i.title}
       tok=${i.tok}
       id=${'g'+i.id}
       size=${190}
      />
     </${Tilt}>
    </div>
   `)}
  </div>
 </section>
 </div>

 <footer>
  <div className="wrap" style=${{
   display:'flex',
   justifyContent:'space-between',
   gap:12,
   flexWrap:'wrap'
  }}>
   <span>ProofBoard on Ganache Local. Transactions require MetaMask.</span>
   <span className="mono">contract ${shorten(CONTRACT_ADDRESS)} · Ganache</span>
  </div>
 </footer>

 ${tm&&html`<div className="toast" role="status">${tm}</div>`}
 </div>`;
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));