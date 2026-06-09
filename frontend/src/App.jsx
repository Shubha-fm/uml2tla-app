import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Home, GitBranch, FileCode, CheckSquare, Code2, Route, Settings, Download, Play, Copy, MoreVertical, Trash2, Circle, Square, MousePointer2, ChevronDown, Upload, Link, Pencil, X, Plus } from "lucide-react";
import "./styles.css";

const API_URL = "/api/convert";

const templates = {
  state_machine: {
    name: "AutonomousVehicle",
    diagram_type: "state_machine",
    description: "State-machine model for autonomous vehicle safety control.",
    author: "Shubha Chakraborty",
    safety_property: "hazard = TRUE => mode # Cruise",
    states: [
      { id: "start", name: "start", type: "initial", x: 82, y: 142 },
      { id: "cruise", name: "Cruise", type: "state", x: 196, y: 115 },
      { id: "slow", name: "SlowDown", type: "state", x: 500, y: 115 },
      { id: "stop", name: "EmergencyStop", type: "state", x: 500, y: 300 },
      { id: "end", name: "end", type: "final", x: 560, y: 418 }
    ],
    transitions: [
      { id: "e1", source: "start", target: "cruise", label: "" },
      { id: "e2", source: "cruise", target: "slow", label: "hazard_detected" },
      { id: "e3", source: "slow", target: "cruise", label: "hazard_clear" },
      { id: "e4", source: "slow", target: "stop", label: "hazard_critical" },
      { id: "e5", source: "stop", target: "cruise", label: "reset" },
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
function downloadText(filename, text) { const blob = new Blob([text], {type:"text/plain"}); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); }

function Header({ model, onVerify, onImport, onDownloadAll }) {
  return <header className="topbar">
    <div className="brand"><div className="logo"><GitBranch size={18}/></div><b>UML2TLA+</b></div>
    <div className="project">Project:&nbsp;<span>{model.name}</span><ChevronDown size={15}/></div>
    <div className="top-actions">
      <button onClick={onVerify}><Play size={17} fill="white"/> Verify Model</button>
      <button onClick={onVerify}><Code2 size={17}/> Generate Code</button>
      <button onClick={onImport}><Upload size={17}/> Import</button>
      <button onClick={onDownloadAll}><Download size={17}/> Download</button>
      <Settings size={23} className="gear"/>
    </div>
  </header>
}

function SidebarItem({ icon, label, active, onClick }) {
  return <button className={`side-item ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function Sidebar({ active, setActive, model, loadTemplate }) {
  return <aside className="sidebar">
    <SidebarItem icon={<Home size={20}/>} label="Dashboard" active={active==="dashboard"} onClick={()=>setActive("dashboard")}/>
    <SidebarItem icon={<GitBranch size={20}/>} label="UML Editor" active={active==="editor"} onClick={()=>setActive("editor")}/>
    <SidebarItem icon={<FileCode size={20}/>} label="TLA+ Specification" active={active==="tla"} onClick={()=>setActive("tla")}/>
    <SidebarItem icon={<CheckSquare size={20}/>} label="Model Checking" active={active==="checking"} onClick={()=>setActive("checking")}/>
    <SidebarItem icon={<Code2 size={20}/>} label="Python Code" active={active==="python"} onClick={()=>setActive("python")}/>
    <SidebarItem icon={<Route size={20}/>} label="Execution Trace" active={active==="trace"} onClick={()=>setActive("trace")}/>
    <SidebarItem icon={<Settings size={20}/>} label="Project Settings" active={active==="settings"} onClick={()=>setActive("settings")}/>

    <div className="side-title">DIAGRAMS</div>
    <SidebarItem icon={<Circle size={18}/>} label="Use Case Diagram" active={model.diagram_type==="use_case"} onClick={()=>loadTemplate("use_case")}/>
    <SidebarItem icon={<Square size={18}/>} label="Class Diagram" active={model.diagram_type==="class"} onClick={()=>loadTemplate("class")}/>
    <SidebarItem icon={<GitBranch size={18}/>} label="Sequence Diagram" active={model.diagram_type==="sequence"} onClick={()=>loadTemplate("sequence")}/>
    <SidebarItem icon={<Route size={18}/>} label="Activity Diagram" active={model.diagram_type==="activity"} onClick={()=>loadTemplate("activity")}/>
    <SidebarItem icon={<GitBranch size={18}/>} label="State Machine Diagram" active={model.diagram_type==="state_machine"} onClick={()=>loadTemplate("state_machine")}/>

    <div className="project-box"><b>PROJECT</b><p>Name: {model.name}</p><p>Diagram: {model.diagram_type}</p><p>Ready for conversion</p></div>
  </aside>
}

function Panel({ title, children, actions }) {
  return <section className="panel"><div className="panel-head"><b>{title}</b><div className="panel-icons">{actions || <><Copy size={17}/><MoreVertical size={17}/></>}</div></div>{children}</section>
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

function SvgBase({ children, onMove, onUp, onBackground }) {
  return (
    <div className="svg-stage" onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
      <svg width="100%" height="100%" viewBox="0 0 900 560" onPointerDown={onBackground}>
        <defs>
          <pattern id="grid" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#e3e8ef"/>
          </pattern>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#111"/>
          </marker>
        </defs>
        <rect width="900" height="560" fill="url(#grid)" />
        {children}
      </svg>
    </div>
  );
}

function EditorShell({ title, children, selected, editValue, onEdit, onDelete, extra, modeText }) {
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

  function beginDrag(e, id) {
    e.stopPropagation();
    const item = model[collectionName].find(x => x.id === id);
    if (!item) return;
    setDrag({
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: item.x,
      origY: item.y
    });
  }

  function move(e) {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setModel({
      ...model,
      [collectionName]: model[collectionName].map(item =>
        item.id === drag.id
          ? { ...item, x: Math.max(20, drag.origX + dx), y: Math.max(40, drag.origY + dy) }
          : item
      )
    });
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
    if (selected.kind === "actor") setModel({ ...model, actors: model.actors.filter(a => a.id !== selected.id), associations: model.associations.filter(a => a.source !== selected.id) });
    else if (selected.kind === "usecase") setModel({ ...model, use_cases: model.use_cases.filter(u => u.id !== selected.id), associations: model.associations.filter(a => a.target !== selected.id) });
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
          const s = byId[f.source], t = byId[f.target];
          if (!s || !t) return null;
          return (
            <g key={f.id} onPointerDown={e => { e.stopPropagation(); setSelected({ kind: "flow", id: f.id }); }}>
              <line x1={s.x + 65} y1={s.y + 35} x2={t.x + 65} y2={t.y + 35} markerEnd="url(#arrow)" className="edge"/>
              {(() => { const pos = edgeLabelPosition(s.x + 65, s.y + 35, t.x + 65, t.y + 35, edgeLabelOffset(f, model.flows)); return <text x={pos.x} y={pos.y}>{f.label}</text>; })()}
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
  const stats=data?.statistics||{};
  return <Panel title="Model Checking"><div className={`result-box ${data?.safety_satisfied===false?"fail":""}`}><CheckSquare size={28}/><div><h3>Model Checking Result</h3><p>{data?.result||"Click Verify Model to check the specification."}</p></div></div><h4>Statistics</h4><Info label="States Explored" value={stats.states_explored??"-"}/><Info label="Distinct States" value={stats.distinct_states??"-"}/><Info label="Transitions" value={stats.transitions??"-"}/><Info label="Time Taken" value={stats.time_taken??"-"}/><Info label="Result" value={stats.result??"-"} good={stats.result==="PASSED"}/><h4>Properties</h4>{(data?.properties||[]).map(p=><Info key={p.name} label={p.name} value={p.status} good={p.status==="PASSED"}/>)}{data?.warnings?.length>0&&<ul className="warnings">{data.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>}</Panel>
}

function Info({label,value,good}) { return <div className="info"><span>{label}</span><b className={good?"good":""}>{value}</b></div> }


function TraceTable({trace}) {
  const rows = trace || [];
  return (
    <Panel title="Execution Trace" actions={<span className="trace-action-label">Trace</span>}>
      <div className="trace-scroll">
        {rows.length === 0 ? (
          <div className="trace-empty">Click Generate TLA+ and Python to see the complete execution trace.</div>
        ) : (
          <table className="trace-table full-trace-table">
            <thead>
              <tr>
                <th>Step</th>
                <th>State / Mode</th>
                <th>Event / Action</th>
                <th>Details</th>
                <th>Safe</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.step ?? i}</td>
                  <td>{r.mode ?? r.pc ?? r.class ?? "-"}</td>
                  <td>{r.event ?? r.action ?? r.message ?? r.flow ?? "-"}</td>
                  <td><code>{JSON.stringify(r)}</code></td>
                  <td>{String(r.safe ?? true)}</td>
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
  return <Panel title="Dashboard"><div className="dashboard"><div className="card"><b>{model.diagram_type}</b><span>Diagram</span></div><div className="card"><b>{count}</b><span>Elements</span></div><div className="card"><b>{data?.statistics?.result||"Not checked"}</b><span>Verification</span></div><div className="card"><b>{data?.trace?.length||0}</b><span>Trace Steps</span></div></div><div className="about"><h3>{model.name}</h3><p>{model.description}</p><p><b>Safety property:</b> {model.safety_property}</p></div></Panel>
}



function FirstPage({ model, setModel, loadTemplate, startConverter }) {
  const [projectName, setProjectName] = useState(model.name || "NewProject");
  const [author, setAuthor] = useState(model.author || "Shubha Chakraborty");
  const [description, setDescription] = useState(model.description || "");
  const [selectedDiagram, setSelectedDiagram] = useState(model.diagram_type || "state_machine");

  const cards = [
    ["use_case", "Use Case Diagram", "Actors, goals, and system functions."],
    ["class", "Class Diagram", "Classes, attributes, methods, and relationships."],
    ["sequence", "Sequence Diagram", "Lifelines, messages, and execution order."],
    ["activity", "Activity Diagram", "Actions, decisions, branches, and workflow."],
    ["state_machine", "State Machine Diagram", "States, transitions, events, and safety logic."]
  ];

  function createAndOpen() {
    const base = JSON.parse(JSON.stringify(templates[selectedDiagram] || templates.state_machine));
    base.name = projectName || "NewProject";
    base.author = author || "";
    base.description = description || base.description;
    setModel(base);
    setTimeout(() => startConverter(), 0);
  }

  return (
    <div className="landing-page project-first-page">
      <div className="project-header">
        <div>
          <h1>UML to TLA+ and Python Converter</h1>
          <p>Create a project, choose one UML diagram, draw the model, and generate TLA+ plus Python code.</p>
        </div>

      </div>

      <div className="new-project-panel">
        <div className="section-title">
          <h2>New Project</h2>
          <p>Enter the basic project details before opening the converter.</p>
        </div>
        <div className="project-form-grid">
          <label>
            Project Name
            <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="AutonomousVehicle"/>
          </label>
          <label>
            Author
            <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author name"/>
          </label>
          <label className="wide-field">
            Description
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description of the UML model"/>
          </label>
        </div>
      </div>

      <div className="diagram-select-panel">
        <div className="section-title">
          <h2>Select UML Diagram</h2>
          <p>The selected diagram will open in the convert page with its own drawing tools.</p>
        </div>
        <div className="diagram-card-grid">
          {cards.map(([kind, title, desc]) => (
            <button
              key={kind}
              className={`diagram-card ${selectedDiagram === kind ? "chosen" : ""}`}
              onClick={() => setSelectedDiagram(kind)}
            >
              <b>{title}</b>
              <span>{desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="landing-actions">
        <button className="primary-start" onClick={createAndOpen}>Create Project and Open Convert Page</button>
      </div>
    </div>
  );
}

function App(){
  const [model,setModel]=useState(()=>{const saved=localStorage.getItem("uml2tla_five_project");return saved?JSON.parse(saved):templates.state_machine});
  const [active,setActive]=useState("editor");
  const [page,setPage]=useState("home");
  const [data,setData]=useState(null);
  const fileInput=useRef(null);
  useEffect(()=>localStorage.setItem("uml2tla_five_project",JSON.stringify(model)),[model]);

  function loadTemplate(kind){ setModel(JSON.parse(JSON.stringify(templates[kind]))); setActive("editor"); setData(null); }

  async function convert(){
    try{
      const res=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(model)});
      const json=await res.json();
      setData(json);
    }catch(e){ alert("Conversion failed. Please check the server logs and try again."); }
  }

  function downloadAll(){ downloadText(`${model.name}_project.json`, JSON.stringify({model,tla:data?.tla||"",python_code:data?.python_code||"",trace:data?.trace||[]},null,2)); }
  function importProject(e){ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{try{const parsed=JSON.parse(r.result);setModel(parsed.model||parsed);setData(null)}catch{alert("Invalid JSON")}}; r.readAsText(f); }

  let content;
  if(active==="dashboard") content=<Dashboard model={model} data={data}/>;
  else if(active==="tla") content=<Panel title="TLA+ Specification" actions={<><button className="mini" onClick={()=>copy(data?.tla||"")}><Copy size={15}/>Copy</button><button className="mini" onClick={()=>downloadText(`${model.name}.tla`,data?.tla||"")}><Download size={15}/>.tla</button></>}><CodeBlock code={data?.tla||"Click Generate Code to create TLA+."}/></Panel>;
  else if(active==="checking") content=<ResultPanel data={data}/>;
  else if(active==="python") content=<Panel title="Python Code" actions={<><button className="mini" onClick={()=>copy(data?.python_code||"")}><Copy size={15}/>Copy</button><button className="mini" onClick={()=>downloadText(`${model.name}.py`,data?.python_code||"")}><Download size={15}/>.py</button></>}><CodeBlock code={data?.python_code||"Click Generate Code to create Python."}/></Panel>;
  else if(active==="trace") content=<TraceTable trace={data?.trace}/>;
  else if(active==="settings") content=<SettingsPanel model={model} setModel={setModel}/>;
  else content=<Dashboard model={model} data={data}/>;

  return (
    <div className="app">
      {page === "home" ? (
        <FirstPage
          model={model}
          setModel={setModel}
          loadTemplate={loadTemplate}
          startConverter={() => { setActive("editor"); setPage("convert"); }}
        />
      ) : (
        <>
          <Header model={model} onVerify={convert} onImport={() => fileInput.current.click()} onDownloadAll={downloadAll}/>
          <input ref={fileInput} type="file" accept="application/json" hidden onChange={importProject}/>
          <div className="body">
            <Sidebar active={active} setActive={setActive} model={model} loadTemplate={loadTemplate}/>
            <main className="workspace">
              <div className="back-row">
                <button className="mini" onClick={() => setPage("home")}>← First Page</button>
                <button className="mini primary-mini" onClick={convert}>Generate TLA+ and Python</button>
              </div>
              {active === "editor" ? (
                <div className="convert-layout">
                  <section className="large-diagram-area">
                    <Panel title={`${model.diagram_type.replace("_"," ")} Diagram Canvas`}>
                      <div className="large-diagram-with-props">
                        <RenderDiagram model={model} setModel={setModel}/>
                        <PropertiesPanel model={model} setModel={setModel}/>
                      </div>
                    </Panel>
                  </section>

                  <aside className="convert-side-panel">
                    <ResultPanel data={data}/>
                  </aside>

                  <section className="code-row">
                    <Panel title="TLA+ Specification" actions={
                      <>
                        <button className="mini" onClick={() => copy(data?.tla || "")}><Copy size={15}/> Copy</button>
                        <button className="mini" onClick={() => downloadText(`${model.name}.tla`, data?.tla || "")}><Download size={15}/> .tla</button>
                      </>
                    }>
                      <CodeBlock code={data?.tla || "Click Generate TLA+ and Python."}/>
                    </Panel>
                    <Panel title="Python Code" actions={
                      <>
                        <button className="mini" onClick={() => copy(data?.python_code || "")}><Copy size={15}/> Copy</button>
                        <button className="mini" onClick={() => downloadText(`${model.name}.py`, data?.python_code || "")}><Download size={15}/> .py</button>
                      </>
                    }>
                      <CodeBlock code={data?.python_code || "Click Generate TLA+ and Python."}/>
                    </Panel>
                    <TraceTable trace={data?.trace}/>
                  </section>
                </div>
              ) : (
                <div className="single-view">{content}</div>
              )}
            </main>
          </div>
        </>
      )}
    </div>
  )
}

createRoot(document.getElementById("root")).render(<App/>);
