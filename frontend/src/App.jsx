import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Home, GitBranch, FileCode, CheckSquare, Code2, Route, Settings, Download, Play, Copy, MoreVertical, Trash2, Circle, Square, MousePointer2, ChevronDown, Upload, Link, Pencil, X, Plus, Menu, ShieldCheck, ArrowRight, ArrowLeft, Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Layers, SlidersHorizontal, Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import "./styles.css";

const API_URL = "/api/convert";

const templates = {
  state_machine: {
    name: "AutonomousVehicle",
    diagram_type: "state_machine",
    description: "State-machine model for autonomous vehicle safety control.",
    author: "Shubha Chakraborty",
    safety_property: "hazard = TRUE => mode # Cruise",
    verification_variables: {hazard:false},
    verification_safety: 'not hazard or pc != "cruise"',
    response_condition: "hazard", response_target: "stop", weak_fairness:false,
    states: [
      { id: "start", name: "start", type: "initial", x: 82, y: 142 },
      { id: "cruise", name: "Cruise", type: "state", x: 196, y: 115 },
      { id: "slow", name: "SlowDown", type: "state", x: 500, y: 115 },
      { id: "stop", name: "EmergencyStop", type: "state", x: 500, y: 300 },
      { id: "end", name: "end", type: "final", x: 560, y: 418 }
    ],
    transitions: [
      { id: "e1", source: "start", target: "cruise", label: "" },
      { id: "e2", source: "cruise", target: "slow", label: "hazard_detected", guard:"True", updates:{hazard:true} },
      { id: "e3", source: "slow", target: "cruise", label: "hazard_clear", guard:"hazard", updates:{hazard:false} },
      { id: "e4", source: "slow", target: "stop", label: "hazard_critical", guard:"hazard", updates:{} },
      { id: "e5", source: "stop", target: "cruise", label: "reset", guard:"True", updates:{hazard:false} },
      { id: "e6", source: "stop", target: "end", label: "" }
    ],
    actors: [], use_cases: [], associations: [], classes: [], relationships: [], lifelines: [], messages: [], actions: [], flows: []
  },
  use_case: {
    name: "LoginSystem",
    diagram_type: "use_case",
    description: "Use case model for user authentication.",
    author: "Shubha Chakraborty",
    safety_property: "completed subset requested",
    forbidden_requests:[{source:"a1",target:"u3"}],
    weak_fairness:true, verify_completion:true,
    actors: [{id:"a1", name:"User", x:80, y:170}, {id:"a2", name:"Admin", x:80, y:320}],
    use_cases: [{id:"u1", name:"Login", x:320, y:150}, {id:"u2", name:"ResetPassword", x:320, y:260}, {id:"u3", name:"ManageUsers", x:320, y:370}],
    associations: [{id:"ua1", source:"a1", target:"u1", label:"request"}, {id:"ua2", source:"a1", target:"u2", label:"request"}, {id:"ua3", source:"a2", target:"u3", label:"manage"}],
    states: [], transitions: [], classes: [], relationships: [], lifelines: [], messages: [], actions: [], flows: []
  },
  class: {
    name: "VehicleControl",
    diagram_type: "class",
    description: "Class diagram for a vehicle controller.",
    author: "Shubha Chakraborty",
    safety_property: "objects belong to declared classes",
    classes: [
      {id:"c1", name:"Vehicle", attributes:["speed:int","mode:str"], methods:["brake()","accelerate()"], x:80, y:120},
      {id:"c2", name:"Sensor", attributes:["hazard:bool"], methods:["detect()"], x:360, y:120},
      {id:"c3", name:"Controller", attributes:["state:str"], methods:["decide()","override()"], x:220, y:330}
    ],
    relationships: [{id:"r1", source:"c2", target:"c3", type:"association", label:"feeds"}, {id:"r2", source:"c3", target:"c1", type:"association", label:"controls"}],
    states: [], transitions: [], actors: [], use_cases: [], associations: [], lifelines: [], messages: [], actions: [], flows: []
  },
  sequence: {
    name: "EmergencyStopProtocol",
    diagram_type: "sequence",
    description: "Sequence diagram for emergency stop handling.",
    author: "Shubha Chakraborty",
    safety_property: "messages execute in declared order",
    lifelines: [{id:"l1", name:"Sensor", x:120, y:80}, {id:"l2", name:"Controller", x:360, y:80}, {id:"l3", name:"Vehicle", x:600, y:80}],
    messages: [
      {id:"m1", source:"l1", target:"l2", label:"hazard_detected", order:0},
      {id:"m2", source:"l2", target:"l3", label:"brake_command", order:1},
      {id:"m3", source:"l3", target:"l2", label:"stopped_ack", order:2}
    ],
    states: [], transitions: [], actors: [], use_cases: [], associations: [], classes: [], relationships: [], actions: [], flows: []
  },
  activity: {
    name: "SafetyWorkflow",
    diagram_type: "activity",
    description: "Activity diagram for safety workflow.",
    author: "Shubha Chakraborty",
    safety_property: "workflow makes progress",
    actions: [
      {id:"ac0", name:"start", type:"initial", x:90, y:80},
      {id:"ac1", name:"ReadSensor", type:"action", x:260, y:80},
      {id:"ac2", name:"HazardDecision", type:"decision", x:460, y:80},
      {id:"ac3", name:"ApplyBrake", type:"action", x:650, y:80},
      {id:"ac4", name:"ContinueDrive", type:"action", x:460, y:260},
      {id:"ac5", name:"end", type:"final", x:650, y:260}
    ],
    flows: [
      {id:"f1", source:"ac0", target:"ac1", label:""},
      {id:"f2", source:"ac1", target:"ac2", label:""},
      {id:"f3", source:"ac2", target:"ac3", label:"hazard"},
      {id:"f4", source:"ac2", target:"ac4", label:"clear"},
      {id:"f5", source:"ac3", target:"ac5", label:""},
      {id:"f6", source:"ac4", target:"ac5", label:""}
    ],
    states: [], transitions: [], actors: [], use_cases: [], associations: [], classes: [], relationships: [], lifelines: [], messages: []
  }
};

function uid(prefix) { return prefix + Math.random().toString(36).slice(2, 9); }
function copy(text) {
  const value = text || "";
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(value).then(() => alert("Copied successfully."));
  } else {
    const area = document.createElement("textarea");
    area.value = value;
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.focus();
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
    alert("Copied successfully.");
  }
}
function downloadText(filename, text) { const blob = new Blob([text], {type:"text/plain"}); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

const diagramNames = {state_machine:"State machine", use_case:"Use case", class:"Class diagram", sequence:"Sequence", activity:"Activity"};
function Header({model,onVerify,onGenerate,onImport,onDownloadAll,busy,onHome,onNavToggle,onSettings}) {
  const supported=["state_machine","use_case"].includes(model.diagram_type);
  return <header className="topbar">
    <button className="icon-button mobile-menu" onClick={onNavToggle} aria-label="Toggle navigation"><Menu size={20}/></button>
    <button className="brand" onClick={onHome}><span className="logo"><GitBranch size={21}/></span><span><b>UML2TLA+</b><small>MODEL WORKSPACE</small></span></button>
    <div className="project"><span>Workspace</span><span className="breadcrumb-separator">/</span><b>{model.name}</b></div>
    <div className="top-actions">
      <button className="quiet-button" onClick={onImport}><Upload size={16}/><span>Import</span></button>
      <button className="quiet-button" onClick={onDownloadAll}><Download size={16}/><span>Save project</span></button>
      <button className="icon-button" onClick={onSettings} aria-label="Project settings"><Settings size={18}/></button>
      <button className="primary-button" aria-label={supported?"Verify model":"Analyze diagram"} disabled={busy} onClick={onVerify}>{busy?<Loader2 size={17} className="spin"/>:<ShieldCheck size={17}/>}<span>{busy?"Working…":supported?"Verify model":"Analyze diagram"}</span></button>
    </div>
  </header>;
}
function SidebarItem({icon,label,active,onClick}) {
  return <button className={`side-item ${active?"active":""}`} onClick={onClick} aria-current={active?"page":undefined}>{icon}<span>{label}</span>{active&&<span className="nav-dot"/>}</button>;
}
function Sidebar({active,setActive,model,loadTemplate,onHome}) {
  return <aside className="sidebar"><div className="side-title">WORKSPACE</div>
    {[['editor','Model editor',<GitBranch size={18}/>],['checking','Verification',<ShieldCheck size={18}/>],['tla','TLA+ specification',<FileCode size={18}/>],['python','Python code',<Code2 size={18}/>],['trace','Trace explorer',<Route size={18}/>],['settings','Project settings',<Settings size={18}/>]].map(([key,label,icon])=><SidebarItem key={key} icon={icon} label={label} active={active===key} onClick={()=>setActive(key)}/>)}
    <div className="side-title">DIAGRAM LIBRARY</div>
    {Object.entries(diagramNames).map(([kind,name])=><SidebarItem key={kind} icon={kind==='use_case'?<Circle size={17}/>:kind==='class'?<Square size={17}/>:<GitBranch size={17}/>} label={name} active={model.diagram_type===kind} onClick={()=>loadTemplate(kind)}/>)}
    <div className="sidebar-bottom"><div className="project-box"><span className="eyebrow">CURRENT PROJECT</span><b>{model.name}</b><span>{diagramNames[model.diagram_type]}</span></div><button className="quiet-button" onClick={onHome}><Plus size={16}/> Project home</button><span className="sidebar-version">Workspace 5.0</span></div>
  </aside>;
}

function Panel({ title, children, actions }) {
  return <section className="panel"><div className="panel-head"><b>{title}</b><div className="panel-icons">{actions}</div></div>{children}</section>
}






function edgeKey(edge) {
  const a = edge.source || "";
  const b = edge.target || "";
  return [a, b].sort().join("__");
}

function edgeLabelOffset(edge, allEdges) {
  const list = allEdges || [];
  const sameLine = list
    .filter(e => edgeKey(e) === edgeKey(edge))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const index = sameLine.findIndex(e => e.id === edge.id);
  if (index < 0) return -34;

  // Strong vertical lanes. First duplicate goes above, second below.
  const lanes = [-42, 42, -72, 72, -102, 102, -132, 132];
  return lanes[index] ?? (index % 2 === 0 ? -42 - index * 18 : 42 + index * 18);
}

function edgeLabelPosition(x1, y1, x2, y2, offset) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return { x: mx + nx * offset, y: my + ny * offset };
}

function EdgeLabel({ x, y, text }) {
  const value = text || "";
  if (!value) return null;
  const width = Math.max(54, value.length * 8 + 18);
  return (
    <g className="edge-label">
      <rect x={x - width / 2} y={y - 15} width={width} height="26" rx="6" />
      <text x={x} y={y - 2} textAnchor="middle">{value}</text>
    </g>
  );
}





function labelLaneForEdge(edge, allEdges) {
  const list = allEdges || [];
  const pairKey = e => [e.source, e.target].sort().join("__");
  const same = list
    .filter(e => pairKey(e) === pairKey(edge))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const idx = Math.max(0, same.findIndex(e => e.id === edge.id));
  const lanes = [-44, 44, -76, 76, -108, 108];
  return lanes[idx] ?? (idx % 2 === 0 ? -44 - idx * 20 : 44 + idx * 20);
}

function labelPoint(x1, y1, x2, y2, lane) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    x: mx + (-dy / len) * lane,
    y: my + (dx / len) * lane
  };
}

function PrettyEdgeLabel({ x, y, text }) {
  if (!text) return null;
  const w = Math.max(56, String(text).length * 8 + 20);
  return (
    <g className="pretty-edge-label">
      <rect x={x - w / 2} y={y - 15} width={w} height="26" rx="6" />
      <text x={x} y={y - 1} textAnchor="middle">{text}</text>
    </g>
  );
}


function samePairEdges(edge, allEdges) {
  const key = e => [e.source, e.target].sort().join("__");
  return (allEdges || [])
    .filter(e => key(e) === key(edge))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function parallelLane(edge, allEdges) {
  const same = samePairEdges(edge, allEdges);
  const index = Math.max(0, same.findIndex(e => e.id === edge.id));

  // First edge is straight only when it is alone. When there are duplicates,
  // move every edge into a visible separate lane.
  if (same.length <= 1) return 0;

  const lanes = [-42, 42, -78, 78, -114, 114, -150, 150];
  return lanes[index] ?? (index % 2 === 0 ? -42 - index * 24 : 42 + index * 24);
}

function edgeGeometry(x1, y1, x2, y2, lane) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const cx = mx + nx * lane;
  const cy = my + ny * lane;

  return {
    path: lane === 0 ? `M ${x1} ${y1} L ${x2} ${y2}` : `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
    labelX: cx,
    labelY: cy - 6
  };
}

function ParallelEdge({ x1, y1, x2, y2, edge, edges, markerEnd = "url(#arrow)", onPointerDown }) {
  const lane = parallelLane(edge, edges);
  const geo = edgeGeometry(x1, y1, x2, y2, lane);
  return (
    <g onPointerDown={onPointerDown}>
      <path d={geo.path} markerEnd={markerEnd} className="edge parallel-edge" />
      <PrettyEdgeLabel x={geo.labelX} y={geo.labelY} text={edge.label} />
    </g>
  );
}

function RenderDiagram({ model, setModel }) {
  if (model.diagram_type === "use_case") return <UseCaseView model={model} setModel={setModel}/>;
  if (model.diagram_type === "class") return <ClassView model={model} setModel={setModel}/>;
  if (model.diagram_type === "sequence") return <SequenceView model={model} setModel={setModel}/>;
  if (model.diagram_type === "activity") return <ActivityView model={model} setModel={setModel}/>;
  return <StateMachineView model={model} setModel={setModel}/>;
}

function SvgBase({children,onMove,onUp,onBackground}) {
  const [view,setView]=useState({x:0,y:0,w:900,h:560});
  const drawing=useRef(null);
  function fit(){const b=drawing.current?.getBBox();if(b&&b.width&&b.height){setView({x:b.x-55,y:b.y-55,w:Math.max(b.width+110,300),h:Math.max(b.height+110,240)});}}
  function zoom(factor){setView(v=>{const w=Math.min(3600,Math.max(180,v.w*factor)),h=w*v.h/v.w;return{x:v.x+(v.w-w)/2,y:v.y+(v.h-h)/2,w,h};});}
  useEffect(()=>{const id=requestAnimationFrame(fit);return()=>cancelAnimationFrame(id);},[]);
  return <div className="svg-stage" onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
    <svg width="100%" height="100%" viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} onPointerDown={onBackground} aria-label="Editable UML diagram">
      <defs><pattern id="grid" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#dce2eb"/></pattern><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#526079"/></marker></defs>
      <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="url(#grid)"/>
      <g ref={drawing}>{children}</g>
    </svg>
    <div className="canvas-controls" onPointerDown={e=>e.stopPropagation()}><button aria-label="Zoom out" onClick={()=>zoom(1.25)}><ZoomOut size={16}/></button><span>{Math.round(900/view.w*100)}%</span><button aria-label="Zoom in" onClick={()=>zoom(.8)}><ZoomIn size={16}/></button><span className="control-divider"/><button aria-label="Fit diagram" onClick={fit}><Maximize size={16}/></button></div>
  </div>;
}

function EditorShell({ title, children, selected, editOpen, editValue, onEdit, onDelete, extra, modeText }) {
  return (
    <div className="diagram-wrap">
      <div className="editor-top">
        <div className="editor-title">{title}</div>
        <div className="editor-actions">{extra}</div>
        <button className="editbtn danger" onClick={onDelete}><Trash2 size={15}/> Delete</button>
      </div>
      <div className="editor-help">
        {modeText || "Select a tool, click an element to edit it, and drag elements to move them."}
      </div>
      {selected && editOpen && (
        <div className="inspector-fixed" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
          <div className="inspector-title"><Pencil size={14}/> Modify selected</div>
          <input
            value={editValue || ""}
            onChange={e => onEdit(e.target.value)}
            onInput={e => onEdit(e.currentTarget.value)}
            placeholder="Edit name or label"
            autoFocus
          />
          <button onClick={onDelete}><Trash2 size={14}/> delete selected</button>
        </div>
      )}
      {children}
    </div>
  );
}

function useDrag(model, setModel, collectionName) {
  const [drag, setDrag] = useState(null);
  const moved = useRef(false);

  function beginDrag(e, id) {
    e.stopPropagation();
    const item = model[collectionName].find(x => x.id === id);
    if (!item) return;
    const svg=e.currentTarget.ownerSVGElement || e.currentTarget.closest("svg");
    const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    moved.current=false;
    setDrag({
      id, svg,
      startX: point.x,
      startY: point.y,
      origX: item.x,
      origY: item.y
    });
  }

  function move(e) {
    if (!drag) return;
    const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(drag.svg.getScreenCTM().inverse());
    const dx = Math.round(point.x - drag.startX);
    const dy = Math.round(point.y - drag.startY);
    setModel({
      ...model,
      [collectionName]: model[collectionName].map(item =>
        item.id === drag.id
          ? { ...item, x: Math.max(20, drag.origX + dx), y: Math.max(40, drag.origY + dy) }
          : item
      )
    }, {record:!moved.current});
    moved.current=true;
  }

  function end() {
    setDrag(null);
  }

  return { beginDrag, move, end, dragging: drag };
}

function StateMachineView({ model, setModel }) {
  const [selected, setSelected] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [mode, setMode] = useState("select");
  const [connectStart, setConnectStart] = useState(null);
  const drag = useDrag(model, setModel, "states");
  const statesById = Object.fromEntries(model.states.map(s => [s.id, s]));

  function center(s) {
    if (s.type === "state") return { x: s.x + 75, y: s.y + 38 };
    return { x: s.x + 24, y: s.y + 24 };
  }

  function addState(type = "state") {
    const id = uid("s");
    const name = type === "state" ? `State${model.states.filter(s => s.type === "state").length + 1}` : type;
    setModel({ ...model, states: [...model.states, { id, name, type, x: 240 + model.states.length * 16, y: 190 + model.states.length * 10 }] });
    setSelected({ kind: "state", id });
    setMode("select");
  }

  function clickState(e, id) {
    e.stopPropagation();
    if (e.currentTarget && e.currentTarget.setPointerCapture && e.pointerId !== undefined) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} }
    setSelected({ kind: "state", id });

    if (mode === "connect") {
      if (!connectStart) {
        setConnectStart(id);
      } else if (connectStart !== id) {
        const label = prompt("Transition label", "event") || "";
        setModel({ ...model, transitions: [...model.transitions, { id: uid("e"), source: connectStart, target: id, label }] });
        setConnectStart(null);
        setMode("select");
      }
      return;
    }

    drag.beginDrag(e, id);
  }

  function edit(v) {
    if (!selected) return;
    if (selected.kind === "state") {
      setModel({ ...model, states: model.states.map(s => s.id === selected.id ? { ...s, name: v } : s) });
    } else {
      setModel({ ...model, transitions: model.transitions.map(t => t.id === selected.id ? { ...t, label: v } : t) });
    }
  }

  function del() {
    if (!selected) return;
    if (selected.kind === "state") {
      setModel({
        ...model,
        states: model.states.filter(s => s.id !== selected.id),
        transitions: model.transitions.filter(t => t.source !== selected.id && t.target !== selected.id)
      });
    } else {
      setModel({ ...model, transitions: model.transitions.filter(t => t.id !== selected.id) });
    }
    setSelected(null); setEditOpen(false);
    setEditOpen(false);
  }

  const selectedObj = selected?.kind === "state"
    ? model.states.find(s => s.id === selected.id)
    : model.transitions.find(t => t.id === selected?.id);

  return (
    <EditorShell
      title="State Machine Editor"
      selected={selected}
      editOpen={editOpen}
      editValue={selectedObj?.name ?? selectedObj?.label}
      onEdit={edit}
      onDelete={del}
      modeText={mode === "connect" ? "Connect mode: click source state, then target state." : "Select mode: drag states to move them. Double-click a state or line to edit it."}
      extra={
        <>
          <button className="editbtn" onClick={() => setMode("select")}><MousePointer2 size={15}/> Select</button>
          <button className={`editbtn ${mode === "connect" ? "active-tool" : ""}`} onClick={() => { setMode("connect"); setConnectStart(null); }}><Link size={15}/> Connect</button>
          <button className="editbtn" onClick={() => addState("state")}><Plus size={15}/> State</button>
          <button className="editbtn" onClick={() => addState("initial")}>● Initial</button>
          <button className="editbtn" onClick={() => addState("final")}>◎ Final</button>
        </>
      }
    >
      <SvgBase onMove={drag.move} onUp={drag.end} onBackground={(e) => { if (e.target.tagName === "svg" || e.target.tagName === "rect") { setSelected(null); setEditOpen(false); setEditOpen(false); } }}>
        {model.transitions.map(t => {
          const s = statesById[t.source], d = statesById[t.target];
          if (!s || !d) return null;
          const a = center(s), b = center(d);
          return (
            <g key={t.id} onPointerDown={e => { e.stopPropagation(); setSelected({ kind: "transition", id: t.id }); }}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} markerEnd="url(#arrow)" className="edge"/>
              {(() => { const pos = edgeLabelPosition(a.x, a.y, b.x, b.y, edgeLabelOffset(t, model.transitions)); return <text x={pos.x} y={pos.y}>{t.label}</text>; })()}
            </g>
          );
        })}
        {model.states.map(s => {
          const selectedCls = selected?.kind === "state" && selected.id === s.id ? " selected-node" : "";
          if (s.type === "initial") {
            return <g key={s.id} onDoubleClick={e => { e.stopPropagation(); setSelected({ kind: "state", id: s.id }); setEditOpen(true); }} onPointerDown={e => { setEditOpen(false); clickState(e, s.id); }} className={selectedCls}><circle cx={s.x + 24} cy={s.y + 24} r="18" fill="#000"/></g>;
          }
          if (s.type === "final") {
            return <g key={s.id} onDoubleClick={e => { e.stopPropagation(); setSelected({ kind: "state", id: s.id }); setEditOpen(true); }} onPointerDown={e => { setEditOpen(false); clickState(e, s.id); }} className={selectedCls}><circle cx={s.x + 24} cy={s.y + 24} r="21" fill="none" stroke="#000" strokeWidth="2"/><circle cx={s.x + 24} cy={s.y + 24} r="14" fill="#000"/></g>;
          }
          const color = s.name.toLowerCase().includes("stop") ? "red" : s.name.toLowerCase().includes("slow") ? "yellow" : "green";
          return (
            <g key={s.id} onDoubleClick={e => { e.stopPropagation(); setSelected({ kind: "state", id: s.id }); setEditOpen(true); }} onPointerDown={e => { setEditOpen(false); clickState(e, s.id); }} className={selectedCls}>
              <rect x={s.x} y={s.y} width="150" height="76" rx="12" className={`state ${color}`}/>
              <text x={s.x + 75} y={s.y + 44} textAnchor="middle">{s.name}</text>
            </g>
          );
        })}
      </SvgBase>
    </EditorShell>
  );
}

function UseCaseView({ model, setModel }) {
  const [selected, setSelected] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [mode, setMode] = useState("select");
  const [actorStart, setActorStart] = useState(null);
  const actorDrag = useDrag(model, setModel, "actors");
  const useCaseDrag = useDrag(model, setModel, "use_cases");
  const actors = Object.fromEntries(model.actors.map(a => [a.id, a]));
  const cases = Object.fromEntries(model.use_cases.map(u => [u.id, u]));

  function addActor() {
    const id = uid("a");
    setModel({ ...model, actors: [...model.actors, { id, name: `Actor${model.actors.length + 1}`, x: 80, y: 120 + model.actors.length * 90 }] });
    setSelected({ kind: "actor", id });
  }

  function addUseCase() {
    const id = uid("u");
    setModel({ ...model, use_cases: [...model.use_cases, { id, name: `UseCase${model.use_cases.length + 1}`, x: 350, y: 120 + model.use_cases.length * 90 }] });
    setSelected({ kind: "usecase", id });
  }

  function clickActor(e, id) {
    e.stopPropagation();
    if (e.currentTarget && e.currentTarget.setPointerCapture && e.pointerId !== undefined) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} }
    setSelected({ kind: "actor", id });
    if (mode === "connect") {
      setActorStart(id);
    } else {
      actorDrag.beginDrag(e, id);
    }
  }

  function clickUseCase(e, id) {
    e.stopPropagation();
    if (e.currentTarget && e.currentTarget.setPointerCapture && e.pointerId !== undefined) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} }
    setSelected({ kind: "usecase", id });
    if (mode === "connect" && actorStart) {
      const label = prompt("Association label", "uses") || "uses";
      setModel({ ...model, associations: [...model.associations, { id: uid("ua"), source: actorStart, target: id, label }] });
      setActorStart(null);
      setMode("select");
    } else {
      useCaseDrag.beginDrag(e, id);
    }
  }

  function move(e) {
    actorDrag.move(e);
    useCaseDrag.move(e);
  }

  function end() {
    actorDrag.end();
    useCaseDrag.end();
  }

  function edit(v) {
    if (!selected) return;
    if (selected.kind === "actor") setModel({ ...model, actors: model.actors.map(a => a.id === selected.id ? { ...a, name: v } : a) });
    else if (selected.kind === "usecase") setModel({ ...model, use_cases: model.use_cases.map(u => u.id === selected.id ? { ...u, name: v } : u) });
    else setModel({ ...model, associations: model.associations.map(a => a.id === selected.id ? { ...a, label: v } : a) });
  }

  function del() {
    if (!selected) return;
    if (selected.kind === "actor") setModel({ ...model, actors: model.actors.filter(a => a.id !== selected.id), forbidden_requests:(model.forbidden_requests||[]).filter(p=>p.source!==selected.id), associations: model.associations.filter(a => a.source !== selected.id) });
    else if (selected.kind === "usecase") setModel({ ...model, use_cases: model.use_cases.filter(u => u.id !== selected.id), forbidden_requests:(model.forbidden_requests||[]).filter(p=>p.target!==selected.id), associations: model.associations.filter(a => a.target !== selected.id) });
    else setModel({ ...model, associations: model.associations.filter(a => a.id !== selected.id) });
    setSelected(null); setEditOpen(false);
  }

  const obj = selected?.kind === "actor" ? model.actors.find(a => a.id === selected.id)
    : selected?.kind === "usecase" ? model.use_cases.find(u => u.id === selected.id)
    : model.associations.find(a => a.id === selected?.id);

  return (
    <EditorShell
      title="Use Case Editor"
      selected={selected}
      editOpen={editOpen}
      editValue={obj?.name ?? obj?.label}
      onEdit={edit}
      onDelete={del}
      modeText={mode === "connect" ? "Connect mode: click an actor, then a use case." : "Select mode: drag actors and use cases to move them."}
      extra={
        <>
          <button className="editbtn" onClick={() => setMode("select")}><MousePointer2 size={15}/> Select</button>
          <button className={`editbtn ${mode === "connect" ? "active-tool" : ""}`} onClick={() => { setMode("connect"); setActorStart(null); }}><Link size={15}/> Associate</button>
          <button className="editbtn" onClick={addActor}><Plus size={15}/> Actor</button>
          <button className="editbtn" onClick={addUseCase}><Plus size={15}/> Use Case</button>
        </>
      }
    >
      <SvgBase onMove={move} onUp={end} onBackground={(e) => { if (e.target.tagName === "svg" || e.target.tagName === "rect") { setSelected(null); setEditOpen(false); setEditOpen(false); } }}>
        {model.associations.map(a => {
          const s = actors[a.source], t = cases[a.target];
          if (!s || !t) return null;
          return (
            <g key={a.id} onPointerDown={e => { e.stopPropagation(); setSelected({ kind: "assoc", id: a.id }); }}>
              <line x1={s.x + 35} y1={s.y + 42} x2={t.x + 90} y2={t.y + 40} className="edge"/>
              {(() => { const pos = edgeLabelPosition(s.x + 35, s.y + 42, t.x + 90, t.y + 40, edgeLabelOffset(a, model.associations)); return <text x={pos.x} y={pos.y}>{a.label}</text>; })()}
            </g>
          );
        })}
        {model.actors.map(a => (
          <g key={a.id} onPointerDown={e => clickActor(e, a.id)} className={selected?.kind === "actor" && selected.id === a.id ? "selected-node" : ""}>
            <circle cx={a.x + 25} cy={a.y + 14} r="12" fill="none" stroke="#111"/>
            <line x1={a.x + 25} y1={a.y + 26} x2={a.x + 25} y2={a.y + 62} stroke="#111"/>
            <line x1={a.x} y1={a.y + 38} x2={a.x + 50} y2={a.y + 38} stroke="#111"/>
            <line x1={a.x + 25} y1={a.y + 62} x2={a.x + 4} y2={a.y + 88} stroke="#111"/>
            <line x1={a.x + 25} y1={a.y + 62} x2={a.x + 46} y2={a.y + 88} stroke="#111"/>
            <text x={a.x + 25} y={a.y + 108} textAnchor="middle">{a.name}</text>
          </g>
        ))}
        {model.use_cases.map(u => (
          <g key={u.id} onPointerDown={e => clickUseCase(e, u.id)} className={selected?.kind === "usecase" && selected.id === u.id ? "selected-node" : ""}>
            <ellipse cx={u.x + 90} cy={u.y + 40} rx="90" ry="38" className="usecase"/>
            <text x={u.x + 90} y={u.y + 46} textAnchor="middle">{u.name}</text>
          </g>
        ))}
      </SvgBase>
    </EditorShell>
  );
}

function ClassView({ model, setModel }) {
  const [selected, setSelected] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [mode, setMode] = useState("select");
  const [sourceClass, setSourceClass] = useState(null);
  const drag = useDrag(model, setModel, "classes");
  const byId = Object.fromEntries(model.classes.map(c => [c.id, c]));

  function addClass() {
    const id = uid("c");
    setModel({ ...model, classes: [...model.classes, { id, name: `Class${model.classes.length + 1}`, attributes: ["id:int"], methods: ["run()"], x: 120 + model.classes.length * 190, y: 140 }] });
    setSelected({ kind: "class", id });
  }

  function clickClass(e, id) {
    e.stopPropagation();
    if (e.currentTarget && e.currentTarget.setPointerCapture && e.pointerId !== undefined) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} }
    setSelected({ kind: "class", id });
    if (mode === "connect") {
      if (!sourceClass) setSourceClass(id);
      else if (sourceClass !== id) {
        const label = prompt("Relationship label", "association") || "association";
        setModel({ ...model, relationships: [...model.relationships, { id: uid("r"), source: sourceClass, target: id, type: "association", label }] });
        setSourceClass(null);
        setMode("select");
      }
    } else {
      drag.beginDrag(e, id);
    }
  }

  function edit(v) {
    if (!selected) return;
    if (selected.kind === "class") setModel({ ...model, classes: model.classes.map(c => c.id === selected.id ? { ...c, name: v } : c) });
    else setModel({ ...model, relationships: model.relationships.map(r => r.id === selected.id ? { ...r, label: v } : r) });
  }

  function addAttribute() {
    if (!selected || selected.kind !== "class") return;
    const value = prompt("Attribute", "newAttr:int");
    if (!value) return;
    setModel({ ...model, classes: model.classes.map(c => c.id === selected.id ? { ...c, attributes: [...c.attributes, value] } : c) });
  }

  function addMethod() {
    if (!selected || selected.kind !== "class") return;
    const value = prompt("Method", "newMethod()");
    if (!value) return;
    setModel({ ...model, classes: model.classes.map(c => c.id === selected.id ? { ...c, methods: [...c.methods, value] } : c) });
  }

  function del() {
    if (!selected) return;
    if (selected.kind === "class") setModel({ ...model, classes: model.classes.filter(c => c.id !== selected.id), relationships: model.relationships.filter(r => r.source !== selected.id && r.target !== selected.id) });
    else setModel({ ...model, relationships: model.relationships.filter(r => r.id !== selected.id) });
    setSelected(null); setEditOpen(false);
  }

  const obj = selected?.kind === "class" ? model.classes.find(c => c.id === selected.id) : model.relationships.find(r => r.id === selected?.id);

  return (
    <EditorShell
      title="Class Diagram Editor"
      selected={selected}
      editOpen={editOpen}
      editValue={obj?.name ?? obj?.label}
      onEdit={edit}
      onDelete={del}
      modeText={mode === "connect" ? "Connect mode: click source class, then target class." : "Select mode: drag classes to move them. Select a class to add attributes or methods."}
      extra={
        <>
          <button className="editbtn" onClick={() => setMode("select")}><MousePointer2 size={15}/> Select</button>
          <button className={`editbtn ${mode === "connect" ? "active-tool" : ""}`} onClick={() => { setMode("connect"); setSourceClass(null); }}><Link size={15}/> Relation</button>
          <button className="editbtn" onClick={addClass}><Plus size={15}/> Class</button>
          <button className="editbtn" onClick={addAttribute}>+ Attribute</button>
          <button className="editbtn" onClick={addMethod}>+ Method</button>
        </>
      }
    >
      <SvgBase onMove={drag.move} onUp={drag.end} onBackground={(e) => { if (e.target.tagName === "svg" || e.target.tagName === "rect") { setSelected(null); setEditOpen(false); setEditOpen(false); } }}>
        {model.relationships.map(r => {
          const s = byId[r.source], t = byId[r.target];
          if (!s || !t) return null;
          return (
            <g key={r.id} onPointerDown={e => { e.stopPropagation(); setSelected({ kind: "rel", id: r.id }); }}>
              <line x1={s.x + 95} y1={s.y + 66} x2={t.x + 95} y2={t.y + 66} markerEnd="url(#arrow)" className="edge"/>
              {(() => { const pos = edgeLabelPosition(s.x + 95, s.y + 66, t.x + 95, t.y + 66, edgeLabelOffset(r, model.relationships)); return <text x={pos.x} y={pos.y}>{r.label}</text>; })()}
            </g>
          );
        })}
        {model.classes.map(c => (
          <g key={c.id} onPointerDown={e => clickClass(e, c.id)} className={selected?.kind === "class" && selected.id === c.id ? "selected-node" : ""}>
            <rect x={c.x} y={c.y} width="190" height="140" rx="5" className="classbox"/>
            <line x1={c.x} y1={c.y + 36} x2={c.x + 190} y2={c.y + 36} stroke="#334155"/>
            <line x1={c.x} y1={c.y + 86} x2={c.x + 190} y2={c.y + 86} stroke="#334155"/>
            <text x={c.x + 95} y={c.y + 24} textAnchor="middle" className="bold">{c.name}</text>
            {c.attributes.slice(0, 3).map((a, i) => <text key={i} x={c.x + 10} y={c.y + 58 + i * 16}>{a}</text>)}
            {c.methods.slice(0, 3).map((m, i) => <text key={i} x={c.x + 10} y={c.y + 108 + i * 16}>{m}</text>)}
          </g>
        ))}
      </SvgBase>
    </EditorShell>
  );
}

function SequenceView({ model, setModel }) {
  const [selected, setSelected] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [mode, setMode] = useState("select");
  const [source, setSource] = useState(null);
  const drag = useDrag(model, setModel, "lifelines");
  const byId = Object.fromEntries(model.lifelines.map(l => [l.id, l]));

  function addLifeline() {
    const id = uid("l");
    setModel({ ...model, lifelines: [...model.lifelines, { id, name: `Lifeline${model.lifelines.length + 1}`, x: 140 + model.lifelines.length * 180, y: 70 }] });
    setSelected({ kind: "life", id });
  }

  function clickLife(e, id) {
    e.stopPropagation();
    if (e.currentTarget && e.currentTarget.setPointerCapture && e.pointerId !== undefined) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} }
    setSelected({ kind: "life", id });
    if (mode === "message") {
      if (!source) setSource(id);
      else if (source !== id) {
        const label = prompt("Message label", "message") || "message";
        setModel({ ...model, messages: [...model.messages, { id: uid("m"), source, target: id, label, order: model.messages.length }] });
        setSource(null);
        setMode("select");
      }
    } else {
      drag.beginDrag(e, id);
    }
  }

  function edit(v) {
    if (!selected) return;
    if (selected.kind === "life") setModel({ ...model, lifelines: model.lifelines.map(l => l.id === selected.id ? { ...l, name: v } : l) });
    else setModel({ ...model, messages: model.messages.map(m => m.id === selected.id ? { ...m, label: v } : m) });
  }

  function del() {
    if (!selected) return;
    if (selected.kind === "life") setModel({ ...model, lifelines: model.lifelines.filter(l => l.id !== selected.id), messages: model.messages.filter(m => m.source !== selected.id && m.target !== selected.id) });
    else setModel({ ...model, messages: model.messages.filter(m => m.id !== selected.id) });
    setSelected(null); setEditOpen(false);
  }

  const obj = selected?.kind === "life" ? model.lifelines.find(l => l.id === selected.id) : model.messages.find(m => m.id === selected?.id);

  return (
    <EditorShell
      title="Sequence Diagram Editor"
      selected={selected}
      editOpen={editOpen}
      editValue={obj?.name ?? obj?.label}
      onEdit={edit}
      onDelete={del}
      modeText={mode === "message" ? "Message mode: click sender lifeline, then receiver lifeline." : "Select mode: drag lifelines horizontally or vertically."}
      extra={
        <>
          <button className="editbtn" onClick={() => setMode("select")}><MousePointer2 size={15}/> Select</button>
          <button className={`editbtn ${mode === "message" ? "active-tool" : ""}`} onClick={() => { setMode("message"); setSource(null); }}><Link size={15}/> Message</button>
          <button className="editbtn" onClick={addLifeline}><Plus size={15}/> Lifeline</button>
        </>
      }
    >
      <SvgBase onMove={drag.move} onUp={drag.end} onBackground={(e) => { if (e.target.tagName === "svg" || e.target.tagName === "rect") { setSelected(null); setEditOpen(false); setEditOpen(false); } }}>
        {model.lifelines.map(l => (
          <g key={l.id} onPointerDown={e => clickLife(e, l.id)} className={selected?.kind === "life" && selected.id === l.id ? "selected-node" : ""}>
            <rect x={l.x - 58} y={l.y} width="116" height="38" rx="5" className="lifeline-head"/>
            <text x={l.x} y={l.y + 24} textAnchor="middle">{l.name}</text>
            <line x1={l.x} y1={l.y + 38} x2={l.x} y2="520" stroke="#64748b" strokeDasharray="5 5"/>
          </g>
        ))}
        {[...model.messages].sort((a, b) => a.order - b.order).map((m, i) => {
          const s = byId[m.source], t = byId[m.target];
          if (!s || !t) return null;
          const y = 145 + i * 70;
          return (
            <g key={m.id} onPointerDown={e => { e.stopPropagation(); setSelected({ kind: "msg", id: m.id }); }}>
              <line x1={s.x} y1={y} x2={t.x} y2={y} markerEnd="url(#arrow)" className="edge"/>
              {(() => { const lane = labelLaneForEdge(m, model.messages); const p = labelPoint(s.x, y, t.x, y, lane); return <PrettyEdgeLabel x={p.x} y={p.y} text={m.label} />; })()}
            </g>
          );
        })}
      </SvgBase>
    </EditorShell>
  );
}

function ActivityView({ model, setModel }) {
  const [selected, setSelected] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [mode, setMode] = useState("select");
  const [source, setSource] = useState(null);
  const drag = useDrag(model, setModel, "actions");
  const byId = Object.fromEntries(model.actions.map(a => [a.id, a]));

  function addAction(type = "action") {
    const id = uid("ac");
    const name = type === "action" ? `Action${model.actions.filter(a => a.type === "action").length + 1}` : type;
    setModel({ ...model, actions: [...model.actions, { id, name, type, x: 160 + model.actions.length * 70, y: 220 }] });
    setSelected({ kind: "action", id });
  }

  function clickAction(e, id) {
    e.stopPropagation();
    if (e.currentTarget && e.currentTarget.setPointerCapture && e.pointerId !== undefined) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} }
    setSelected({ kind: "action", id });
    if (mode === "flow") {
      if (!source) setSource(id);
      else if (source !== id) {
        const label = prompt("Flow label", "") || "";
        setModel({ ...model, flows: [...model.flows, { id: uid("f"), source, target: id, label }] });
        setSource(null);
        setMode("select");
      }
    } else {
      drag.beginDrag(e, id);
    }
  }

  function edit(v) {
    if (!selected) return;
    if (selected.kind === "action") setModel({ ...model, actions: model.actions.map(a => a.id === selected.id ? { ...a, name: v } : a) });
    else setModel({ ...model, flows: model.flows.map(f => f.id === selected.id ? { ...f, label: v } : f) });
  }

  function del() {
    if (!selected) return;
    if (selected.kind === "action") setModel({ ...model, actions: model.actions.filter(a => a.id !== selected.id), flows: model.flows.filter(f => f.source !== selected.id && f.target !== selected.id) });
    else setModel({ ...model, flows: model.flows.filter(f => f.id !== selected.id) });
    setSelected(null); setEditOpen(false);
  }

  const obj = selected?.kind === "action" ? model.actions.find(a => a.id === selected.id) : model.flows.find(f => f.id === selected?.id);

  return (
    <EditorShell
      title="Activity Diagram Editor"
      selected={selected}
      editOpen={editOpen}
      editValue={obj?.name ?? obj?.label}
      onEdit={edit}
      onDelete={del}
      modeText={mode === "flow" ? "Flow mode: click source node, then target node." : "Select mode: drag activity nodes to move them."}
      extra={
        <>
          <button className="editbtn" onClick={() => setMode("select")}><MousePointer2 size={15}/> Select</button>
          <button className={`editbtn ${mode === "flow" ? "active-tool" : ""}`} onClick={() => { setMode("flow"); setSource(null); }}><Link size={15}/> Flow</button>
          <button className="editbtn" onClick={() => addAction("action")}><Plus size={15}/> Action</button>
          <button className="editbtn" onClick={() => addAction("decision")}>Decision</button>
          <button className="editbtn" onClick={() => addAction("initial")}>● Initial</button>
          <button className="editbtn" onClick={() => addAction("final")}>◎ Final</button>
        </>
      }
    >
      <SvgBase onMove={drag.move} onUp={drag.end} onBackground={(e) => { if (e.target.tagName === "svg" || e.target.tagName === "rect") { setSelected(null); setEditOpen(false); setEditOpen(false); } }}>
        {model.flows.map(f => {
          const s = byId[f.source];
          const t = byId[f.target];
        
          if (!s || !t) return null;
        
          function activityCenter(node) {
            if (node.type === "initial" || node.type === "final") {
              return {
                x: node.x + 28,
                y: node.y + 28
              };
            }
        
            if (node.type === "decision") {
              return {
                x: node.x + 65,
                y: node.y + 38
              };
            }
        
            return {
              x: node.x + 70,
              y: node.y + 33
            };
          }
        
          const a = activityCenter(s);
          const b = activityCenter(t);
          const pos = edgeLabelPosition(a.x, a.y, b.x, b.y, edgeLabelOffset(f, model.flows));
        
          return (
            <g
              key={f.id}
              onPointerDown={e => {
                e.stopPropagation();
                setSelected({ kind: "flow", id: f.id });
              }}
            >
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                markerEnd="url(#arrow)"
                className="edge"
              />
              <text x={pos.x} y={pos.y}>
                {f.label}
              </text>
            </g>
          );
        })}
        {model.actions.map(a => {
          const selectedCls = selected?.kind === "action" && selected.id === a.id ? " selected-node" : "";
          if (a.type === "initial") return <g key={a.id} onPointerDown={e => clickAction(e, a.id)} className={selectedCls}><circle cx={a.x + 28} cy={a.y + 28} r="18" fill="#000"/></g>;
          if (a.type === "final") return <g key={a.id} onPointerDown={e => clickAction(e, a.id)} className={selectedCls}><circle cx={a.x + 28} cy={a.y + 28} r="21" fill="none" stroke="#000" strokeWidth="2"/><circle cx={a.x + 28} cy={a.y + 28} r="14" fill="#000"/></g>;
          if (a.type === "decision") return <g key={a.id} onPointerDown={e => clickAction(e, a.id)} className={selectedCls}><polygon points={`${a.x + 65},${a.y} ${a.x + 130},${a.y + 38} ${a.x + 65},${a.y + 76} ${a.x},${a.y + 38}`} className="decision"/><text x={a.x + 65} y={a.y + 43} textAnchor="middle">{a.name}</text></g>;
          return <g key={a.id} onPointerDown={e => clickAction(e, a.id)} className={selectedCls}><rect x={a.x} y={a.y} width="140" height="66" rx="23" className="activity"/><text x={a.x + 70} y={a.y + 40} textAnchor="middle">{a.name}</text></g>;
        })}
      </SvgBase>
    </EditorShell>
  );
}


function PropertiesPanel({ model, setModel }) {
  const type = model.diagram_type;

  function input(value, onChange, placeholder = "Name") {
    return <input className="prop-input" value={value || ""} placeholder={placeholder} onChange={e => onChange(e.target.value)} />;
  }

  if (type === "state_machine") {
    return (
      <div className="properties-panel">
        <h4>Rename State Nodes</h4>
        {model.states.map(s => (
          <div className="prop-row" key={s.id}>
            <span>{s.type}</span>
            {input(s.name, v => setModel({ ...model, states: model.states.map(x => x.id === s.id ? { ...x, name: v } : x) }))}
          </div>
        ))}
        <h4>Transition Labels</h4>
        {model.transitions.map(t => (
          <div className="prop-row" key={t.id}>
            <span>edge</span>
            {input(t.label, v => setModel({ ...model, transitions: model.transitions.map(x => x.id === t.id ? { ...x, label: v } : x) }), "Label")}
          </div>
        ))}
      </div>
    );
  }

  if (type === "use_case") {
    return (
      <div className="properties-panel">
        <h4>Rename Actors</h4>
        {model.actors.map(a => (
          <div className="prop-row" key={a.id}>
            <span>actor</span>
            {input(a.name, v => setModel({ ...model, actors: model.actors.map(x => x.id === a.id ? { ...x, name: v } : x) }))}
          </div>
        ))}
        <h4>Rename Use Cases</h4>
        {model.use_cases.map(u => (
          <div className="prop-row" key={u.id}>
            <span>case</span>
            {input(u.name, v => setModel({ ...model, use_cases: model.use_cases.map(x => x.id === u.id ? { ...x, name: v } : x) }))}
          </div>
        ))}
        <h4>Association Labels</h4>
        {model.associations.map(a => (
          <div className="prop-row" key={a.id}>
            <span>link</span>
            {input(a.label, v => setModel({ ...model, associations: model.associations.map(x => x.id === a.id ? { ...x, label: v } : x) }), "Label")}
          </div>
        ))}
      </div>
    );
  }

  if (type === "class") {
    return (
      <div className="properties-panel">
        <h4>Rename Classes</h4>
        {model.classes.map(c => (
          <div className="prop-row" key={c.id}>
            <span>class</span>
            {input(c.name, v => setModel({ ...model, classes: model.classes.map(x => x.id === c.id ? { ...x, name: v } : x) }))}
          </div>
        ))}
        <h4>Relationship Labels</h4>
        {model.relationships.map(r => (
          <div className="prop-row" key={r.id}>
            <span>rel</span>
            {input(r.label, v => setModel({ ...model, relationships: model.relationships.map(x => x.id === r.id ? { ...x, label: v } : x) }), "Label")}
          </div>
        ))}
      </div>
    );
  }

  if (type === "sequence") {
    return (
      <div className="properties-panel">
        <h4>Rename Lifelines</h4>
        {model.lifelines.map(l => (
          <div className="prop-row" key={l.id}>
            <span>life</span>
            {input(l.name, v => setModel({ ...model, lifelines: model.lifelines.map(x => x.id === l.id ? { ...x, name: v } : x) }))}
          </div>
        ))}
        <h4>Message Labels</h4>
        {model.messages.map(m => (
          <div className="prop-row" key={m.id}>
            <span>msg</span>
            {input(m.label, v => setModel({ ...model, messages: model.messages.map(x => x.id === m.id ? { ...x, label: v } : x) }), "Label")}
          </div>
        ))}
      </div>
    );
  }

  if (type === "activity") {
    return (
      <div className="properties-panel">
        <h4>Rename Activity Nodes</h4>
        {model.actions.map(a => (
          <div className="prop-row" key={a.id}>
            <span>{a.type}</span>
            {input(a.name, v => setModel({ ...model, actions: model.actions.map(x => x.id === a.id ? { ...x, name: v } : x) }))}
          </div>
        ))}
        <h4>Flow Labels</h4>
        {model.flows.map(f => (
          <div className="prop-row" key={f.id}>
            <span>flow</span>
            {input(f.label, v => setModel({ ...model, flows: model.flows.map(x => x.id === f.id ? { ...x, label: v } : x) }), "Label")}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function CodeBlock({code}) {
  return <pre className="code">{(code||"").split("\n").map((l,i)=><div key={i}><span className="ln">{i+1}</span>{l}</div>)}</pre>
}

function ResultPanel({data}) {
  const stats=data?.statistics||{},status=stats.result;
  const tone=status==='PASSED'?'success':status==='VIOLATED'||status==='FAILED'?'failure':status==='ERROR'||status==='INCOMPLETE'?'caution':'neutral';
  const title=status==='PASSED'?'Checks passed':status==='VIOLATED'?'A property was violated':status==='INCOMPLETE'?'Run incomplete':status==='ERROR'?'Checker error':data?'Diagram analyzed':'Ready when you are';
  const Icon=tone==='success'?CheckCircle2:tone==='failure'||tone==='caution'?AlertCircle:ShieldCheck;
  return <Panel title="Verification overview" actions={<span className={`status-pill ${tone}`}>{data?.verification_kind==='tlc'?'TLC':data?'Structural':'Not run'}</span>}>
    <div className={`result-box ${tone}`}><Icon size={27}/><div><h3>{title}</h3><p>{data?.result||"Draw your diagram, define the contracts, then run verification."}</p></div></div>
    {data?<><div className="result-metrics"><div><b>{stats.distinct_states??'—'}</b><span>{data.verification_kind==='tlc'?'Distinct states':'Reachable nodes'}</span></div><div><b>{stats.time_taken?.replace(' sec','s')||'—'}</b><span>Run time</span></div></div>
    <h4>Checked properties</h4>{(data.properties||[]).map(p=><div className="property-result" key={p.name}><span>{p.name.replace(/([a-z])([A-Z])/g,'$1 $2')}</span><span className={`status-pill ${p.status==='PASSED'?'success':p.status==='VIOLATED'?'failure':'neutral'}`}>{p.status.replaceAll('_',' ').toLowerCase()}</span></div>)}
    {data.warnings?.length>0&&<details className="scope-details"><summary>Scope and assumptions <span>{data.warnings.length}</span></summary><ul className="warnings">{data.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>}
    {data.tlc_output&&<details className="scope-details"><summary>Checker log</summary><CodeBlock code={data.tlc_output}/></details>}</>:<div className="result-empty"><span className="eyebrow">YOUR NEXT STEPS</span><p><b>01</b> Build or import a diagram</p><p><b>02</b> Review verification contracts</p><p><b>03</b> Run checks and explore the result</p></div>}
  </Panel>;
}

function Info({label,value,good}) { return <div className="info"><span>{label}</span><b className={good?"good":""}>{value}</b></div> }


function TraceTable({trace}) {
  const rows = trace || [];
  return (
    <Panel title="Graph / Counterexample Trace" actions={<span className="trace-action-label">Trace</span>}>
      <div className="trace-scroll">
        {rows.length === 0 ? (
          <div className="trace-empty">Click Generate TLA+ and Python to see the graph discovery trace.</div>
        ) : (
          <table className="trace-table full-trace-table">
            <thead>
              <tr>
                <th>Step</th>
                <th>State / Mode</th>
                <th>Event / Action</th>
                <th>Details</th>
                <th>Safety Check</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.step ?? i}</td>
                  <td>{r.values?.pc ?? r.node ?? r.mode ?? r.pc ?? r.class ?? r.source ?? "-"}</td>
                  <td>{r.event ?? r.action ?? r.message ?? r.flow ?? "-"}</td>
                  <td><code>{JSON.stringify(r)}</code></td>
                  <td>{r.safe === undefined ? "Not checked" : String(r.safe)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Panel>
  );
}

function SettingsPanel({model,setModel}) {
  return <Panel title="Project Settings"><div className="settings-form"><label>Project Name<input value={model.name} onChange={e=>setModel({...model,name:e.target.value})}/></label><label>Author<input value={model.author||""} onChange={e=>setModel({...model,author:e.target.value})}/></label><label>Diagram Type<select value={model.diagram_type} onChange={e=>setModel({...templates[e.target.value], name:model.name})}>{Object.keys(templates).map(k=><option key={k} value={k}>{k}</option>)}</select></label><label>Description<textarea value={model.description||""} onChange={e=>setModel({...model,description:e.target.value})}/></label><label>Safety Property<input value={model.safety_property||""} onChange={e=>setModel({...model,safety_property:e.target.value})}/></label></div></Panel>
}

function Dashboard({model,data}) {
  const count = model.states.length + model.actors.length + model.use_cases.length + model.classes.length + model.lifelines.length + model.actions.length;
  return <Panel title="Dashboard"><div className="dashboard"><div className="card"><b>{model.diagram_type}</b><span>Diagram</span></div><div className="card"><b>{count}</b><span>Elements</span></div><div className="card"><b>{data?.statistics?.result||"Not checked"}</b><span>Structural Analysis</span></div><div className="card"><b>{data?.trace?.length||0}</b><span>Trace Steps</span></div></div><div className="about"><h3>{model.name}</h3><p>{model.description}</p><p><b>Safety property:</b> {model.safety_property}</p></div></Panel>
}



function FirstPage({model,setModel,startConverter,onImport,onCreate}) {
  const [projectName,setProjectName]=useState("");
  const [author,setAuthor]=useState(model.author||"");
  const [selectedDiagram,setSelectedDiagram]=useState("state_machine");
  const descriptions={state_machine:"States, events and safety contracts",use_case:"Actors, permissions and completion",class:"Structure, attributes and relationships",sequence:"Messages and interaction order",activity:"Actions, decisions and workflow"};
  function create(){const base=structuredClone(templates[selectedDiagram]);base.name=projectName.trim()||base.name;base.author=author;onCreate(base);}
  return <div className="landing-page"><nav className="landing-nav"><div className="brand"><span className="logo"><GitBranch size={22}/></span><span><b>UML2TLA+</b><small>MODEL WORKSPACE</small></span></div><button className="quiet-button" onClick={onImport}><Upload size={16}/> Import project</button></nav>
    <section className="landing-hero"><div><span className="hero-label"><span className="nav-dot"/> A workspace for thoughtful software design</span><h1>Build a model.<br/><span>Understand its behavior.</span></h1><p>Turn UML diagrams into formal specifications. Check properties with TLC and explore exactly where a model succeeds or fails.</p><button className="resume-button" onClick={startConverter}><span className="resume-icon"><Layers size={22}/></span><span><small>CONTINUE YOUR PROJECT</small><b>{model.name}</b></span><ArrowRight size={20}/></button></div>
    <div className="hero-model" aria-hidden="true"><div className="hero-model-top"><span className="eyebrow">MODEL → EVIDENCE</span><span className="status-pill success">Explicit contracts</span></div><svg viewBox="0 0 420 210"><path d="M80 106 H154 M260 106 H332" fill="none" stroke="#b3a4ef" strokeWidth="2" strokeDasharray="5 5"/><circle cx="60" cy="106" r="20" fill="#ece8ff"/><circle cx="60" cy="106" r="7" fill="#7453d7"/><rect x="154" y="76" width="106" height="60" rx="13" fill="#f4f1ff" stroke="#bcaded"/><text x="207" y="110" textAnchor="middle">Model</text><circle cx="352" cy="106" r="22" fill="#e6f4ed"/><path d="m342 105 7 7 13-15" stroke="#298465" strokeWidth="3" fill="none"/><text x="207" y="170" textAnchor="middle" fill="#64748b">Specify. Verify. Explore.</text></svg><div className="hero-model-footer"><span><FileCode size={15}/> TLA+ specification</span><span><Route size={15}/> Counterexample traces</span></div></div></section>
    <section className="project-launch"><div className="launch-heading"><span className="eyebrow">START SOMETHING NEW</span><h2>Create a project</h2><p>Choose the diagram that matches what you want to model.</p></div><div className="diagram-card-grid">{Object.entries(diagramNames).map(([kind,name],i)=><button key={kind} className={`diagram-card ${selectedDiagram===kind?'chosen':''}`} aria-pressed={selectedDiagram===kind} onClick={()=>setSelectedDiagram(kind)}><span className="diagram-card-icon">{kind==='class'?<Square size={22}/>:kind==='use_case'?<Circle size={22}/>:<GitBranch size={22}/>}</span><b>{name}</b><span>{descriptions[kind]}</span><small>{['state_machine','use_case'].includes(kind)?'TLC verification':'Structural analysis'}</small>{selectedDiagram===kind&&<CheckCircle2 className="diagram-selected" size={17}/>}</button>)}</div>
    <div className="project-form-grid"><label>Project name<input value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="e.g. Vehicle safety controller"/></label><label>Author <span>(optional)</span><input value={author} onChange={e=>setAuthor(e.target.value)} placeholder="Your name"/></label><button className="primary-button" onClick={create}>Open workspace <ArrowRight size={18}/></button></div></section><footer className="landing-footer"><span>UML2TLA+ · Workspace 5.0</span><span>Five diagram types. One place to work.</span></footer>
  </div>;
}

const PROJECT_KEY = "uml2tla_five_project";
const collections = ["states", "transitions", "actors", "use_cases", "associations", "classes", "relationships", "lifelines", "messages", "actions", "flows"];
function normalizeProject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !templates[value.diagram_type]) throw new Error("Choose a supported diagram type.");
  if (typeof value.name !== "string" || !value.name.trim()) throw new Error("Project name is required.");
  const result = {...structuredClone(templates[value.diagram_type]), ...value};
  for (const key of collections) {
    if (value[key] !== undefined && !Array.isArray(value[key])) throw new Error(`${key} must be an array.`);
    result[key] = (value[key] || []).map(item => {
      const nodes = ["states", "actors", "use_cases", "classes", "lifelines", "actions"].includes(key);
      if (!item || typeof item !== "object") throw new Error(`Invalid item in ${key}.`);
      if (nodes && (typeof item.name !== "string" || !item.name.trim())) throw new Error(`A name is required in ${key}.`);
      if (!nodes && (typeof item.source !== "string" || typeof item.target !== "string")) throw new Error(`Endpoints are required in ${key}.`);
      if (key === "classes" && ["attributes", "methods"].some(k => item[k] !== undefined && (!Array.isArray(item[k]) || item[k].some(v => typeof v !== "string")))) throw new Error("Class attributes and methods must be text arrays.");
      if (nodes && ["x", "y"].some(k => item[k] !== undefined && !Number.isFinite(item[k]))) throw new Error("Coordinates must be finite numbers.");
      if (item.label !== undefined && typeof item.label !== "string") throw new Error("Labels must be text.");
      if (key === "messages" && item.order !== undefined && (!Number.isInteger(item.order) || item.order < 0)) throw new Error("Message order must be a nonnegative integer.");
      return nodes ? {x:0,y:0,type:key === "states" ? "state" : "action",attributes:[],methods:[],...item} : {label:"",order:0,...item};
    });
    if (result[key].some(item => !item || typeof item.id !== "string" || ("source" in item ? typeof item.source !== "string" || typeof item.target !== "string" : typeof item.name !== "string"))) throw new Error(`Invalid item in ${key}.`);
  }
  return result;
}
function tlcExample(unsafe=false) {
  return {...structuredClone(templates.state_machine), name:unsafe?"TLCUnsafeExample":"TLCSafeExample",
    states:[{id:"start",name:"Start",type:"initial",x:60,y:130},{id:"idle",name:"Idle",type:"state",x:180,y:130},{id:"stop",name:"EmergencyStop",type:"state",x:450,y:130},{id:"end",name:"End",type:"final",x:670,y:130}],
    transitions:[{id:"init",source:"start",target:"idle",label:"begin",guard:"True",updates:{}},{id:"detect",source:"idle",target:unsafe?"idle":"stop",label:"hazard detected",guard:"not hazard",updates:{hazard:true}},{id:"finish",source:"stop",target:"end",label:"finish",guard:"True",updates:{hazard:false}}],
    verification_variables:{hazard:false},verification_safety:'not hazard or pc == "stop"',response_condition:'pc == "idle"',response_target:"stop",weak_fairness:true};
}
function UseCaseTLCSettings({model,setModel}) {
  const forbidden=model.forbidden_requests||[];
  function toggle(actor,useCase){const exists=forbidden.some(p=>p.source===actor&&p.target===useCase);setModel({...model,forbidden_requests:exists?forbidden.filter(p=>!(p.source===actor&&p.target===useCase)):[...forbidden,{source:actor,target:useCase}]});}
  return <Panel title="Use-case TLC Contracts"><div className="tlc-settings"><p>TLC checks actor permissions, completion after request, and the forbidden requests below. Each association permits one request and one completion. Click Analyze Model to run the checker.</p>
    <label><input type="checkbox" checked={!!model.verify_completion} onChange={e=>setModel({...model,verify_completion:e.target.checked})}/> Check that each request eventually completes</label>
    <label><input type="checkbox" checked={!!model.weak_fairness} onChange={e=>setModel({...model,weak_fairness:e.target.checked})}/> Assume weak fairness for completion actions</label>
    <details><summary>Forbidden actor requests</summary><p>Select requests that must never occur. An association permitting a forbidden request produces a TLC counterexample.</p>{model.actors.flatMap(a=>model.use_cases.map(u=><label key={`${a.id}:${u.id}`}><input type="checkbox" checked={forbidden.some(p=>p.source===a.id&&p.target===u.id)} onChange={()=>toggle(a.id,u.id)}/>{a.name} → {u.name}</label>))}</details>
    <p>The check covers this finite interaction model. It does not check real login credentials or prove generated Python equivalent.</p>
  </div></Panel>;
}
function TLCSettings({model,setModel}) {
  const [variables,setVariables]=useState(JSON.stringify(model.verification_variables||{}));
  useEffect(()=>setVariables(JSON.stringify(model.verification_variables||{})),[model.verification_variables]);
  function updateJSON(text, callback) {try {const value=JSON.parse(text);if(!value||Array.isArray(value)||typeof value!=="object"||Object.values(value).some(x=>typeof x!=="boolean"))throw new Error("Use an object of boolean values.");callback(value);}catch(e){alert(`Invalid boolean values: ${e.message}`);}}
  return <Panel title="TLC Behavioral Verification"><div className="tlc-settings">
    <p>State machines only. Guards use boolean variables, pc, quoted state IDs, True/False, and/or/not, == and !=. Labels do not change behavior.</p>
    <label>Boolean variables and initial values (JSON)<input value={variables} onChange={e=>setVariables(e.target.value)} onBlur={()=>updateJSON(variables,v=>setModel({...model,verification_variables:v}))}/></label>
    <label>Safety invariant<input value={model.verification_safety||""} placeholder={'not hazard or pc != "cruise"'} onChange={e=>setModel({...model,verification_safety:e.target.value})}/></label>
    <label>Response condition (optional)<input value={model.response_condition||""} placeholder="hazard" onChange={e=>setModel({...model,response_condition:e.target.value})}/></label>
    <label>Response target<select value={model.response_target||""} onChange={e=>setModel({...model,response_target:e.target.value})}><option value="">No target</option>{model.states.map(n=><option key={n.id} value={n.id}>{n.name} ({n.id})</option>)}</select></label>
    <label><input type="checkbox" checked={!!model.weak_fairness} onChange={e=>setModel({...model,weak_fairness:e.target.checked})}/> Assume weak fairness for every transition</label>
    <p>Without fairness, a response property may fail because the model can stutter forever. Fairness does not resolve all competing branches.</p>
    <div><button className="mini" onClick={()=>setModel(tlcExample())}>Load passing TLC example</button> <button className="mini" onClick={()=>setModel(tlcExample(true))}>Load violating TLC example</button></div>
    <h4>Transition semantics</h4>
    {model.transitions.map(t=><div className="tlc-transition" key={t.id}><b>{t.id}: {t.source} → {t.target}</b><label>Guard<input value={t.guard||"True"} onChange={e=>setModel({...model,transitions:model.transitions.map(x=>x.id===t.id?{...x,guard:e.target.value}:x)})}/></label><label>Boolean updates (JSON)<input key={JSON.stringify(t.updates||{})} defaultValue={JSON.stringify(t.updates||{})} onBlur={e=>updateJSON(e.target.value,v=>setModel({...model,transitions:model.transitions.map(x=>x.id===t.id?{...x,updates:v}:x)}))}/></label></div>)}
  </div></Panel>;
}
function App(){
  const [model,replaceModel]=useState(()=>{try { const saved=localStorage.getItem(PROJECT_KEY); return saved?normalizeProject(JSON.parse(saved)):structuredClone(templates.state_machine); } catch { return structuredClone(templates.state_machine); }});
  const [active,setActive]=useState("editor");
  const [page,setPage]=useState("home");
  const [workspaceTab,setWorkspaceTab]=useState("canvas");
  const [navOpen,setNavOpen]=useState(false);
  const [showInspector,setShowInspector]=useState(false);
  const diagramDrafts=useRef((()=>{try{const parsed=JSON.parse(localStorage.getItem("uml2tla_diagram_drafts_v5")||"{}");return Object.fromEntries(Object.entries(parsed).filter(([k])=>diagramNames[k]).map(([k,v])=>[k,normalizeProject(v)]));}catch{return {};}})());
  const [data,setData]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [tlcReady,setTlcReady]=useState(null);
  useEffect(()=>{fetch("/api/health").then(r=>r.json()).then(h=>setTlcReady(h.tlc_available)).catch(()=>setTlcReady(null));},[]);
  const [saveStatus,setSaveStatus]=useState("Saved locally");
  const past=useRef([]), future=useRef([]), revision=useRef(0), inFlight=useRef(false);
  const fileInput=useRef(null);
  function setModel(value,options={}) {
    if(options.record!==false)past.current=[...past.current.slice(-49),model]; future.current=[];
    revision.current++; replaceModel(typeof value === "function" ? value(model) : value); setData(null); setError("");
  }
  function undo(){ if(!past.current.length)return; future.current.push(model); const old=past.current.pop(); revision.current++; replaceModel(old); setData(null); }
  function redo(){ if(!future.current.length)return; past.current.push(model); const next=future.current.pop(); revision.current++; replaceModel(next); setData(null); }
  useEffect(()=>{try {localStorage.setItem(PROJECT_KEY,JSON.stringify(model));diagramDrafts.current[model.diagram_type]=model;localStorage.setItem("uml2tla_diagram_drafts_v5",JSON.stringify(diagramDrafts.current)); setSaveStatus("Saved locally");} catch {setSaveStatus("Local save unavailable. Download your project.");}},[model]);
  useEffect(()=>{function key(e){if(["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)||e.target.isContentEditable)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();e.shiftKey?redo():undo();}}window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[model]);
  function loadTemplate(kind){diagramDrafts.current[model.diagram_type]=structuredClone(model);setModel(diagramDrafts.current[kind]||{...structuredClone(templates[kind]),name:model.name,author:model.author});setActive("editor");setWorkspaceTab("canvas");setNavOpen(false);}
  async function convert(endpoint=API_URL){
    if(inFlight.current)return;
    inFlight.current=true;setBusy(true);setError("");setData(null);
    const version=revision.current, controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),140000);
    try {
      const res=await fetch(typeof endpoint === "string" ? endpoint : API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(model),signal:controller.signal});
      const json=await res.json();
      if(!res.ok) throw new Error(typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail || "Conversion failed"));
      if(version===revision.current)setData(json);
    } catch(e) { if(version===revision.current)setError(e.name==="AbortError"?"Conversion timed out. Please retry.":e.message); }
    finally {clearTimeout(timeout);inFlight.current=false;setBusy(false);}
  }
  function downloadAll(){ downloadText(`${model.name}_project.json`, JSON.stringify({schema_version:3,model,diagrams:{...diagramDrafts.current,[model.diagram_type]:model},...(data||{})},null,2)); }
  async function downloadArchive() {
    if(inFlight.current)return;
    inFlight.current=true;setBusy(true);setError("");
    const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),30000);
    try {
      const res=await fetch("/api/export",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(model),signal:controller.signal});
      if(!res.ok){const json=await res.json();throw new Error(typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail));}
      const url=URL.createObjectURL(await res.blob()), link=document.createElement("a");
      link.href=url;link.download=`${model.name}_project.zip`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(e){setError(e.name==="AbortError"?"Export timed out. Please retry.":e.message);}
    finally{clearTimeout(timeout);inFlight.current=false;setBusy(false);}
  }
  function importProject(e){
    const f=e.target.files[0]; e.target.value="";if(!f)return;
    if(f.size>2*1024*1024){setError("Project files must be smaller than 2 MB.");return;}
    const r=new FileReader();r.onerror=()=>setError("Could not read this file.");
    r.onload=()=>{try {const parsed=JSON.parse(r.result);const next=normalizeProject(parsed.model||parsed);const drafts=parsed.diagrams?Object.fromEntries(Object.entries(parsed.diagrams).map(([k,v])=>[k,normalizeProject(v)])):{};diagramDrafts.current=drafts;setModel(next);}catch(err){setError(`Import failed: ${err.message}`);}};r.readAsText(f);
  }

  let content;
  if(active==="dashboard") content=<Dashboard model={model} data={data}/>;
  else if(active==="tla") content=<Panel title="TLA+ Specification" actions={<><button className="mini" onClick={()=>copy(data?.tla||"")}><Copy size={15}/>Copy</button><button className="mini" onClick={()=>downloadText(`${data?.module_name || model.name}.tla`,data?.tla||"")}><Download size={15}/>.tla</button></>}><CodeBlock code={data?.tla||"Click Generate Code to create TLA+."}/></Panel>;
  else if(active==="checking") content=<ResultPanel data={data}/>;
  else if(active==="python") content=<Panel title="Python Code" actions={<><button className="mini" onClick={()=>copy(data?.python_code||"")}><Copy size={15}/>Copy</button><button className="mini" onClick={()=>downloadText(`${model.name}.py`,data?.python_code||"")}><Download size={15}/>.py</button></>}><CodeBlock code={data?.python_code||"Click Generate Code to create Python."}/></Panel>;
  else if(active==="trace") content=<TraceTable trace={data?.trace}/>;
  else if(active==="settings") content=<SettingsPanel model={model} setModel={setModel}/>;
  else content=<Dashboard model={model} data={data}/>;

  const supported=["state_machine","use_case"].includes(model.diagram_type);
  const run=()=>convert(supported?"/api/verify":API_URL);
  const outputActions=(kind)=><><button className="mini" disabled={!data} onClick={()=>copy(kind==='tla'?data.tla:data.python_code)}><Copy size={14}/>Copy</button><button className="mini" disabled={!data} onClick={()=>downloadText(kind==='tla'?`${data.module_name||model.name}.tla`:`${model.name}.py`,kind==='tla'?data.tla:data.python_code)}><Download size={14}/>Save</button></>;
  return <div className={`app ${navOpen?'nav-open':''}`}><input ref={fileInput} type="file" accept="application/json" hidden onChange={e=>{importProject(e);setPage("convert");}}/>
    {page==='home'?<FirstPage model={model} setModel={setModel} onCreate={base=>{diagramDrafts.current={};setModel(base);setActive("editor");setPage("convert");setWorkspaceTab("canvas");}} startConverter={()=>{setActive("editor");setPage("convert");setWorkspaceTab("canvas");}} onImport={()=>fileInput.current.click()}/>:<>
      <Header model={model} onHome={()=>setPage("home")} onNavToggle={()=>setNavOpen(v=>!v)} onSettings={()=>setActive("settings")} onVerify={run} onGenerate={()=>convert(API_URL)} onImport={()=>fileInput.current.click()} onDownloadAll={downloadAll} busy={busy}/>
      <div className="body"><Sidebar active={active} setActive={value=>{setActive(value);setNavOpen(false);}} model={model} loadTemplate={loadTemplate} onHome={()=>setPage("home")}/>
      <main className="workspace"><div className="workspace-heading"><div><span className="eyebrow">{diagramNames[model.diagram_type]} / {active==='editor'?'MODEL EDITOR':active==='checking'?'VERIFICATION':active.toUpperCase()}</span><h1>{model.name}</h1><p>{model.description||"Design your diagram, define its contracts, and explore the results."}</p></div><div className="workspace-status"><span className={`status-pill ${tlcReady&&supported?'success':'neutral'}`}><span className="nav-dot"/>{supported?(tlcReady?'TLC ready':tlcReady===false?'TLC unavailable':'Checking TLC…'):'Structural analysis'}</span><small>{busy?'Running your request…':saveStatus}</small></div></div>
      {tlcReady===false&&supported&&<div className="upgrade-error"><AlertCircle size={18}/><span>TLC is unavailable on this server. Deploy using the repository Dockerfile to enable model checking.</span></div>}
      {error&&<div className="upgrade-error" role="alert"><AlertCircle size={18}/><span>{error}</span><button className="icon-button" aria-label="Dismiss error" onClick={()=>setError("")}><X size={16}/></button></div>}
      {active==='editor'?<><div className="workspace-toolbar"><div className="workspace-tabs" role="tablist" aria-label="Workspace views">{[['canvas','Diagram',<GitBranch size={16}/>],['contracts','Contracts',<SlidersHorizontal size={16}/>],['outputs','Generated files',<FileCode size={16}/>],['trace','Trace explorer',<Route size={16}/>]].map(([key,name,icon])=><button key={key} role="tab" aria-selected={workspaceTab===key} className={workspaceTab===key?'active':''} onClick={()=>setWorkspaceTab(key)}>{icon}{name}</button>)}</div><div className="toolbar-actions"><button className="icon-button" disabled={!past.current.length} onClick={undo} aria-label="Undo"><Undo2 size={17}/></button><button className="icon-button" disabled={!future.current.length} onClick={redo} aria-label="Redo"><Redo2 size={17}/></button><button className="quiet-button" disabled={busy} onClick={downloadArchive}><Download size={16}/> Export ZIP</button></div></div>
      <div className="editor-workspace" role="tabpanel">
      <section className="editor-main">{workspaceTab==='canvas'?<Panel title="Diagram canvas" actions={<button className={`mini ${showInspector?'selected-control':''}`} onClick={()=>setShowInspector(v=>!v)}><SlidersHorizontal size={14}/>Properties</button>}><div className={`large-diagram-with-props ${showInspector?'inspector-open':''}`}><RenderDiagram key={model.diagram_type} model={model} setModel={setModel}/>{showInspector&&<PropertiesPanel model={model} setModel={setModel}/>}</div><div className="canvas-footer"><span><MousePointer2 size={14}/> Drag nodes to arrange · Open Properties to rename</span><span>{diagramNames[model.diagram_type]}</span></div></Panel>:workspaceTab==='contracts'?(model.diagram_type==='state_machine'?<TLCSettings model={model} setModel={setModel}/>:model.diagram_type==='use_case'?<UseCaseTLCSettings model={model} setModel={setModel}/>:<Panel title="Analysis scope"><div className="empty-view"><Layers size={30}/><h3>Structural analysis</h3><p>This diagram supports structural inspection and code generation. Behavioral TLC contracts are available for state-machine and use-case diagrams.</p><button className="primary-button" disabled={busy} onClick={run}>Analyze diagram</button></div></Panel>):workspaceTab==='outputs'?<div className="outputs-grid"><Panel title="TLA+ specification" actions={outputActions('tla')}><CodeBlock code={data?.tla||"Generate files or verify your model to see its specification."}/></Panel><Panel title="Python implementation" actions={outputActions('python')}><CodeBlock code={data?.python_code||"Generate files to see the Python prototype."}/></Panel><div className="export-strip"><button className="primary-button" disabled={busy} onClick={()=>convert(model.diagram_type==='use_case'?'/api/verify':API_URL)}><Code2 size={16}/> Generate files</button>{data?.cfg&&<button className="mini" onClick={()=>downloadText(`${data.module_name}.cfg`,data.cfg)}>TLC configuration</button>}{data?.traceability?.length>0&&<button className="mini" onClick={()=>downloadText(`${model.name}_traceability.json`,JSON.stringify(data.traceability,null,2))}>Traceability JSON</button>}</div></div>:<TraceTable trace={data?.trace}/>}</section>
      <aside className="results-rail"><ResultPanel data={data}/><div className="result-actions"><button className="primary-button" disabled={busy} onClick={run}>{busy?<Loader2 className="spin" size={17}/>:<ShieldCheck size={17}/>} {busy?'Working…':supported?'Run verification':'Run analysis'}</button>{data?.verification_kind==='tlc'&&<button className="quiet-button" onClick={()=>downloadText(`${model.name}_TLC_report.json`,JSON.stringify(data,null,2))}><Download size={15}/> Download report</button>}</div></aside>
      </div></>:<div className="single-view">{content}</div>}
      <footer className="workspace-footer"><span>UML2TLA+ Workspace 5.0</span><span><CheckCircle2 size={13}/> {saveStatus}</span></footer>
      </main></div></>}
  </div>;
}

createRoot(document.getElementById("root")).render(<App/>);
