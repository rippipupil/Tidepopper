import sys, os
OUT = sys.argv[1]
PAL = {'K':'#0f1823','W':'#f3f7fa','P':'#dde7ef','S':'#a3b8ca','B':'#5f8fb3','C':'#8fb8d6','D':'#3f6a8c',
       'G':'#d9c08a','Y':'#fff3d1','R':'#d4907f','r':'#a8695a','A':'#a9d2ee','N':'#22344a','Z':('#050a12','0.5')}
ICONS = {
'app': ["....................","....KKKKKKKKK.......","...KWWWWWWWWWK......","...KWPPPPPPPPKCK....","...KWPPPPPPPPKCCK...","...KWPPPPPPPPKKKKZ..","...KWPPPPPPPPPPSKZ..","...KWPBBBBBBBPPSKZ..","...KWPPPPPPPPPPSKZ..","...KWPBBBBBBBBPSKZ..","...KWPPPPPPPPPPSKZ..","...KWPBBBBBPPPPSKZ..","...KWPPPPPPPPPPKKZ..","...KWPCCCCPPPPKGKZ..","...KWPPPPPPPPKKGKK..","...KWPPPPPPPKGGYGGK.","...KWPPPPPPPPKKGKK..","...KSSSSSSSSSSKGKZ..","....KKKKKKKKKKKKZ...",".....ZZZZZZZZZZZ...."],
'doc': ["................","...KKKKKKK......","...KWWWWWWKK....","...KWPPPPPKCK...","...KWPPPPPKKKK..","...KWPBBBBPPSKZ.","...KWPPPPPPPSKZ.","...KWPBBBBBBSKZ.","...KWPPPPPPPSKZ.","...KWPBBBBBPSKZ.","...KWPPPPPPPSKZ.","...KWPCCCPPPSKZ.","...KWPPPPPPPSKZ.","...KSSSSSSSSSKZ.","....KKKKKKKKKZ..",".....ZZZZZZZZZ.."],
'ai': ["................",".............G..","............GYG.","..KKKKKKKKKK.G..",".KAAAAAAAAAAK...",".KACCCCCCCCDKZ..",".KACKKCCKKCDKZ..",".KACKKCCKKCDKZ..",".KACKCCCCKCDKZ..",".KACCKKKKCCDKZ..",".KADDDDDDDDDKZ..","..KKKKKKKKKKZ...","...KCKZZZZZZ....","...KK...........","................","................"],
'pdf': ["................","...KKKKKKK......","...KWWWWWWKK....","...KWPPPPPKCK...","...KWPPPPPKKKK..","...KWPBBBBPPSKZ.","...KWPPPPPPPSKZ.",".KKKKKKKKKKKKKZ.",".KRWWRWWRRWWRKZ.",".KRWRRWRWRWRRKZ.",".KrrrrrrrrrrrKZ.",".KKKKKKKKKKKKKZ.","...KWPPPPPPPSKZ.","...KSSSSSSSSSKZ.","...KKKKKKKKKKKZ.","....ZZZZZZZZZZZ."],
'photo': ["................","................",".....KKKKK......","....KCCCCCK.....",".KKKKKKKKKKKKKK.",".KWWWWWWWWWWWSKZ",".KWPPPKKKKPPGSKZ",".KWPPKAACCKPPSKZ",".KWPPKACCDKPPSKZ",".KWPPKCCDDKPPSKZ",".KWPPPKKKKPPPSKZ",".KSSSSSSSSSSSSKZ",".KKKKKKKKKKKKKKZ","..ZZZZZZZZZZZZZZ","................","................"],
'text': ["................","................",".KKKKKKKKKKKKK..",".KWWWWWWWWWWWK..",".KWCCCCCCCCCDKZ.",".KDDDDWCDDDDDKZ.",".KKKKKWCDKKKKKZ.",".....KWCDKZZZZZ.",".....KWCDKZ.....",".....KWCDKZ.....",".....KWCDKZ.....",".....KWCDKZ.....",".....KWCDKZ.....",".....KDDDKZ.....",".....KKKKKZ.....","......ZZZZZ....."],
'link': ["................","................","................","................","................","..KKKKK..KKKKK..",".KCCCCCKKCCCCCK.",".KCK.KCCCCK.KCK.",".KCK.KDDDDK.KCK.",".KDDDDDKKDDDDDK.","..KKKKK..KKKKK..","...ZZZZZ..ZZZZZ.","................","................","................","................"],
'home': [".....AA.....","....AAAA....","...AAAAAA...","..AAAAAAAA..",".AAAAAAAAAA.","..AAAAAAAA..","..AAAAAAAA..","..AAA..AAA..","..AAA..AAA..","..DDD..DDD..","............","............"],
'plus': ["............",".....AA.....",".....AA.....",".....AA.....","..AAAAAAAA..","..AAAAAAAA..","..DDDAADDD..",".....AA.....",".....AA.....",".....DD.....","............","............"],
'user': ["............","....AAAA....","...AAAAAA...","...AAAAAA...","....DDDD....","............","..AAAAAAAA..",".AAAAAAAAAA.",".AAAAAAAAAA.",".DDDDDDDDDD.","............","............"],
'back': ["............","....A.......","...AA.......","..AAAAAAAAA.",".AAAAAAAAAA.","..DDDDDDDDD.","...DD.......","....D.......","............","............","............","............"],
'send': ["............",".......K....",".......KK...",".KKKKKKKKK..",".KKKKKKKKKK.",".KKKKKKKKK..",".......KK...",".......K....","............","............","............","............"],
'lock': ["............","....KKKK....","...KAAAAK...","...KAKKAK...","..KKKKKKKK..","..KAAAAAAK..","..KAAKKAAK..","..KAAKKAAK..","..KDDDDDDK..","..KKKKKKKK..","............","............"],
'check': ["............","............","..........K.",".........KMK","........KMK.","..K....KMK..",".KMK..KMK...","..KMKKMK....","...KMMK.....","....KK......","............","............"],
}
PAL['M'] = '#8cc5b0'
for name, rows in ICONS.items():
    n = len(rows); w = len(rows[0])
    for i, r in enumerate(rows):
        if len(r) != w: print('WIDTH', name, i, len(r), repr(r))
    out = []
    for y, r in enumerate(rows):
        x = 0
        while x < w:
            c = r[x]
            if c == '.': x += 1; continue
            x2 = x
            while x2 < w and r[x2] == c: x2 += 1
            col = PAL[c]
            if isinstance(col, tuple):
                out.append(f'<rect x="{x}" y="{y}" width="{x2-x}" height="1" fill="{col[0]}" fill-opacity="{col[1]}"/>')
            else:
                out.append(f'<rect x="{x}" y="{y}" width="{x2-x}" height="1" fill="{col}"/>')
            x = x2
    px = 10
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w*px}" height="{n*px}" viewBox="0 0 {w} {n}" shape-rendering="crispEdges">' + ''.join(out) + '</svg>\n'
    open(os.path.join(OUT, f'i-{name}.svg'), 'w').write(svg)
print('ok', len(ICONS))
