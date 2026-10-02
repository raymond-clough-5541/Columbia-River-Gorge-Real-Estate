#!/usr/bin/env python3
"""R221 second-eraser prep — the straggler sweep (the R220 unknown-unknowns pass, re-run).

Finds owner-typo stragglers the R220 census missed (e.g. 'dirrect' — not in the
STRONG token list, so the first eraser's census never flagged it). Method:
  1. Extract every quoted span + APPROVALS col-2 cell from the CARRIERS
     (where owner chat text lives — same carrier set as R220, incl. the 5
     quote-carrying code files).
  2. For every word in those spans: if it appears EXACTLY ONCE in the whole
     repo's text corpus AND is not a known map key/value AND is not in the
     allowlist (URLs, code tokens, product proper nouns, mock data), it is a
     candidate. Typos are one-offs; real words recur.
  3. Plus a classic-misspelling net (recieve/seperate/occured/... ) over the
     carriers.
Output: /tmp/eraser-r221/sweep-candidates.txt — for the eyeball decode pass
(every surviving candidate is either decoded+added to the map or ruled
legitimate, per the R220 evidence-only discipline).
"""
import subprocess, re, json, collections, os, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "r220"))
from _map_data import WORD_MAP, PHRASE_MAP

MAP_KEYS = set(k.lower() for k in WORD_MAP)
MAP_VALS = set(v.lower() for v in WORD_MAP.values())

CODE_CARRIERS = [
    "mini-services/review-gallery/report.ts",
    "mini-services/review-gallery/index.ts",
    "portable-workflows/review-gallery/report.ts",
    "portable-workflows/review-gallery/index.ts",
    "scripts/enforce-methodology.sh",
]

TEXT_EXT = {".md",".ts",".tsx",".js",".jsx",".mjs",".cjs",".py",".sh",".json",".txt",".yml",".yaml",".html",".css",".sql",".env",".prisma",".mts"}

ALLOW = set("""supabase nhost firebase appwrite pocketbase mongodb postgres mysql sqlite prisma
nextjs next.js react vue angular svelte tailwind shadcn zustand tanstack vitest jest playwright
codeberg github gitlab docker kubernetes nginx caddy vite webpack esbuild eslint prettier
socketio socket.io jwt oauth webauthn totp csv json xml yaml html css sql api sdk ide cli ci cd
ui ux a11y ar vr ltv cac ctr seo cta kpi okr sla soc gdpr ccpa hipaa
ngrok cloudflare vercel netlify aiven upstash neon riverbase barman minio cnpg cloudnativepg
zai glm anthropic openai gemma llama mistral cpu gpu ram ssd
localhost http https url uri uuid guid id ip dns tcp udp cors csrf xss jwt rgb hsl oklch
boolean string number integer float varchar text blob timestamp jsonb
admin moderator staff buyer seller listing marketplace storefront wishlist pinned blocked
unread reactions escalation campaign admod campaigner verifiable
""".split())

CLASSIC_MISSPELLINGS = """recieve seperate occured untill definately adress beleive calender
collegue comming concious embarass enviroment existance familar finaly foriegn gaurd grammer
happend harrass immediatly independant intrest knowlege liason libary maintanance neccessary
noticable occassion occurence paralell perseverence personel posession prefered refered relevent
religous remeber restaraunt rythm succesful supress suprise tatoo tendancy therefor
threshhold tounge truely unfortunatly unusualy whereever becuase becasue beacuse
wierd freind teh adn nad hte waht wahtever wich definatly arguement alot
begining beleived calender cantonese chnage chnages compatability concensus
copywrite dont everythign expierence fatser garentee guidence heigth improvment
inlcude insted intial langauge lenght liek lisence maintainance mangage mispell
neccessairy oportunity otheres overide paramater paramter
particulary perfomance prefrence probaly proccess procces progams
recomended regarless remaning reqest responce retrive sacrafice seach
similiar soem specifi specifc stategy sucess suport suposed sureley
sytem sysem tehre thna toghether tolrence transistion trys typcialy
usefull vaild verison verions wether whats wheather whith whithin wnant wont
wouldnt writen yoru youself actualy anually aswell asistant attemps
attemt availabe availble bellow betwen byassed
catagory chanel charactor cheack choosen colour combintion
comit conected convinient curerntly decieve decison
deletted depened detial diplay disapointed discribe dosnt dont downlaod
eigth elimate enfoce enterance equiptment exagerate excercise
expidite explination facilites feild forhead formalize froms
futher garantee generallly givin globaly goverment
gratful halp heirarchy helpfull hoilday hows
identifty immediatly implment improce incase inculde indecate infact
influencial inherant initialy inquires instal instence intergrate interupt
intrduce invaild inevatible jist knowldge lastest
lauch layed leanring leasure liekly lisence
maintenence managment mantain marraige meassage meausre
mispell mispelled misundertood neseccary necassary
obligatery ocurr ocurred offical onyl openning oppurtunity orginal
otherwize overal owuld paiment partcular payed peice peices perfom
permision permisson persue phoneticaly poeple posibilty posible postion
preceed preffer prefered priveleges probelm proccessings proffesional
promblem promiss pronouce proove propoganda pyschological
quarrantine reaccurring reccomendations recomend recconect reemember
referrence reffer reguarding relient remmber repitition replacment
reponce reproducable requst resouce resourse responisible reult reivews
rewiev saftey scedule secratary secratery selecton sentance seperate
serach sercure serivce severall shoud shuold signifigant similair
sincerly softwares someting somthing sponsered statment stategy strenght
stong sucessful sujest sumary supress suprise suprised sytle sytem
tehcnical temperture tha thankyou thier
thru timimg tommorow toook tranfer transparet tregger troulbe
trun twp udate undear underatand unfortunatly unneccessary unsuccessfull
upadte upgarde useage usualy vaildate variey variuos verfiy
verion vew vieww voluntarilly waitt wantd wat weither whcih wheather
whent wheter whith whn wih wierd wishful withinn wonted wordks
workd workign workin writting yeild yesturday youself
""".split()

def quoted_spans(text):
    out = []
    for m in re.finditer(r'"([^"]{8,3000})"|‘([^‘]{8,3000})’|“([^”]{8,3000})”|\'([^\']{8,3000})\'', text):
        s = next(g for g in m.groups() if g is not None)
        out.append(s)
    return out

def main():
    tracked = subprocess.run(["git","ls-files"], capture_output=True, text=True).stdout.splitlines()

    # carrier set
    carriers = []
    for f in tracked:
        ext = "." + f.rsplit(".",1)[-1].lower() if "." in f else ""
        if ext not in TEXT_EXT: continue
        if f in ("data/disposable-domains.txt",): continue
        if f.startswith("docs/research/"): continue     # R219 corpus: evidence, already cleaned
        if f.startswith(("skills/","portable-skills/","node_modules/","portable-workflows/human-e2e/")): continue
        if (f.startswith("docs/") or f in ("worklog.md",) or f.startswith(("audits/","agent-ctx/"))
                or f in CODE_CARRIERS):
            carriers.append(f)

    # global word frequency across ALL tracked text files (the recurrence signal)
    freq = collections.Counter()
    word_re = re.compile(r"[A-Za-z][A-Za-z'-]{1,}")
    for f in tracked:
        ext = "." + f.rsplit(".",1)[-1].lower() if "." in f else ""
        if ext not in TEXT_EXT: continue
        try: txt = open(f, encoding="utf-8", errors="replace").read()
        except Exception: continue
        freq.update(w.lower() for w in word_re.findall(txt))

    # candidate collector
    candidates = collections.defaultdict(set)  # word -> set of (file, span-head)
    classic_hits = collections.defaultdict(set)
    for f in carriers:
        try: text = open(f, encoding="utf-8", errors="replace").read()
        except Exception: continue
        spans = quoted_spans(text)
        if f == "docs/APPROVALS.md":
            for ln in text.split("\n"):
                m = re.match(r"^\|\s*(R\d+[a-z-]*|G2-\d+|AR-\d+|MD-\d+)\s*\|(.+?)\|", ln)
                if m: spans.append(m.group(2))
        for sp in spans:
            for w in word_re.findall(sp):
                lw = w.lower()
                if len(lw) < 3: continue
                if lw in MAP_KEYS or lw in MAP_VALS or lw in ALLOW: continue
                if freq[lw] == 1:  # appears exactly once repo-wide -> anomaly
                    candidates[lw].add((f, sp[:90]))
                if lw in CLASSIC_MISSPELLINGS:
                    classic_hits[lw].add((f, sp[:90]))

    os.makedirs("/tmp/eraser-r221", exist_ok=True)
    out = open("/tmp/eraser-r221/sweep-candidates.txt","w")
    out.write(f"# R221 straggler sweep — {len(candidates)} once-only vocabulary candidates, {len(classic_hits)} classic-misspelling hits\n\n")
    out.write("## Classic-misspelling net (highest priority)\n")
    for w in sorted(classic_hits):
        out.write(f"\n### {w}\n")
        for f, head in sorted(classic_hits[w])[:4]:
            out.write(f"  - {f}: {head!r}\n")
    out.write("\n## Once-only vocabulary candidates (eyeball: decode or rule legitimate)\n")
    for w in sorted(candidates):
        if w in classic_hits: continue
        out.write(f"- {w}   [{'; '.join(sorted(f for f,_ in candidates[w]))[:110]}]\n")
    out.close()
    print(f"candidates: {len(candidates)}  classic hits: {len(classic_hits)}")
    print("written /tmp/eraser-r221/sweep-candidates.txt")
    for w in sorted(classic_hits):
        print(f"  CLASSIC: {w}  <- {sorted(classic_hits[w])[:2]}")

if __name__ == "__main__":
    main()
