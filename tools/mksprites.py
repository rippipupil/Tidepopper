import sys, os
OUT = sys.argv[1]
PAL = {'K':'#0f1823','W':'#f3f7fa','P':'#dde7ef','S':'#a3b8ca','N':'#22344a','g':'#7f93a5',
       'A':'#b4d4ea','C':'#8fb8d6','B':'#5f8fb3','D':'#3f6a8c',
       'G':'#d9c08a','Y':'#fff3d1','o':'#a88f5e','R':'#d4907f','r':'#a8695a',
       'u':'#b08a68','w':'#8a6a4f','v':'#6b503b','M':'#8cc5b0','m':'#5f9884',
       'F':'#9aa3c4','h':'#c3c9de','f':'#6f789c','Z':('#050a12','0.45')}
def blank(w=24,h=24): return [['.']*w for _ in range(h)]
def rect(g,x,y,w,h,c):
    for j in range(y,y+h):
        for i in range(x,x+w):
            if 0<=j<len(g) and 0<=i<len(g[0]): g[j][i]=c
def box(g,x,y,w,h,fill,hl=None,sh=None):
    rect(g,x,y,w,h,'K'); rect(g,x+1,y+1,w-2,h-2,fill)
    if hl: rect(g,x+1,y+1,w-2,1,hl); rect(g,x+1,y+1,1,h-2,hl)
    if sh: rect(g,x+1,y+h-2,w-2,1,sh); rect(g,x+w-2,y+1,1,h-2,sh)
def roof(g,cl,cr,top,bottom,lc,rc,hl=None):
    for r in range(top,bottom+1):
        l=cl-(r-top); rr=cr+(r-top)
        for i in range(l,rr+1):
            g[r][i] = 'K' if i in (l,rr) or r==top else (lc if i<=(cl+cr)//2 else rc)
        if hl and r>top and l+1<(cl+cr)//2: g[r][l+1]=hl
SP = {}
# Ayuntamiento
g=blank(); rect(g,11,0,1,5,'K'); rect(g,12,0,3,2,'R'); rect(g,12,1,3,1,'r')
roof(g,11,12,4,10,'C','B','A'); rect(g,3,11,18,1,'K'); rect(g,4,11,16,1,'D')
box(g,5,12,14,10,'P','W','S'); box(g,10,16,4,6,'w','u','v'); rect(g,12,18,1,1,'G')
box(g,6,13,4,4,'A','A','C'); box(g,14,13,4,4,'A','A','C'); rect(g,11,7,2,2,'G'); rect(g,11,7,1,1,'Y')
rect(g,6,22,14,1,'Z'); rect(g,19,13,1,9,'Z'); SP['ayuntamiento']=g
# Torre (defensa)
g=blank(); rect(g,11,0,2,1,'K'); rect(g,10,1,4,1,'K'); rect(g,11,1,1,1,'A'); rect(g,12,1,1,1,'C')
rect(g,9,2,6,1,'K'); rect(g,10,2,2,1,'A'); rect(g,12,2,2,1,'B'); rect(g,10,3,4,1,'K'); rect(g,11,3,1,1,'C'); rect(g,12,3,1,1,'B'); rect(g,11,4,2,1,'K')
box(g,6,5,12,4,'P','W','S'); rect(g,6,4,2,1,'K'); rect(g,16,4,2,1,'K')
box(g,8,9,8,13,'S','P','g'); rect(g,9,12,6,1,'g'); rect(g,9,15,6,1,'g'); rect(g,9,18,6,1,'g')
rect(g,11,13,2,4,'K'); rect(g,9,22,8,1,'Z'); rect(g,16,10,1,12,'Z'); rect(g,18,6,1,3,'Z'); SP['torre']=g
# Mina de monedas
g=blank(); box(g,3,6,18,3,'v','u',None); box(g,5,9,14,13,'w','u','v'); box(g,8,12,8,10,'N',None,None)
rect(g,9,13,6,1,'K'); box(g,4,17,6,5,'G','Y','o'); box(g,14,18,6,4,'G','Y','o'); rect(g,6,16,2,1,'K'); rect(g,6,16,2,1,'G')
rect(g,5,22,16,1,'Z'); rect(g,21,7,1,15,'Z'); SP['mina']=g
# Almacén (cofre)
g=blank(); box(g,4,7,16,6,'B','C','D'); box(g,4,12,16,10,'w','u','v'); rect(g,8,7,1,15,'K'); rect(g,15,7,1,15,'K')
box(g,10,11,4,5,'G','Y','o'); rect(g,11,13,2,1,'K'); rect(g,6,6,3,1,'G'); rect(g,12,5,3,2,'G'); rect(g,12,5,1,1,'Y')
rect(g,5,22,16,1,'Z'); rect(g,20,8,1,14,'Z'); SP['almacen']=g
# Cabaña del constructor
g=blank(); roof(g,11,12,8,13,'R','r'); rect(g,5,14,14,1,'K'); box(g,7,15,10,7,'P','W','S'); box(g,10,17,4,5,'w','u','v')
rect(g,16,5,1,4,'v'); rect(g,15,4,3,2,'S'); rect(g,15,4,3,1,'P')
rect(g,8,22,10,1,'Z'); rect(g,17,15,1,7,'Z'); SP['cabana']=g
# Muro
g=blank(24,14); box(g,1,3,11,9,'S','P','g'); box(g,12,3,11,9,'S','P','g'); rect(g,2,7,9,1,'g'); rect(g,13,7,9,1,'g')
rect(g,6,4,1,3,'g'); rect(g,17,8,1,3,'g'); rect(g,2,12,22,1,'Z'); SP['muro']=g
def grid(rows): return [list(r) for r in rows]
SP['niebla']=grid(["................",".....KKKKKK.....","....KhhhhhhK....","...KhFFFFFFFK...","..KhFFFFFFFFFK..","..KFFRRFFRRFFK..","..KFFRRFFRRFFK..","..KFFFFFFFFFFK..","..KFFFKKKKFFFK..","..KFFFFFFFFFFK..","..KffffffffffK..","..KfKffKKffKfK..","..KK.KK..KK.KK..","................","................","................"])
SP['moneda']=grid(["............","....KKKK....","..KKGYYGKK..",".KGYYYGGGGK.",".KGYGGGGoGK.","KGYGGKKGGoGK","KGYGGKKGGoGK","KGGGGGGGGoGK",".KGGGGGGooK.",".KGoooooooK.","..KKooooKK..","....KKKK...."])
SP['cristal']=grid(["............","....KKKK....","...KAAACK...","..KAAACCBK..",".KAAACCCBBK.",".KKKKKKKKKK.","..KACCCBBK..","...KCCBBK...","....KCBK....",".....KK.....","............","............"])
SP['xp']=grid([".....KK.....","....KGGK....","....KYGK....","KKKKKYGKKKKK","KGYYYYGGGGGK",".KGYYGGGGoK.","..KGGGGGoK..","..KGGKKGoK..",".KGGK..KGoK.",".KKK....KKK.","............","............"])
SP['aldea-nav']=grid(["............",".A.A....A.A.",".AAA....AAA.",".AAA.AA.AAA.",".AAAAAAAAAA.",".AAAAAAAAAA.",".AAAADDAAAA.",".AAAA..AAAA.",".AAAA..AAAA.",".DDDD..DDDD.","............","............"])
for name, g in SP.items():
    h=len(g); w=len(g[0]); out=[]
    for y,row in enumerate(g):
        if len(row)!=w: print('WIDTH',name,y)
        x=0
        while x<w:
            c=row[x]
            if c=='.': x+=1; continue
            x2=x
            while x2<w and row[x2]==c: x2+=1
            col=PAL[c]
            out.append(f'<rect x="{x}" y="{y}" width="{x2-x}" height="1" fill="{col[0]}" fill-opacity="{col[1]}"/>' if isinstance(col,tuple) else f'<rect x="{x}" y="{y}" width="{x2-x}" height="1" fill="{col}"/>')
            x=x2
    open(os.path.join(OUT,f's-{name}.svg'),'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w*10}" height="{h*10}" viewBox="0 0 {w} {h}" shape-rendering="crispEdges">'+''.join(out)+'</svg>\n')
print('ok',len(SP))
