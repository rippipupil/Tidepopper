"""Motor isométrico de vóxeles -> sprites pixel art PNG (luz arriba, cara izq. media, der. oscura)."""
import sys, os, json, hashlib
from PIL import Image
OUT = sys.argv[1]
OUTLINE = (15, 24, 35, 255)
# Máscara de un cubo 8x8: T arriba, L cara izquierda, R cara derecha
CUBE = ["..TTTT..","TTTTTTTT","LLTTTTRR","LLLLRRRR","LLLLRRRR","LLLLRRRR","LLLLRRRR","..LLRR.."]
def hx(c): c=c.lstrip('#'); return tuple(int(c[i:i+2],16) for i in (0,2,4))
def shade(rgb, f): return tuple(max(0,min(255,int(v*f))) for v in rgb)
def jitter(rgb, key, amt):
    if not amt: return rgb
    h = int(hashlib.md5(str(key).encode()).hexdigest()[:4],16)/65535.0
    return shade(rgb, 1 + (h-0.5)*amt)
class Model:
    def __init__(s): s.v = {}
    def box(s,x,y,z,dx,dy,dz,c,j=0.0):
        for a in range(x,x+dx):
            for b in range(y,y+dy):
                for k in range(z,z+dz): s.v[(a,b,k)] = (c,j)
        return s
    def put(s,x,y,z,c,j=0.0): s.v[(x,y,z)] = (c,j); return s
    def rm(s,x,y,z): s.v.pop((x,y,z),None); return s
def render(m, outline=True):
    items = sorted(m.v.items(), key=lambda kv:(kv[0][0]+kv[0][1]+kv[0][2], kv[0][2]))
    px = {}
    for (x,y,z),(c,j) in items:
        base = jitter(hx(c),(x,y,z),j)
        cols = {'T':shade(base,1.12),'L':base,'R':shade(base,0.74)}
        sx=(x-y)*4; sy=(x+y)*2-z*4
        for r,row in enumerate(CUBE):
            for q,ch in enumerate(row):
                if ch!='.': px[(sx-4+q, sy-4+r)] = cols[ch]
    if outline:
        add = {}
        for (a,b) in list(px):
            for da,db in ((1,0),(-1,0),(0,1),(0,-1)):
                p=(a+da,b+db)
                if p not in px: add[p]=OUTLINE[:3]
        px.update(add)
    xs=[p[0] for p in px]; ys=[p[1] for p in px]
    x0,y0=min(xs),min(ys); w=max(xs)-x0+1; h=max(ys)-y0+1
    img=Image.new('RGBA',(w,h),(0,0,0,0))
    for (a,b),c in px.items(): img.putpixel((a-x0,b-y0),c+(255,))
    return img, -x0, -y0   # (ox, oy): dónde cae el punto del mundo (0,0,0)
ST, STD = '#a9b8c6', '#7f93a5'; WD, WDD = '#9a7656', '#6f5440'; WH = '#e3eaf0'
RF, RFD, RFL = '#6f9cc2', '#527fa6', '#8fb8d6'; GO, GOL = '#d9c08a', '#f2e2b4'; MT, MTD = '#6a7888', '#3a4654'
GL = '#a9d2ee'; CO, COD = '#d4907f', '#a8695a'
M = {}
# Ayuntamiento 4x4
m=Model(); m.box(0,0,0,12,12,1,STD,0.08).box(1,1,1,10,10,1,ST,0.08).box(2,2,2,8,8,5,WH,0.03)
for (a,b) in ((1,1),(9,1),(1,9),(9,9)): m.box(a,b,2,2,2,7,ST,0.08).box(a,b,9,2,2,1,RFD).put(a,b,10,RF)
for k in (3,4,5):
    for t in (3,6): m.put(9,t,k,GL).put(t,9,k,GL)
for k in (2,3,4): m.put(9,5,k,WDD).put(9,4,k,WDD).put(5,9,k,WDD).put(4,9,k,WDD)
m.put(9,4,5,GO).put(9,5,5,GO).put(4,9,5,GO).put(5,9,5,GO)
m.box(2,2,7,8,8,1,RFD).box(3,3,8,6,6,1,RF).box(4,4,9,4,4,1,RF).box(5,5,10,2,2,1,RFL).put(5,5,11,GO).put(6,6,11,GO).put(5,6,11,GOL).put(6,5,11,GOL)
m.box(5,5,12,1,1,3,MT).put(6,5,14,CO).put(7,5,14,CO).put(6,5,13,COD).put(7,5,13,CO)
M['ayuntamiento']=(m,4)
# Cañón 2x2
m=Model(); m.box(0,0,0,6,6,1,STD,0.08).box(1,1,1,4,4,1,ST,0.08).box(2,2,2,2,2,1,WDD)
m.box(1,2,3,5,2,1,MT).put(5,2,3,MTD).put(5,3,3,MTD).box(1,2,4,2,2,1,MT).put(0,2,3,MT).put(0,3,3,MT)
M['canon']=(m,2)
# Ballesta 2x2
m=Model(); m.box(0,0,0,6,6,1,STD,0.08).box(1,1,1,4,4,1,ST,0.08).box(2,2,2,2,2,2,WD)
m.box(1,2,4,4,2,1,WD).box(4,0,4,1,6,1,WDD).put(4,0,5,GO).put(4,5,5,GO).box(2,2,5,4,1,1,MTD).put(5,2,5,MT)
M['ballesta']=(m,2)
# Catapulta 2x2
m=Model(); m.box(0,0,0,6,6,1,STD,0.08).box(1,1,1,4,1,1,WD).box(1,4,1,4,1,1,WD).box(2,1,2,1,1,2,WD).box(2,4,2,1,1,2,WD).box(2,1,4,1,4,1,WDD)
for (a,k) in ((4,2),(3,3),(2,4),(1,5)): m.put(a,2,k,WD).put(a,3,k,WD)
m.box(0,2,6,2,2,1,'#8a96a3').put(0,2,7,'#9aa6b3')
M['catapulta']=(m,2)
# Torre de arqueras 2x2
m=Model()
for (a,b) in ((1,1),(4,1),(1,4),(4,4)): m.box(a,b,0,1,1,6,WD)
m.box(2,1,3,2,1,1,WDD).box(1,2,3,1,2,1,WDD).box(0,0,6,6,6,1,WDD)
for a in range(6):
    for b in range(6):
        if a in (0,5) or b in (0,5): m.put(a,b,7,WD)
m.box(2,2,7,1,1,2,CO).put(2,2,9,'#e6c9a8')
for (a,b) in ((0,0),(5,0),(0,5),(5,5)): m.put(a,b,8,WD)
m.box(0,0,9,6,6,1,RFD).box(1,1,10,4,4,1,RF).box(2,2,11,2,2,1,RFL)
M['arqueras']=(m,2)
# Muro 1x1
m=Model(); m.box(0,0,0,3,3,3,ST,0.1); M['muro']=(m,1)
# Mina 2x2
m=Model(); m.box(0,0,0,6,6,1,STD,0.08)
for (a,b) in ((1,1),(4,1),(1,4),(4,4)): m.box(a,b,1,1,1,3,WD)
m.box(1,1,4,4,4,1,WDD).box(2,2,1,2,2,1,GO).put(2,2,2,GOL).put(3,3,2,GO).box(4,2,1,1,2,1,GO)
M['mina']=(m,2)
# Almacén 2x2
m=Model(); m.box(1,1,0,4,4,3,WD,0.06).box(2,1,0,1,4,3,MTD).box(1,1,3,4,4,1,RF).put(4,3,2,GO).put(2,2,4,GO).put(3,3,4,GOL)
M['almacen']=(m,2)
# Cabaña del constructor 2x2
m=Model(); m.box(1,1,0,4,4,3,WH,0.03).box(1,1,3,4,4,1,COD).box(2,2,4,2,2,1,CO).put(4,2,0,WDD).put(4,2,1,WDD).put(2,1,5,ST)
M['cabana']=(m,2)
# Cuartel 3x3
m=Model(); m.box(0,0,0,9,9,1,STD,0.08).box(1,1,1,7,7,3,ST,0.08).box(1,1,4,7,7,1,COD).box(2,2,5,5,5,1,'#c07a6a').box(3,3,6,3,3,1,CO)
m.put(7,4,1,WDD).put(7,4,2,WDD).put(4,7,1,WDD).put(4,7,2,WDD).put(4,4,7,MT).put(4,4,8,MT).put(4,5,8,GO).put(4,6,8,GO)
M['cuartel']=(m,3)
# Laboratorio 2x2
m=Model(); m.box(0,0,0,6,6,1,STD,0.08).box(1,1,1,4,4,2,WH,0.03).box(1,1,3,4,4,1,GL).box(2,2,4,2,2,1,'#c6e2f2').put(4,2,1,WDD).put(4,2,2,WDD).put(1,4,4,'#8cc5b0').put(1,4,5,'#8cc5b0')
M['laboratorio']=(m,2)
# Torre mágica 2x2
m=Model(); m.box(0,0,0,6,6,1,STD,0.08).box(1,1,1,4,4,6,'#8a9bb0',0.06)
for k in (2,4): m.put(4,2,k,GL).put(2,4,k,GL)
m.box(0,0,7,6,6,1,RFD).box(1,1,8,4,4,1,RF).box(2,2,9,2,2,2,'#a9d2ee').put(2,2,11,'#e6f3fb').put(3,3,11,'#c6e2f2').put(2,3,12,'#e6f3fb')
M['torre_magica']=(m,2)
# Decoraciones nuevas
m=Model(); m.box(1,1,0,1,1,4,MTD).put(1,1,4,'#f2e2b4').put(1,1,5,MT); M['farol']=(m,1)
m=Model(); m.box(0,0,0,1,1,6,MT).box(1,0,4,2,1,2,CO).put(1,0,5,COD).put(0,0,6,GO); M['bandera']=(m,1)
m=Model(); m.box(1,1,0,4,4,2,ST,0.08).box(2,2,2,2,2,3,'#c9d3dc').box(2,2,5,2,2,1,'#dfe6ec').put(3,2,3,GO).put(3,3,3,GO); M['estatua']=(m,2)
m=Model(); m.box(0,0,0,6,6,1,ST,0.08)
for a in range(6):
    for b in range(6):
        if a in (0,5) or b in (0,5): m.put(a,b,1,ST)
m.box(1,1,1,4,4,1,'#5f8fb3').box(2,2,1,2,2,3,ST).box(2,2,4,2,2,1,'#8fb8d6').put(2,2,5,'#c6e2f2'); M['fuente']=(m,2)
m=Model(); m.put(0,0,0,'#5f8a6f').put(0,0,1,CO).put(2,1,0,'#5f8a6f').put(2,1,1,GO).put(1,2,0,'#5f8a6f').put(1,2,1,'#c3c9de').put(2,2,0,'#5f8a6f').put(2,2,1,CO); M['flores']=(m,1)
# Decoración
m=Model(); m.box(1,1,0,1,1,2,WDD).box(0,0,2,3,3,2,'#4f7a62',0.12).put(1,1,4,'#5f8f72'); M['arbol']=(m,1)
m=Model(); m.box(0,0,0,3,2,1,'#8a96a3',0.1).put(1,1,1,'#9aa6b3').put(2,0,1,'#8a96a3'); M['roca']=(m,1)
# Tropas
m=Model(); m.put(0,0,0,'#5f8fb3').put(0,0,1,'#5f8fb3').put(0,0,2,'#e6c9a8').put(0,0,3,MT); M['soldado']=(m,0)
m=Model(); m.put(0,0,0,CO).put(0,0,1,CO).put(0,0,2,'#e6c9a8').put(0,0,3,COD); M['arquera']=(m,0)
# Suelo 16x16 casillas (isla)
N=16; m=Model()
for a in range(N*3):
    for b in range(N*3):
        ti, tj = a//3, b//3
        m.put(a,b,0, '#62907a' if (ti+tj)%2==0 else '#5a876f', 0.05)
        if a==N*3-1 or b==N*3-1:
            m.put(a,b,-1,'#7a6a55',0.08); m.put(a,b,-2,'#6a5a48',0.08)
M['suelo']=(m,N)

# Variantes por nivel: nivel 3-4 (base dorada, tejado más vivo) y nivel 5 (además, un cristal arriba)
GOLD_BASE = '#c9b27a'
def tiered(model, tier):
    t = Model()
    for (x,y,z),(c,j) in model.v.items():
        if tier >= 2 and z <= 0 and c in (ST, STD): c = GOLD_BASE
        if tier >= 2 and c in (RF, RFD): c = '#4f86b8' if c == RF else '#3e6f9c'
        if tier >= 2 and c == WD: c = '#a8805c'
        t.v[(x,y,z)] = (c,j)
    if tier >= 3:
        top = max(z for (_,_,z) in model.v)
        xs = sorted(x for (x,_,_) in model.v); ys = sorted(y for (_,y,_) in model.v)
        cx, cy = (xs[0]+xs[-1])//2, (ys[0]+ys[-1])//2
        t.put(cx,cy,top+1,'#a9d2ee').put(cx,cy,top+2,'#e6f3fb')
    return t
TIERABLE = ['ayuntamiento','canon','arqueras','catapulta','ballesta','torre_magica','mina','almacen','cuartel','laboratorio','cabana']
for name in TIERABLE:
    base, n = M[name]
    M[f'{name}@2'] = (tiered(base,2), n)
    M[f'{name}@3'] = (tiered(base,3), n)
mw, n = M['muro']
w2 = Model(); w2.v = dict(mw.v)
for (x,y,z),(c,j) in list(w2.v.items()):
    if z == 2: w2.v[(x,y,z)] = (GOLD_BASE, j)
w3 = Model(); w3.v = dict(w2.v)
for (x,y,z),(c,j) in list(w3.v.items()):
    if z == 2: w3.v[(x,y,z)] = ('#8fb8d6', j)
M['muro@2'] = (w2, n); M['muro@3'] = (w3, n)
meta={}
for name,(mdl,n) in M.items():
    img,ox,oy = render(mdl)
    img.save(os.path.join(OUT,f"v-{name.replace('@','-t')}.png"))
    meta[name]={'w':img.width,'h':img.height,'ox':ox,'oy':oy,'n':n}
json.dump(meta,open(os.path.join(OUT,'meta.json'),'w'),indent=0)
print(json.dumps(meta))
