import json, pathlib, subprocess, sys
p=pathlib.Path(sys.argv[1]).resolve()
r=json.loads((p/'capture.json').read_text())
def t(v):
 h=int(v//3600);m=int(v//60)%60;s=v%60
 return f'{h}:{m:02}:{s:05.2f}'
ass='''[Script Info]
ScriptType: v4.00+
PlayResX: 1366
PlayResY: 1020
WrapStyle: 0
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,DejaVu Sans,27,&H00FFFFFF,&H00FFFFFF,&H00132C2A,&H00132C2A,0,0,0,0,100,100,0,0,1,0,0,8,40,40,24,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
for i,s in enumerate(r['stages']):
 end=r['stages'][i+1]['time'] if i+1<len(r['stages']) else r['end']
 txt=s['text'].replace('\n',r'\N')
 ass+=f"Dialogue: 0,{t(s['time'])},{t(end)},Caption,,0,0,0,,{txt}\n"
(p/'captions.ass').write_text(ass)
videos=list((p/'raw').glob('*.webm'))
assert len(videos)==1, videos
subprocess.run(['ffmpeg','-hide_banner','-nostdin','-i',str(videos[0]),'-vf','pad=1366:1020:0:120:color=0x132c2a,ass=captions.ass','-t',str(r['end']),'-r','30','-c:v','libx264','-preset','fast','-crf','20','-threads','2','-pix_fmt','yuv420p','-an','-movflags','+faststart',sys.argv[2] if len(sys.argv)>2 else 'ReturnBy-HTML-receipt-walkthrough.mp4'],cwd=p,check=True)
