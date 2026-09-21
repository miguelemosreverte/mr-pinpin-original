from pathlib import Path
import html
p=Path(__file__).parent
s=['<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1100" viewBox="0 0 1500 1100"><rect width="1500" height="1100" fill="#f4efdf"/><style>text{font-family:Arial;fill:#30281f;font-size:16px}.h{font-size:25px;font-weight:bold}.n{font-size:13px}.room{fill:#e1cdab;stroke:#665644;stroke-width:3}.light{fill:#f6d260;stroke:#a77e16}</style>']
def text(x,y,t,c=''):s.append(f'<text x="{x}" y="{y}" class="{c}">{html.escape(t)}</text>')
def rect(x,y,w,h,c='room'):s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" class="{c}"/>')
def line(x1,y1,x2,y2,color='#725e49',w=2):s.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{w}"/>')
text(30,35,'ELDER / REVISION 02 — spatial planning, not measured reconstruction','h');text(30,63,'P = approximate child body length. North/inward is up. Same two-flight route down and up.','n')
text(40,104,'HOME LEVEL  z=0','h');rect(55,260,550,340);text(270,620,'Root vestibule → exterior');line(300,600,350,600,'#f4efdf',10)
rect(95,380,145,60);text(104,415,'Writing table');rect(65,285,90,70);text(70,310,'Books');text(70,335,'Artifacts');rect(460,435,120,100);text(470,477,'Bed / hearth');text(230,292,'Map');text(250,530,'Clear walking space');text(320,580,'South light / root gaps','n')
line(440,260,490,260,'#94683e',9);text(65,206,'Inner door: pulls into home');text(65,228,'East/right hinge; west/left low ring','n');s.append('<path d="M 490 260 L 490 310 A 50 50 0 0 1 440 260" fill="none" stroke="#a85e39" stroke-dasharray="4 4"/>')
rect(430,110,55,140);rect(515,110,55,140);rect(430,82,140,28);text(437,78,'Middle landing z=-2','n');
for i in range(1,13):line(430,110+i*10,485,110+i*10);line(515,110+i*10,570,110+i*10)
text(440,155,'A ↓');text(526,205,'B ↓');text(445,190,'north','n');text(518,160,'south','n');text(497,270,'B ends at cave z=-4','n');text(70,658,'Flights A/B: 12 shallow treads each, ~0.167P rise / 0.5P depth.','n')
text(765,104,'CAVE PLATEAU  z=-4','h');rect(775,170,645,400);rect(1260,120,80,50);text(1140,105,'NE stair arrival (5,8,-4)','n');line(1295,170,1295,210,'#f4efdf',10)
text(800,340,'LIFE');text(790,362,'west');text(995,155,'DEFENDER / north');text(1300,340,'LIGHT');text(1300,362,'east');text(993,548,'COMMUNITY / south');rect(1000,175,110,40);text(1015,209,'Bench');s.append('<circle cx="870" cy="470" r="30" fill="#edcf7b" stroke="#ae8730"/>');text(808,470,'Day shaft','n');text(792,505,'SW: actual sky opening','n')
for x,y in [(808,280),(1110,205),(1380,280),(1190,530)]:s.append(f'<circle cx="{x}" cy="{y}" r="9" class="light"/>')
text(790,610,'Broad level stone terrace; small curb, no cliff/pit.','n');text(790,634,'Murals fixed by compass wall; amber lamp beside each.','n');text(790,658,'Cave ceiling 2.5–3P above terrace; stays below home floor.','n')
text(40,724,'UNFOLDED STAIR SECTION — shows levels, not a straight physical flight','h')
line(50,780,240,780,'#674d30',5);text(60,760,'Home z=0 / door / top landing');x,y=240,780
for i in range(12):line(x,y,x+20,y);line(x+20,y,x+20,y+6);x+=20;y+=6
line(x,y,x+160,y,'#674d30',5);text(x+12,y-12,'Turn landing z=-2');x+=160
for i in range(12):line(x,y,x+20,y);line(x+20,y,x+20,y+6);x+=20;y+=6
line(x,y,1410,y,'#674d30',5);text(x+20,y-12,'Bottom entry → safe cave terrace z=-4')
for x,y in [(210,746),(545,818),(940,890)]:s.append(f'<circle cx="{x}" cy="{y}" r="12" class="light"/>')
text(45,984,'Descent: Elder leads, child behind; pause for eye contact only on landing. Ascent: child leads, Elder follows.','n');text(45,1010,'Fixed enclosed lamps at top, turn and bottom. Low continuous rails/curbs. Staff remains outside beside root portal.','n');text(45,1040,'Selected image plates own actual materials and visual dimensions; this plan owns route, openings and relative placement.','n');s.append('</svg>');(p/'floorplan.svg').write_text(''.join(s))
